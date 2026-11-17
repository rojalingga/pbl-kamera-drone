<?php

namespace App\Http\Controllers\Transaksi;

use App\Exceptions\SaldoTidakCukupException;
use App\Exceptions\StokTidakCukupException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\Barang;
use App\Models\Perawatan;
use App\Models\PerawatanDetail;
use App\Services\PerawatanPembayaranService;
use App\Services\RiwayatStokService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class PerawatanController extends Controller
{
    public function __construct(private RiwayatStokService $stok, private PerawatanPembayaranService $pembayaran) {}

    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        if (($request->has('datatable') || $request->wantsJson() || ($request->ajax() && $request->has('draw'))) && ! $request->header('X-Inertia')) {
            $data = Perawatan::with('details.barang', 'user')->orderByDesc('id');

            return DataTables::of($data)->escapeColumns([])
                ->addIndexColumn()
                ->editColumn('tgl_perawatan', fn ($row) => $row->tgl_perawatan ? Carbon::parse($row->tgl_perawatan)->locale('id')->translatedFormat('j F Y') : '-')
                ->editColumn('total_biaya_perawatan', fn ($row) => number_format((float) ($row->total_biaya_perawatan ?? 0), 0, ',', '.'))
                ->addColumn('jumlah_item', fn ($row) => $row->details->count())
                ->addColumn('total_qty', fn ($row) => (int) $row->details->sum('qty'))
                ->addColumn('barang_list', fn ($row) => $row->details
                    ->map(fn ($detail) => ($detail->barang?->nama_barang ?? '-').' ('.(int) $detail->qty.')')
                    ->join(', '))
                ->addColumn('detail_list', fn ($row) => $row->details
                    ->map(fn ($detail) => [
                        'id' => $detail->id,
                        'barang' => $detail->barang?->nama_barang ?? '-',
                        'qty' => (int) $detail->qty,
                        'status' => $detail->status ?? PerawatanDetail::STATUS_PERAWATAN,
                    ])
                    ->values())
                ->addColumn('petugas', fn ($row) => $row->user?->name ?? '-')
                ->addColumn('status_pembayaran', fn ($row) => $row->status_pembayaran ?? Perawatan::BAYAR_BELUM_LUNAS)
                ->addColumn('is_owner_acc', fn ($row) => (int) ($row->is_owner_acc ?? Perawatan::STATUS_PENDING))
                ->addColumn('alasan_penolakan', fn ($row) => $row->alasan_penolakan ?? '')
                ->make(true);
        }

        return Inertia::render('Admin/Transaksi/Perawatan/Index', [
            'permissions' => $permissions,
            'barangs' => Barang::orderBy('nama_barang')->get(['id', 'nama_barang', 'stok']),
        ]);
    }

    public function edit($id)
    {
        $data = Perawatan::with('details.barang', 'pengeluarans')->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $data->id,
                'tgl_perawatan' => $data->tgl_perawatan?->format('Y-m-d'),
                'id_user' => $data->id_user,
                'is_owner_acc' => (int) ($data->is_owner_acc ?? Perawatan::STATUS_PENDING),
                'alasan_penolakan' => $data->alasan_penolakan ?? '',
                'total_biaya_perawatan' => $data->total_biaya_perawatan,
                'status_pembayaran' => $data->status_pembayaran,
                'details' => $data->details->map(fn ($detail) => [
                    'id' => $detail->id,
                    'id_barang' => (string) $detail->id_barang,
                    'qty' => (int) $detail->qty,
                    'biaya_perawatan' => (int) ($detail->biaya_perawatan ?? 0),
                    'status' => $detail->status ?? PerawatanDetail::STATUS_PERAWATAN,
                    'keterangan' => $detail->keterangan ?? '',
                ])->values(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->validasi($request);

        $tglPerawatan = Carbon::parse($request->tgl_perawatan)->toDateString();
        $isOwner = $request->user()?->isOwner() ?? false;
        $isOwnerAcc = $isOwner
            ? (int) ($request->is_owner_acc ?? Perawatan::STATUS_PENDING)
            : Perawatan::STATUS_PENDING;
        $alasanPenolakan = $isOwner && $isOwnerAcc === Perawatan::STATUS_DITOLAK
            ? $request->alasan_penolakan
            : null;

        DB::beginTransaction();
        try {
            $perawatan = Perawatan::create([
                'tgl_perawatan' => $tglPerawatan,
                'id_user' => $request->id_user ?: auth()->id(),
                'total_biaya_perawatan' => $this->totalBiaya($request->details),
                'status_pembayaran' => Perawatan::BAYAR_BELUM_LUNAS,
                'is_owner_acc' => $isOwnerAcc,
                'alasan_penolakan' => $alasanPenolakan,
            ]);

            foreach ($request->details as $detail) {
                $detailBaru = $this->buatDetail($perawatan, $detail);

                // Hanya mutasi stok jika disetujui owner (status Disetujui)
                if ($isOwnerAcc === Perawatan::STATUS_DISETUJUI) {
                    $this->mutasiStok($detailBaru);
                }
            }

            // Hanya bayar / potong saldo jika disetujui owner (status Disetujui)
            if ($isOwnerAcc === Perawatan::STATUS_DISETUJUI) {
                $this->catatPembayaran($perawatan, $request);
            }

            DB::commit();

            return response()->json(['status' => 'success', 'id' => $perawatan->id]);
        } catch (StokTidakCukupException|SaldoTidakCukupException|\DomainException|\InvalidArgumentException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating perawatan: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $perawatan = Perawatan::with('details')->findOrFail($id);

        $this->validasi($request);

        $tglPerawatan = Carbon::parse($request->tgl_perawatan)->toDateString();
        $statusLama = (int) ($perawatan->is_owner_acc ?? Perawatan::STATUS_PENDING);
        $isOwner = $request->user()?->isOwner() ?? false;

        // Non-owner tidak boleh mengubah status persetujuan: status lama dipertahankan.
        if ($isOwner) {
            $statusBaru = (int) ($request->is_owner_acc ?? $statusLama);
            $alasanPenolakan = $statusBaru === Perawatan::STATUS_DITOLAK ? $request->alasan_penolakan : null;
        } else {
            $statusBaru = $statusLama;
            $alasanPenolakan = $perawatan->alasan_penolakan;
        }

        DB::beginTransaction();
        try {
            // Jika sebelumnya sudah disetujui owner, batalkan stok dan pembayaran lama
            if ($statusLama === Perawatan::STATUS_DISETUJUI) {
                $this->batalkanSeluruhStok($perawatan);
                $this->pembayaran->batalkan($perawatan);
            }

            PerawatanDetail::where('id_perawatan', $perawatan->id)->delete();

            foreach ($request->details as $detail) {
                $detailBaru = $this->buatDetail($perawatan, $detail);

                // Mutasi stok hanya jika status baru disetujui
                if ($statusBaru === Perawatan::STATUS_DISETUJUI) {
                    $this->mutasiStok($detailBaru);
                }
            }

            $perawatan->update([
                'tgl_perawatan' => $tglPerawatan,
                'id_user' => $request->id_user ?: $perawatan->id_user,
                'total_biaya_perawatan' => $this->totalBiaya($request->details),
                'is_owner_acc' => $statusBaru,
                'alasan_penolakan' => $alasanPenolakan,
            ]);

            // Mutasi keuangan hanya jika status baru disetujui
            if ($statusBaru === Perawatan::STATUS_DISETUJUI) {
                $this->catatPembayaran($perawatan, $request);
            }

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (StokTidakCukupException|SaldoTidakCukupException|\DomainException|\InvalidArgumentException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating perawatan: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $perawatan = Perawatan::with('details')->findOrFail($id);

        $statusLama = (int) ($perawatan->is_owner_acc ?? Perawatan::STATUS_PENDING);

        DB::beginTransaction();
        try {
            if ($statusLama === Perawatan::STATUS_DISETUJUI) {
                $this->batalkanSeluruhStok($perawatan);
                $this->pembayaran->batalkan($perawatan);
            }

            PerawatanDetail::where('id_perawatan', $perawatan->id)->delete();
            $perawatan->delete();

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (StokTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting perawatan: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Ubah status satu baris detail tanpa menyimpan ulang dokumen.
     * Status Perawatan berarti barang keluar dari stok, Selesai berarti
     * barang kembali ke stok.
     */
    public function updateStatusDetail(Request $request, $detailId)
    {
        $detail = PerawatanDetail::findOrFail($detailId);

        $request->validate([
            'status' => 'required|string|in:'.PerawatanDetail::STATUS_PERAWATAN.','.PerawatanDetail::STATUS_SELESAI,
        ], [
            'status.required' => 'Status wajib diisi.',
            'status.in' => 'Status tidak valid.',
        ]);

        $statusBaru = $request->status;

        if ($statusBaru === $detail->status) {
            return response()->json(['status' => 'success', 'data' => $detail]);
        }

        DB::beginTransaction();
        try {
            $sumber = ['id_perawatan_detail' => $detail->id];

            if ($statusBaru === PerawatanDetail::STATUS_SELESAI) {
                $this->stok->tambah($detail->id_barang, (int) $detail->qty, RiwayatStokService::MASUK, $sumber);
            } else {
                $this->stok->kurang($detail->id_barang, (int) $detail->qty, RiwayatStokService::KELUAR, $sumber);
            }

            $detail->update(['status' => $statusBaru]);

            DB::commit();

            return response()->json(['status' => 'success', 'data' => $detail->fresh()]);
        } catch (StokTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating status perawatan detail: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Catat pembayaran perawatan saat dokumen disimpan: buat pengeluaran
     * kategori Perawatan lalu potong saldo rekening sesuai metode bayar.
     * Perawatan yang sudah lunas tidak dibayar ulang, dan dokumen tanpa
     * biaya tidak menghasilkan pengeluaran.
     */
    private function catatPembayaran(Perawatan $perawatan, Request $request): void
    {
        if ($perawatan->sudahLunas() || (int) ($perawatan->total_biaya_perawatan ?? 0) <= 0) {
            return;
        }

        $tanggal = Carbon::parse($request->tgl_perawatan)->toDateString();
        $this->pembayaran->bayar($perawatan, (string) $request->metode_pembayaran, $tanggal);
    }

    /**
     * Total biaya perawatan = jumlah biaya seluruh baris detail.
     *
     * @param  array<int, array<string, mixed>>  $details
     */
    private function totalBiaya(array $details): int
    {
        $total = 0;

        foreach ($details as $detail) {
            $total += (int) ($detail['biaya_perawatan'] ?? 0);
        }

        return $total;
    }

    /**
     * @param  array<string, mixed>  $detail
     */
    private function buatDetail(Perawatan $perawatan, array $detail): PerawatanDetail
    {
        $status = ($detail['status'] ?? PerawatanDetail::STATUS_PERAWATAN) === PerawatanDetail::STATUS_SELESAI
            ? PerawatanDetail::STATUS_SELESAI
            : PerawatanDetail::STATUS_PERAWATAN;

        return PerawatanDetail::create([
            'id_perawatan' => $perawatan->id,
            'id_barang' => $detail['id_barang'],
            'qty' => (int) $detail['qty'],
            'biaya_perawatan' => (int) ($detail['biaya_perawatan'] ?? 0),
            'status' => $status,
            'keterangan' => $detail['keterangan'] ?? null,
        ]);
    }

    /**
     * Status Selesai berarti barang sudah kembali ke gudang sehingga stok
     * bertambah, status Perawatan berarti barang sedang.service sehingga
     * stok berkurang.
     */
    private function mutasiStok(PerawatanDetail $detail): void
    {
        $sumber = ['id_perawatan_detail' => $detail->id];

        if ($detail->sudahSelesai()) {
            $this->stok->tambah($detail->id_barang, (int) $detail->qty, RiwayatStokService::MASUK, $sumber);

            return;
        }

        $this->stok->kurang($detail->id_barang, (int) $detail->qty, RiwayatStokService::KELUAR, $sumber);
    }

    /**
     * Batalkan seluruh mutasi stok milik detail perawatan: barang yang
     * statusnya Perawatan dikembalikan ke stok, yang Selesai dikeluarkan lagi.
     */
    private function batalkanSeluruhStok(Perawatan $perawatan): void
    {
        foreach ($perawatan->details as $detail) {
            $sumber = ['id_perawatan_detail' => $detail->id];

            if ($detail->sudahSelesai()) {
                $this->stok->batalkanMasuk($detail->id_barang, (int) $detail->qty, $sumber);

                continue;
            }

            $this->stok->batalkanKeluar($detail->id_barang, (int) $detail->qty, $sumber);
        }
    }

    private function validasi(Request $request): void
    {
        $request->validate([
            'tgl_perawatan' => 'required|date',
            'id_user' => 'nullable|integer|exists:users,id',
            'is_owner_acc' => 'nullable|integer|in:'.Perawatan::STATUS_PENDING.','.Perawatan::STATUS_DISETUJUI.','.Perawatan::STATUS_DITOLAK,
            'alasan_penolakan' => 'nullable|string',
            'details' => 'required|array|min:1',
            'details.*.id_barang' => 'required|string|exists:barang,id',
            'details.*.qty' => 'required|integer|min:1',
            'details.*.biaya_perawatan' => 'nullable|integer|min:0',
            'details.*.status' => 'nullable|string|in:'.PerawatanDetail::STATUS_PERAWATAN.','.PerawatanDetail::STATUS_SELESAI,
            'details.*.keterangan' => 'nullable|string',
            'metode_pembayaran' => 'required|string|in:'.PerawatanPembayaranService::METODE_KAS.','.PerawatanPembayaranService::METODE_TRANSFER,
        ], [
            'tgl_perawatan.required' => 'Tanggal perawatan wajib diisi.',
            'tgl_perawatan.date' => 'Tanggal perawatan tidak valid.',
            'is_owner_acc.in' => 'Status persetujuan owner tidak valid.',
            'details.required' => 'Minimal harus ada 1 item perawatan.',
            'details.min' => 'Minimal harus ada 1 item perawatan.',
            'details.array' => 'Item perawatan tidak valid.',
            'details.*.id_barang.required' => 'Barang wajib dipilih.',
            'details.*.id_barang.exists' => 'Barang tidak valid.',
            'details.*.qty.required' => 'Jumlah wajib diisi.',
            'details.*.qty.integer' => 'Jumlah harus berupa angka.',
            'details.*.qty.min' => 'Jumlah minimal 1.',
            'details.*.biaya_perawatan.integer' => 'Biaya perawatan harus berupa angka.',
            'details.*.biaya_perawatan.min' => 'Biaya perawatan minimal 0.',
            'details.*.status.in' => 'Status perawatan tidak valid.',
            'metode_pembayaran.required' => 'Metode pembayaran wajib dipilih.',
            'metode_pembayaran.in' => 'Metode pembayaran tidak valid.',
        ]);
    }
}
