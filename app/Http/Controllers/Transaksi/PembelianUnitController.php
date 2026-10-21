<?php

namespace App\Http\Controllers\Transaksi;

use App\Exceptions\SaldoTidakCukupException;
use App\Exceptions\StokTidakCukupException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\Barang;
use App\Models\KategoriTransaksi;
use App\Models\PembelianUnit;
use App\Models\PembelianUnitDetail;
use App\Models\Pengeluaran;
use App\Models\Rekening;
use App\Services\RiwayatSaldoService;
use App\Services\RiwayatStokService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class PembelianUnitController extends Controller
{
    public function __construct(private RiwayatStokService $stok, private RiwayatSaldoService $saldo) {}

    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        if (($request->has('datatable') || $request->wantsJson() || ($request->ajax() && $request->has('draw'))) && ! $request->header('X-Inertia')) {
            $data = PembelianUnit::with(['details.barang', 'pengeluaran.rekening'])->orderByDesc('id');

            return DataTables::of($data)->escapeColumns([])
                ->addIndexColumn()
                ->editColumn('tanggal', fn ($row) => $row->tanggal ? Carbon::parse($row->tanggal)->locale('id')->translatedFormat('j F Y') : '-')
                ->addColumn('jumlah_item', fn ($row) => $row->details->count())
                ->addColumn('total_unit', fn ($row) => (int) $row->details->sum('jumlah'))
                ->addColumn('total_biaya', fn ($row) => number_format((float) $row->details->sum(fn ($detail) => (float) ($detail->harga_beli ?? 0) * (int) ($detail->jumlah ?? 0)), 0, ',', '.'))
                ->addColumn('barang_list', fn ($row) => $row->details
                    ->map(fn ($detail) => ($detail->barang?->nama_barang ?? '-').' ('.$detail->jumlah.')')
                    ->join(', '))
                ->addColumn('rekening', fn ($row) => $row->pengeluaran?->rekening?->nama_rek ?? '-')
                ->addColumn('action', function ($row) use ($permissions) {
                    $btn = '<div class="d-flex justify-content-center">';

                    if ($permissions['edit']) {
                        $btn .= '<button class="btn btn-primary btn-sm mx-1 edit-button" data-id="'.e($row->id).'" data-url="'.e(route('pembelian-unit.edit', $row->id)).'">Edit</button>';
                    }

                    if ($permissions['hapus']) {
                        $btn .= '<form action="'.e(route('pembelian-unit.destroy', $row->id)).'" method="POST" style="display:inline;">'
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

        return Inertia::render('Admin/Transaksi/PembelianUnit/Index', [
            'permissions' => $permissions,
            'barangs' => Barang::orderBy('nama_barang')->get(['id', 'nama_barang', 'stok']),
            'rekenings' => Rekening::orderBy('nama_rek')->get(['id', 'nama_rek', 'saldo']),
        ]);
    }

    public function edit($id)
    {
        $data = PembelianUnit::with(['details', 'pengeluaran'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $data->id,
                'tanggal' => $data->tanggal?->format('Y-m-d'),
                'keterangan' => $data->keterangan,
                'id_rekening' => $data->pengeluaran?->id_rekening,
                'lampiran' => $data->pengeluaran?->lampiran,
                'details' => $data->details->map(fn ($detail) => [
                    'id_barang' => (string) $detail->id_barang,
                    'harga_beli' => (string) ($detail->harga_beli ?? ''),
                    'jumlah' => (string) $detail->jumlah,
                ])->values(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->validasi($request);

        DB::beginTransaction();
        try {
            $pembelian = PembelianUnit::create([
                'tanggal' => $request->tanggal,
                'keterangan' => $request->keterangan,
            ]);

            foreach ($request->details as $detail) {
                $detailBaru = PembelianUnitDetail::create([
                    'id_pembelian_unit' => $pembelian->id,
                    'id_barang' => $detail['id_barang'],
                    'harga_beli' => $detail['harga_beli'],
                    'jumlah' => (int) $detail['jumlah'],
                ]);

                $this->stok->tambah($detail['id_barang'], (int) $detail['jumlah'], RiwayatStokService::MASUK, [
                    'id_pembelian_unit_detail' => $detailBaru->id,
                ]);
            }

            $total = $this->hitungTotal($request->details);

            $pengeluaran = $this->buatPengeluaran($pembelian->id, $request, $total);

            $this->saldo->kurang((int) $request->id_rekening, $total, RiwayatSaldoService::KELUAR, [
                'id_pengeluaran' => $pengeluaran->id,
            ], $request->tanggal);

            DB::commit();

            return response()->json(['status' => 'success', 'id' => $pembelian->id]);
        } catch (SaldoTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $this->pesanSaldoTidakCukup($request->id_rekening)], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating pembelian unit: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $pembelian = PembelianUnit::with(['details', 'pengeluaran'])->findOrFail($id);

        $this->validasi($request);

        DB::beginTransaction();
        try {
            foreach ($pembelian->details as $detailLama) {
                $this->stok->batalkanMasuk($detailLama->id_barang, (int) $detailLama->jumlah, [
                    'id_pembelian_unit_detail' => $detailLama->id,
                ]);
            }

            PembelianUnitDetail::where('id_pembelian_unit', $pembelian->id)->delete();

            foreach ($request->details as $detail) {
                $detailBaru = PembelianUnitDetail::create([
                    'id_pembelian_unit' => $pembelian->id,
                    'id_barang' => $detail['id_barang'],
                    'harga_beli' => $detail['harga_beli'],
                    'jumlah' => (int) $detail['jumlah'],
                ]);

                $this->stok->tambah($detail['id_barang'], (int) $detail['jumlah'], RiwayatStokService::MASUK, [
                    'id_pembelian_unit_detail' => $detailBaru->id,
                ]);
            }

            $pembelian->update([
                'tanggal' => $request->tanggal,
                'keterangan' => $request->keterangan,
            ]);

            $total = $this->hitungTotal($request->details);

            $pengeluaran = $pembelian->pengeluaran;

            if ($pengeluaran) {
                $idRekeningLama = (int) ($pengeluaran->id_rekening ?? 0);
                $nominalLama = (int) ($pengeluaran->nominal ?? 0);

                if ($idRekeningLama > 0 && $nominalLama > 0) {
                    $this->saldo->batalkanKeluar($idRekeningLama, $nominalLama, ['id_pengeluaran' => $pengeluaran->id]);
                }

                $db = $this->dataPengeluaran($pembelian->id, $request, $total);

                if ($request->hasFile('lampiran')) {
                    if (! empty($pengeluaran->lampiran) && file_exists(public_path('assets/lampiran/'.$pengeluaran->lampiran))) {
                        unlink(public_path('assets/lampiran/'.$pengeluaran->lampiran));
                    }

                    $db['lampiran'] = $this->simpanLampiran($request);
                }

                $pengeluaran->update($db);

                $pengeluaranBaru = $pengeluaran->fresh();

                if ((int) ($pengeluaranBaru->id_rekening ?? 0) > 0 && (int) ($pengeluaranBaru->nominal ?? 0) > 0) {
                    $this->saldo->kurang((int) $pengeluaranBaru->id_rekening, (int) $pengeluaranBaru->nominal, RiwayatSaldoService::KELUAR, [
                        'id_pengeluaran' => $pengeluaranBaru->id,
                    ], $pengeluaranBaru->tgl_pengeluaran);
                }
            } else {
                $pengeluaranBaru = $this->buatPengeluaran($pembelian->id, $request, $total);

                $this->saldo->kurang((int) $request->id_rekening, $total, RiwayatSaldoService::KELUAR, [
                    'id_pengeluaran' => $pengeluaranBaru->id,
                ], $request->tanggal);
            }

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (SaldoTidakCukupException|StokTidakCukupException $e) {
            DB::rollBack();

            $pesan = $e instanceof SaldoTidakCukupException
                ? $this->pesanSaldoTidakCukup($request->id_rekening)
                : $e->getMessage();

            return response()->json(['status' => 'error', 'error' => $pesan], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating pembelian unit: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $pembelian = PembelianUnit::with(['details', 'pengeluaran'])->findOrFail($id);

        DB::beginTransaction();
        try {
            foreach ($pembelian->details as $detail) {
                $this->stok->batalkanMasuk($detail->id_barang, (int) $detail->jumlah, [
                    'id_pembelian_unit_detail' => $detail->id,
                ]);
            }

            PembelianUnitDetail::where('id_pembelian_unit', $pembelian->id)->delete();

            $pengeluaran = $pembelian->pengeluaran;

            if ($pengeluaran) {
                if (! empty($pengeluaran->lampiran) && file_exists(public_path('assets/lampiran/'.$pengeluaran->lampiran))) {
                    unlink(public_path('assets/lampiran/'.$pengeluaran->lampiran));
                }

                $idRekeningHapus = (int) ($pengeluaran->id_rekening ?? 0);
                $nominalHapus = (int) ($pengeluaran->nominal ?? 0);
                $idPengeluaranHapus = (int) $pengeluaran->id;

                $pengeluaran->delete();

                if ($idRekeningHapus > 0 && $nominalHapus > 0) {
                    $this->saldo->batalkanKeluar($idRekeningHapus, $nominalHapus, ['id_pengeluaran' => $idPengeluaranHapus]);
                }
            }

            $pembelian->delete();

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (StokTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting pembelian unit: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    private function validasi(Request $request): void
    {
        $request->validate([
            'tanggal' => 'required|date',
            'keterangan' => 'nullable|string|max:255',
            'id_rekening' => 'required|integer|exists:rekening,id',
            'lampiran' => 'nullable|file|mimes:jpeg,png,jpg,pdf',
            'details' => 'required|array|min:1',
            'details.*.id_barang' => 'required|string|exists:barang,id',
            'details.*.harga_beli' => 'required|numeric|min:0',
            'details.*.jumlah' => 'required|integer|min:1',
        ], [
            'tanggal.required' => 'Tanggal pembelian wajib diisi.',
            'tanggal.date' => 'Tanggal pembelian tidak valid.',
            'id_rekening.required' => 'Rekening wajib dipilih.',
            'id_rekening.exists' => 'Rekening tidak valid.',
            'lampiran.mimes' => 'Lampiran harus berupa JPG, PNG, atau PDF.',
            'details.required' => 'Minimal harus ada 1 item barang.',
            'details.min' => 'Minimal harus ada 1 item barang.',
            'details.array' => 'Item barang tidak valid.',
            'details.*.id_barang.required' => 'Barang wajib dipilih.',
            'details.*.id_barang.exists' => 'Barang tidak valid.',
            'details.*.harga_beli.required' => 'Harga beli wajib diisi.',
            'details.*.harga_beli.numeric' => 'Harga beli harus berupa angka.',
            'details.*.harga_beli.min' => 'Harga beli minimal 0.',
            'details.*.jumlah.required' => 'Jumlah wajib diisi.',
            'details.*.jumlah.integer' => 'Jumlah harus berupa angka.',
            'details.*.jumlah.min' => 'Jumlah minimal 1.',
        ]);
    }

    private function pesanSaldoTidakCukup(mixed $idRekening): string
    {
        $nama = Rekening::find($idRekening)?->nama_rek;

        return $nama ? 'Saldo rekening '.$nama.' tidak cukup!' : 'Saldo rekening tidak mencukupi.';
    }

    /**
     * Hitung total biaya dari detail barang.
     *
     * @param  array<int, array{id_barang: mixed, harga_beli: mixed, jumlah: mixed}>  $details
     */
    private function hitungTotal(array $details): int
    {
        return (int) collect($details)->sum(
            fn ($detail) => (float) ($detail['harga_beli'] ?? 0) * (int) ($detail['jumlah'] ?? 0)
        );
    }

    /**
     * Susun data pengeluaran untuk pembelian unit.
     *
     * @return array{tgl_pengeluaran: mixed, nominal: int, id_kategori_transaksi: int, id_rekening: mixed, keterangan: mixed, id_pembelian_unit: int}
     */
    private function dataPengeluaran(int $idPembelian, Request $request, int $total): array
    {
        $kategori = KategoriTransaksi::firstOrCreate(
            ['kategori' => 'Pembelian Unit', 'jenis' => 'Pengeluaran']
        );

        return [
            'tgl_pengeluaran' => $request->tanggal,
            'nominal' => $total,
            'id_kategori_transaksi' => $kategori->id,
            'id_rekening' => $request->id_rekening,
            'keterangan' => $request->keterangan,
            'id_pembelian_unit' => $idPembelian,
        ];
    }

    private function buatPengeluaran(int $idPembelian, Request $request, int $total): Pengeluaran
    {
        $db = $this->dataPengeluaran($idPembelian, $request, $total);

        if ($request->hasFile('lampiran')) {
            $db['lampiran'] = $this->simpanLampiran($request);
        }

        return Pengeluaran::create($db);
    }

    private function simpanLampiran(Request $request): string
    {
        $file = $request->file('lampiran');
        $filename = Str::random(25).'.'.$file->getClientOriginalExtension();
        $file->move(public_path('assets/lampiran'), $filename);

        return $filename;
    }
}
