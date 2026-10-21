<?php

namespace App\Http\Controllers\Transaksi;

use App\Exceptions\StokTidakCukupException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\DendaPengembalian;
use App\Models\Pengembalian;
use App\Models\PengembalianDetail;
use App\Models\Piutang;
use App\Models\Sewa;
use App\Models\SewaDetail;
use App\Models\User;
use App\Services\RiwayatStokService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class PengembalianController extends Controller
{
    public function __construct(private RiwayatStokService $stok) {}

    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        if (($request->has('datatable') || $request->wantsJson() || ($request->ajax() && $request->has('draw'))) && ! $request->header('X-Inertia')) {
            $data = Pengembalian::with(['sewa.customer', 'user', 'details.sewaDetail.barang'])->orderByDesc('id');

            return DataTables::of($data)->escapeColumns([])
                ->addIndexColumn()
                ->editColumn('tgl_pengembalian', fn ($row) => $row->tgl_pengembalian ? Carbon::parse($row->tgl_pengembalian)->locale('id')->translatedFormat('j F Y') : '-')
                ->editColumn('total_denda', fn ($row) => number_format((float) ($row->total_denda ?? 0), 0, ',', '.'))
                ->addColumn('sewa', fn ($row) => $row->sewa?->no_sewa ?? '-')
                ->addColumn('petugas', fn ($row) => $row->user?->nama_lengkap ?? '-')
                ->addColumn('jumlah_item', fn ($row) => $row->details->sum('qty_pengembalian'))
                ->editColumn('status_pembayaran', fn ($row) => $row->status_pembayaran ?? '-')
                ->addColumn('action', function ($row) use ($permissions) {
                    $btn = '<div class="d-flex justify-content-center">';

                    if ($permissions['edit']) {
                        $btn .= '<button class="btn btn-primary btn-sm mx-1 edit-button" data-id="'.e($row->id).'" data-url="'.e(route('pengembalian.edit', $row->id)).'">Edit</button>';
                    }

                    if ($permissions['hapus']) {
                        $btn .= '<form action="'.e(route('pengembalian.destroy', $row->id)).'" method="POST" style="display:inline;">'
                        .csrf_field().method_field('DELETE').'
                        <button type="submit" class="delete-button btn btn-danger btn-sm mx-1">Hapus</button>
                        </form>';
                    }

                    $btn .= '</div>';

                    return $btn;
                })
                ->rawColumns(['action'])
                ->make(true);
        }

        $sewas = Sewa::with('customer')
            ->orderByDesc('tgl_sewa')
            ->orderByDesc('no_sewa')
            ->get(['id', 'no_sewa', 'id_customer']);
        $users = User::orderBy('nama_lengkap')->get();

        return Inertia::render('Admin/Transaksi/Pengembalian/Index', compact('permissions', 'sewas', 'users'));
    }

    public function edit($id)
    {
        $data = Pengembalian::with(['details.sewaDetail.barang', 'dendas.sewaDetail.barang', 'sewa.customer'])->findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(Request $request)
    {
        $this->validasiPengembalian($request);

        DB::beginTransaction();
        try {
            $totalDenda = $this->totalDenda($request->input('dendas', []));

            $pengembalian = Pengembalian::create([
                'id_sewa' => $request->id_sewa,
                'tgl_pengembalian' => $request->tgl_pengembalian,
                'id_user' => $request->id_user ?: auth()->id(),
                'total_denda' => $totalDenda,
                'status_pembayaran' => $totalDenda > 0 ? 'Belum Lunas' : 'Lunas',
            ]);

            foreach ($request->details as $index => $detail) {
                $detailBaru = PengembalianDetail::create([
                    'id_pengembalian' => $pengembalian->id,
                    'id_sewa_detail' => $detail['id_sewa_detail'],
                    'qty_pengembalian' => $detail['qty_pengembalian'],
                    'keterangan' => $detail['keterangan'] ?? null,
                    'foto_unit_pengembalian' => $this->simpanFotoUnit($request, $index),
                ]);

                $this->tambahStok($detail['id_sewa_detail'], (int) $detail['qty_pengembalian'], ['id_pengembalian_detail' => $detailBaru->id]);
            }
            foreach ($request->input('dendas', []) as $denda) {
                DendaPengembalian::create([
                    'id_pengembalian' => $pengembalian->id,
                    'id_sewa_detail' => $denda['id_sewa_detail'],
                    'jenis_denda' => $denda['jenis_denda'],
                    'nominal_denda' => $denda['nominal_denda'],
                ]);
            }

            if ((float) $pengembalian->total_denda > 0) {
                Piutang::create([
                    'tgl_piutang' => $request->tgl_pengembalian,
                    'nominal' => $pengembalian->total_denda,
                    'id_pengembalian' => $pengembalian->id,
                    'terbayar' => 0,
                ]);
            }

            DB::commit();

            return response()->json(['status' => 'success', 'id' => $pengembalian->id]);
        } catch (StokTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating pengembalian: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $data = Pengembalian::with(['details', 'dendas'])->findOrFail($id);

        $this->validasiPengembalian($request, true);

        $lunas = $data->status_pembayaran === 'Lunas';

        DB::beginTransaction();
        try {
            $totalDenda = $lunas ? (int) $data->total_denda : $this->totalDenda($request->input('dendas', []));

            $data->update([
                'tgl_pengembalian' => $lunas ? $data->tgl_pengembalian : $request->tgl_pengembalian,
                'id_user' => $request->id_user ?: $data->id_user,
                'total_denda' => $totalDenda,
            ]);

            $this->sinkronDetail($data, $request->details, $lunas);

            if (! $lunas) {
                $this->sinkronDenda($data, $request->input('dendas', []));
                $this->sinkronPiutang($data);
            }

            $data->update(['status_pembayaran' => $this->hitungStatusPembayaran($data)]);

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (StokTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating pengembalian: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $data = Pengembalian::with(['details', 'dendas'])->findOrFail($id);

        if ($data->status_pembayaran === 'Lunas') {
            return response()->json(['status' => 'error', 'error' => 'Pengembalian yang pembayarannya sudah lunas tidak dapat dihapus.'], 422);
        }

        DB::beginTransaction();
        try {
            foreach ($data->details as $detail) {
                $idBarang = SewaDetail::find($detail->id_sewa_detail)?->id_barang;

                if ($idBarang) {
                    $this->stok->batalkanMasuk($idBarang, (int) $detail->qty_pengembalian, ['id_pengembalian_detail' => $detail->id]);
                }
                $this->hapusFotoUnit($detail->foto_unit_pengembalian);
                $detail->delete();
            }

            DendaPengembalian::where('id_pengembalian', $data->id)->delete();
            Piutang::where('id_pengembalian', $data->id)->delete();
            $data->delete();

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (StokTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting pengembalian: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Total denda = jumlah nominal seluruh baris denda pengembalian.
     *
     * @param  array<int, array<string, mixed>>  $dendas
     */
    private function totalDenda(array $dendas): int
    {
        $total = 0;

        foreach ($dendas as $denda) {
            $total += (int) ($denda['nominal_denda'] ?? 0);
        }

        return $total;
    }

    private function validasiPengembalian(Request $request, bool $isUpdate = false): void
    {
        $request->validate([
            'id_sewa' => $isUpdate ? 'nullable|string' : 'required|string|exists:sewa,id|unique:pengembalian,id_sewa',
            'tgl_pengembalian' => 'required|date',
            'id_user' => 'nullable|integer|exists:users,id',
            'total_denda' => 'nullable|numeric|min:0',
            'dendas' => 'nullable|array',
            'dendas.*.id' => ($isUpdate ? 'required' : 'nullable').'|integer|exists:denda_pengembalian,id',
            'dendas.*.id_sewa_detail' => 'required|integer|exists:sewa_detail,id',
            'dendas.*.jenis_denda' => 'required|string|in:Denda Keterlambatan,Denda Kerusakan,Denda Kehilangan',
            'dendas.*.nominal_denda' => 'required|integer|min:1',
            'details' => 'required|array|min:1',
            'details.*.id' => ($isUpdate ? 'required' : 'nullable').'|integer|exists:pengembalian_detail,id',
            'details.*.id_sewa_detail' => 'required|integer|exists:sewa_detail,id',
            'details.*.qty_pengembalian' => 'required|integer|min:1',
            'details.*.keterangan' => 'nullable|string',
            'details.*.foto_unit' => 'nullable|file|mimes:jpeg,png,jpg,webp',
        ], [
            'id_sewa.required' => 'Sewa wajib dipilih.',
            'id_sewa.unique' => 'Sewa ini sudah dikembalikan.',
            'tgl_pengembalian.required' => 'Tanggal pengembalian wajib diisi.',
            'dendas.*.id.required' => 'Baris denda tidak valid.',
            'dendas.*.id_sewa_detail.required' => 'Item denda wajib dipilih.',
            'dendas.*.jenis_denda.required' => 'Jenis denda wajib dipilih.',
            'dendas.*.jenis_denda.in' => 'Jenis denda tidak valid.',
            'dendas.*.nominal_denda.required' => 'Nominal denda wajib diisi.',
            'dendas.*.nominal_denda.min' => 'Nominal denda minimal 1.',
            'details.required' => 'Minimal harus ada 1 item pengembalian.',
            'details.*.id.required' => 'Item pengembalian tidak valid.',
            'details.*.id_sewa_detail.required' => 'Item sewa wajib dipilih.',
            'details.*.qty_pengembalian.required' => 'Qty pengembalian wajib diisi.',
            'details.*.qty_pengembalian.min' => 'Qty pengembalian minimal 1.',
        ]);
    }

    /**
     * Sinkronisasi detail item pengembalian.
     *
     * Saat $kunciNilai true (pengembalian sudah lunas), nilai transaksi dikunci:
     * hanya keterangan dan foto unit yang boleh berubah.
     */
    private function sinkronDetail(Pengembalian $pengembalian, array $details, bool $kunciNilai = false): void
    {
        $incomingIds = collect($details)->pluck('id')->filter()->unique()->values();

        foreach ($details as $index => $detail) {
            $row = PengembalianDetail::where('id_pengembalian', $pengembalian->id)
                ->where('id', $detail['id'] ?? null)
                ->first();

            if ($kunciNilai && ! $row) {
                continue;
            }

            if ($row) {
                $qtyLama = (int) $row->qty_pengembalian;
                $qtyBaru = $kunciNilai ? $qtyLama : (int) $detail['qty_pengembalian'];

                if ($qtyLama !== $qtyBaru) {
                    $selisih = $qtyBaru - $qtyLama;
                    $this->ubahStok($row->id_sewa_detail, abs($selisih), $selisih > 0 ? 'Masuk' : 'Keluar', ['id_pengembalian_detail' => $row->id]);
                }

                $db = ['keterangan' => $detail['keterangan'] ?? null];

                if (! $kunciNilai) {
                    $db['qty_pengembalian'] = $qtyBaru;
                }

                $fotoBaru = $this->simpanFotoUnit(request(), $index);
                if ($fotoBaru !== '') {
                    $this->hapusFotoUnit($row->foto_unit_pengembalian);
                    $db['foto_unit_pengembalian'] = $fotoBaru;
                }

                $row->update($db);

                continue;
            }

            if ($kunciNilai) {
                continue;
            }

            $detailBaru = PengembalianDetail::create([
                'id_pengembalian' => $pengembalian->id,
                'id_sewa_detail' => $detail['id_sewa_detail'],
                'qty_pengembalian' => $detail['qty_pengembalian'],
                'keterangan' => $detail['keterangan'] ?? null,
                'foto_unit_pengembalian' => $this->simpanFotoUnit(request(), $index),
            ]);

            $this->tambahStok($detail['id_sewa_detail'], (int) $detail['qty_pengembalian'], ['id_pengembalian_detail' => $detailBaru->id]);
        }

        if ($kunciNilai) {
            return;
        }

        $detailDihapus = PengembalianDetail::where('id_pengembalian', $pengembalian->id)
            ->when($incomingIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $incomingIds))
            ->get();

        foreach ($detailDihapus as $row) {
            $this->kurangiStok($row->id_sewa_detail, (int) $row->qty_pengembalian, ['id_pengembalian_detail' => $row->id]);
            $this->hapusFotoUnit($row->foto_unit_pengembalian);
            $row->delete();
        }
    }

    private function sinkronDenda(Pengembalian $pengembalian, array $dendas): void
    {
        $incomingIds = collect($dendas)->pluck('id')->filter()->unique()->values();

        foreach ($dendas as $denda) {
            $row = DendaPengembalian::where('id_pengembalian', $pengembalian->id)
                ->where('id', $denda['id'] ?? null)
                ->first();

            if ($row) {
                $row->update([
                    'id_sewa_detail' => $denda['id_sewa_detail'],
                    'jenis_denda' => $denda['jenis_denda'],
                    'nominal_denda' => $denda['nominal_denda'],
                ]);

                continue;
            }

            DendaPengembalian::create([
                'id_pengembalian' => $pengembalian->id,
                'id_sewa_detail' => $denda['id_sewa_detail'],
                'jenis_denda' => $denda['jenis_denda'],
                'nominal_denda' => $denda['nominal_denda'],
            ]);
        }

        DendaPengembalian::where('id_pengembalian', $pengembalian->id)
            ->when($incomingIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $incomingIds))
            ->delete();
    }

    /**
     * Status pembayaran retribusi pengembalian berdasarkan sisa tagihan
     * piutang, bukan sekadar ada/tidaknya denda.
     */
    private function hitungStatusPembayaran(Pengembalian $pengembalian): string
    {
        $totalDenda = (float) $pengembalian->total_denda;

        if ($totalDenda <= 0) {
            return 'Lunas';
        }

        $terbayar = (float) (Piutang::where('id_pengembalian', $pengembalian->id)->value('terbayar') ?? 0);

        return $terbayar >= $totalDenda ? 'Lunas' : 'Belum Lunas';
    }

    private function sinkronPiutang(Pengembalian $pengembalian): void
    {
        $piutang = Piutang::where('id_pengembalian', $pengembalian->id)->first();
        $denda = (float) $pengembalian->total_denda;

        if ($denda > 0) {
            if ($piutang) {
                $piutang->update([
                    'nominal' => $denda,
                    'tgl_piutang' => $pengembalian->tgl_pengembalian,
                ]);
            } else {
                Piutang::create([
                    'tgl_piutang' => $pengembalian->tgl_pengembalian,
                    'nominal' => $denda,
                    'id_pengembalian' => $pengembalian->id,
                    'terbayar' => 0,
                ]);
            }

            return;
        }

        if ($piutang && (float) $piutang->terbayar == 0) {
            $piutang->delete();
        }
    }

    private function simpanFotoUnit(Request $request, int $index): string
    {
        $file = $request->file("details.{$index}.foto_unit");

        if (! $file || ! $file->isValid()) {
            return '';
        }

        $filename = Str::random(25).'.'.$file->getClientOriginalExtension();
        $file->move(public_path('assets/pengembalian'), $filename);

        return $filename;
    }

    private function hapusFotoUnit(?string $filename): void
    {
        if (! empty($filename) && file_exists(public_path('assets/pengembalian/'.$filename))) {
            unlink(public_path('assets/pengembalian/'.$filename));
        }
    }

    private function tambahStok($idSewaDetail, int $qty, ?array $sumber = null): void
    {
        $this->ubahStok($idSewaDetail, $qty, 'Masuk', $sumber);
    }

    private function kurangiStok($idSewaDetail, int $qty, ?array $sumber = null): void
    {
        $this->ubahStok($idSewaDetail, $qty, 'Keluar', $sumber);
    }

    private function ubahStok($idSewaDetail, int $qty, string $jenis, ?array $sumber = null): void
    {
        $idBarang = SewaDetail::find($idSewaDetail)?->id_barang;

        if (! $idBarang) {
            return;
        }

        if ($jenis === 'Keluar') {
            $this->stok->kurang($idBarang, $qty, RiwayatStokService::KELUAR, $sumber);

            return;
        }

        $this->stok->tambah($idBarang, $qty, RiwayatStokService::MASUK, $sumber);
    }
}
