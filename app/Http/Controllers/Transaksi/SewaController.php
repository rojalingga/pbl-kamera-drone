<?php

namespace App\Http\Controllers\Transaksi;

use App\Exceptions\StokTidakCukupException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\Barang;
use App\Models\Customer;
use App\Models\Sewa;
use App\Models\SewaDetail;
use App\Services\NomorDokumenService;
use App\Services\RiwayatStokService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class SewaController extends Controller
{
    public function __construct(private RiwayatStokService $stok, private NomorDokumenService $nomor) {}

    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        if (($request->has('datatable') || $request->wantsJson() || ($request->ajax() && $request->has('draw'))) && ! $request->header('X-Inertia')) {
            $data = Sewa::with(['customer', 'user', 'details.barang'])->orderByDesc('id');

            return DataTables::of($data)->escapeColumns([])
                ->addIndexColumn()
                ->editColumn('tgl_sewa', fn ($row) => $row->tgl_sewa ? Carbon::parse($row->tgl_sewa)->locale('id')->translatedFormat('j F Y') : '-')
                ->editColumn('tgl_akhir_sewa', fn ($row) => $row->tgl_akhir_sewa ? Carbon::parse($row->tgl_akhir_sewa)->locale('id')->translatedFormat('j F Y') : '-')
                ->addColumn('customer', fn ($row) => $row->customer?->nama_lengkap ?? '-')
                ->addColumn('status_sewa', fn ($row) => $row->status_sewa)
                ->addColumn('periode_sewa', function ($row): string {
                    $mulai = $row->tgl_sewa ? Carbon::parse($row->tgl_sewa)->locale('id')->translatedFormat('j M Y') : '-';
                    $selesai = $row->tgl_akhir_sewa ? Carbon::parse($row->tgl_akhir_sewa)->locale('id')->translatedFormat('j M Y') : '-';

                    return $mulai.' - '.$selesai;
                })
                ->addColumn('petugas', fn ($row) => $row->user?->nama_lengkap ?? '-')
                ->addColumn('jumlah_item', fn ($row) => $row->details->sum('qty'))
                ->editColumn('total_biaya', fn ($row) => number_format((float) ($row->total_biaya ?? 0), 0, ',', '.'))
                ->addColumn('action', function ($row) use ($permissions) {
                    $btn = '<div class="d-flex justify-content-center">';

                    if ($permissions['tambah'] && ($row->status_pembayaran ?? '') === Sewa::BAYAR_PENDING) {
                        $btn .= '<button class="btn btn-success btn-sm mx-1 bayar-button" data-id="'.e($row->id).'">Bayar</button>';
                    }

                    if ($permissions['edit']) {
                        $btn .= '<button class="btn btn-primary btn-sm mx-1 edit-button" data-id="'.e($row->id).'" data-url="'.e(route('sewa.edit', $row->id)).'">Edit</button>';
                    }

                    if ($permissions['hapus']) {
                        $btn .= '<form action="'.e(route('sewa.destroy', $row->id)).'" method="POST" style="display:inline;">'
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

        $customers = Customer::orderBy('nama_lengkap')->get();
        $barangs = Barang::orderBy('nama_barang')->get();
        $isLocal = ! app()->isProduction();

        return Inertia::render('Admin/Transaksi/Sewa/Index', compact('permissions', 'customers', 'barangs', 'isLocal'));
    }

    public function edit($id)
    {
        $data = Sewa::with(['details.barang', 'customer'])->findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function struk($id)
    {
        $sewa = Sewa::with([
            'customer',
            'user',
            'details.barang.merk',
            'details.barang.kategori',
        ])->findOrFail($id);

        $pembayaran = null;

        $jumlahHari = $this->jumlahHari((string) $sewa->tgl_sewa, (string) $sewa->tgl_akhir_sewa);

        return response()->json([
            'status' => 'success',
            'data' => [
                'sewa' => $sewa,
                'pembayaran' => $pembayaran,
                'jumlah_hari' => $jumlahHari,
                'store' => [
                    'name' => 'SkyLens',
                    'address' => 'Jl. Pemuda No. 123, Pusat Kota',
                    'phone' => '0812-3456-7890',
                    'note' => 'Barang sewa wajib dikembalikan tepat waktu dalam kondisi baik dan lengkap.',
                ],
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->validasiSewa($request);

        DB::beginTransaction();
        try {
            $sewa = Sewa::create([
                'tgl_sewa' => $request->tgl_sewa,
                'tgl_akhir_sewa' => $request->tgl_akhir_sewa,
                'id_customer' => $request->id_customer,
                'total_biaya' => $this->hitungTotal($request->items, $request->tgl_sewa, $request->tgl_akhir_sewa),
                'no_sewa' => $this->nomor->noSewa($request->tgl_sewa),
                'foto_jaminan' => $this->simpanJaminan($request),
                'id_users' => Auth::id(),
                'status_pembayaran' => Sewa::BAYAR_PENDING,
                'asal_pesanan' => Sewa::ASAL_ADMIN,
            ]);

            foreach ($request->items as $item) {
                $detailBaru = SewaDetail::create([
                    'id_sewa' => $sewa->id,
                    'id_barang' => $item['id_barang'],
                    'harga_sewa_satuan' => $item['harga_sewa_satuan'],
                    'qty' => $item['qty'],
                ]);

                $this->ubahStok($item['id_barang'], (int) $item['qty'], 'Keluar', ['id_sewa_detail' => $detailBaru->id]);
            }

            DB::commit();

            return response()->json(['status' => 'success', 'id' => $sewa->id]);
        } catch (StokTidakCukupException $e) {
            DB::rollBack();

            return $this->responsStokHabis($e, $request->input('items', []));
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating sewa: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $sewa = Sewa::with('details')->findOrFail($id);

        $this->validasiSewa($request, true);

        DB::beginTransaction();
        try {
            if ($sewa->status_pembayaran !== Sewa::BAYAR_PENDING) {
                return $this->perbaruiHanyaJaminan($sewa, $request);
            }

            $db = [
                'tgl_sewa' => $request->tgl_sewa,
                'tgl_akhir_sewa' => $request->tgl_akhir_sewa,
                'id_customer' => $request->id_customer,
            ];

            if ($request->hasFile('foto_jaminan')) {
                if (! empty($sewa->foto_jaminan) && file_exists(public_path('assets/jaminan/'.$sewa->foto_jaminan))) {
                    unlink(public_path('assets/jaminan/'.$sewa->foto_jaminan));
                }

                $db['foto_jaminan'] = $this->simpanJaminan($request);
            }

            $sewa->update($db);

            $this->sinkronDetail($sewa, $request->items);

            $sewa->update([
                'total_biaya' => $this->hitungTotal($request->items, $request->tgl_sewa, $request->tgl_akhir_sewa),
            ]);

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (StokTidakCukupException $e) {
            DB::rollBack();

            return $this->responsStokHabis($e, $request->input('items', []));
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating sewa: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $sewa = Sewa::with('details')->findOrFail($id);

        DB::beginTransaction();
        try {
            if (! empty($sewa->foto_jaminan) && file_exists(public_path('assets/jaminan/'.$sewa->foto_jaminan))) {
                unlink(public_path('assets/jaminan/'.$sewa->foto_jaminan));
            }

            foreach ($sewa->details as $detail) {
                $this->stok->batalkanKeluar($detail->id_barang, (int) $detail->qty, ['id_sewa_detail' => $detail->id]);
                $detail->delete();
            }

            $sewa->delete();

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (StokTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting sewa: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    private function validasiSewa(Request $request, bool $isUpdate = false): void
    {
        $request->validate([
            'tgl_sewa' => 'required|date',
            'tgl_akhir_sewa' => 'required|date|after:tgl_sewa',
            'id_customer' => 'required|string|exists:customer,id',
            'foto_jaminan' => 'nullable|file|mimes:jpeg,png,jpg,webp',
            'items' => 'required|array|min:1',
            'items.*.id' => ($isUpdate ? 'required' : 'nullable').'|integer|exists:sewa_detail,id',
            'items.*.id_barang' => 'required|string|exists:barang,id',
            'items.*.harga_sewa_satuan' => 'required|numeric|min:0',
            'items.*.qty' => 'required|integer|min:1',
        ], [
            'tgl_sewa.required' => 'Tanggal sewa wajib diisi.',
            'tgl_akhir_sewa.required' => 'Tanggal akhir sewa wajib diisi.',
            'tgl_akhir_sewa.after' => 'Tanggal akhir sewa harus setelah tanggal sewa.',
            'id_customer.required' => 'Customer wajib dipilih.',
            'items.required' => 'Minimal harus ada 1 item sewa.',
            'items.*.id.required' => 'Item sewa tidak valid.',
            'items.*.id.exists' => 'Item sewa tidak ditemukan.',
            'items.*.id_barang.required' => 'Barang wajib dipilih.',
            'items.*.harga_sewa_satuan.required' => 'Harga sewa satuan wajib diisi.',
            'items.*.qty.required' => 'Qty wajib diisi.',
            'items.*.qty.min' => 'Qty minimal 1.',
        ]);
    }

    private function jumlahHari(string $tglSewa, string $tglAkhir): int
    {
        return max(1, (int) Carbon::parse($tglSewa)->diffInDays(Carbon::parse($tglAkhir)));
    }

    private function hitungTotal(array $items, string $tglSewa, string $tglAkhir): int
    {
        $perHari = (int) collect($items)->sum(
            fn ($item) => $item['harga_sewa_satuan'] * $item['qty']
        );

        return $perHari * $this->jumlahHari($tglSewa, $tglAkhir);
    }

    private function simpanJaminan(Request $request): string
    {
        if (! $request->hasFile('foto_jaminan')) {
            return '';
        }

        $file = $request->file('foto_jaminan');
        $filename = Str::random(25).'.'.$file->getClientOriginalExtension();
        $file->move(public_path('assets/jaminan'), $filename);

        return $filename;
    }

    /**
     * Untuk sewa yang sudah dibayar, satu-satunya perubahan yang diizinkan
     * adalah foto jaminan. Tanggal, customer, dan detail barang dikunci.
     */
    private function perbaruiHanyaJaminan(Sewa $sewa, Request $request): JsonResponse
    {
        $db = [];

        if ($request->hasFile('foto_jaminan')) {
            if (! empty($sewa->foto_jaminan) && file_exists(public_path('assets/jaminan/'.$sewa->foto_jaminan))) {
                unlink(public_path('assets/jaminan/'.$sewa->foto_jaminan));
            }

            $db['foto_jaminan'] = $this->simpanJaminan($request);
        }

        if ($db !== []) {
            $sewa->update($db);
        }

        DB::commit();

        return response()->json(['status' => 'success', 'id' => $sewa->id]);
    }

    private function sinkronDetail(Sewa $sewa, array $items): void
    {
        $incomingIds = collect($items)->pluck('id')->filter()->unique()->values();

        foreach ($items as $item) {
            $detail = isset($item['id'])
                ? SewaDetail::where('id_sewa', $sewa->id)->where('id', $item['id'])->first()
                : null;

            if ($detail) {
                $idBarangLama = $detail->id_barang;
                $idBarangBaru = $item['id_barang'];
                $qtyLama = (int) $detail->qty;
                $qtyBaru = (int) $item['qty'];

                if ($idBarangLama !== $idBarangBaru) {
                    $this->ubahStok($idBarangLama, $qtyLama, 'Masuk', ['id_sewa_detail' => $detail->id]);
                    $this->ubahStok($idBarangBaru, $qtyBaru, 'Keluar', ['id_sewa_detail' => $detail->id]);
                } elseif ($qtyLama !== $qtyBaru) {
                    $selisih = $qtyBaru - $qtyLama;
                    $this->ubahStok($idBarangBaru, abs($selisih), $selisih > 0 ? 'Keluar' : 'Masuk', ['id_sewa_detail' => $detail->id]);
                }

                $detail->update([
                    'id_barang' => $idBarangBaru,
                    'harga_sewa_satuan' => $item['harga_sewa_satuan'],
                    'qty' => $qtyBaru,
                ]);

                continue;
            }

            $detailBaru = SewaDetail::create([
                'id_sewa' => $sewa->id,
                'id_barang' => $item['id_barang'],
                'harga_sewa_satuan' => $item['harga_sewa_satuan'],
                'qty' => $item['qty'],
            ]);

            $this->ubahStok($item['id_barang'], (int) $item['qty'], 'Keluar', ['id_sewa_detail' => $detailBaru->id]);
        }

        $detailDihapus = SewaDetail::where('id_sewa', $sewa->id)
            ->when($incomingIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $incomingIds))
            ->get();

        foreach ($detailDihapus as $detail) {
            $this->ubahStok($detail->id_barang, (int) $detail->qty, 'Masuk', ['id_sewa_detail' => $detail->id]);
            $detail->delete();
        }
    }

    /**
     * Ubah kegagalan stok menjadi error validasi per baris item.
     *
     * Baliknya memakai struktur `errors.items.{index}.id_barang` supaya frontend
     * bisa menampilkannya di bawah select barang, sama seperti error validasi lain.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    private function responsStokHabis(StokTidakCukupException $e, array $items): JsonResponse
    {
        $pesan = $e->getMessage();

        if ($e->stokTersedia !== null) {
            $pesan .= ' Tersedia '.$e->stokTersedia.' unit.';
        }

        $index = null;

        foreach (array_values($items) as $i => $item) {
            if ((string) ($item['id_barang'] ?? '') === (string) $e->idBarang) {
                $index = $i;
                break;
            }
        }

        if ($index === null) {
            return response()->json(['status' => 'error', 'error' => $pesan], 422);
        }

        return response()->json([
            'message' => $pesan,
            'errors' => ["items.{$index}.id_barang" => [$pesan]],
        ], 422);
    }

    private function ubahStok($idBarang, int $qty, string $jenis, ?array $sumber = null): void
    {
        if ($jenis === 'Keluar') {
            $this->stok->kurang($idBarang, $qty, RiwayatStokService::KELUAR, $sumber);

            return;
        }

        $this->stok->tambah($idBarang, $qty, RiwayatStokService::MASUK, $sumber);
    }
}
