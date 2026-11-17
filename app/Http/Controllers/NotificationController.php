<?php

namespace App\Http\Controllers;

use App\Models\PembelianUnit;
use App\Models\Perawatan;
use App\Models\Sewa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class NotificationController extends Controller
{
    /**
     * Ambil seluruh notifikasi aktif untuk admin / owner.
     * 1. Pengembalian telat (sewa yang sudah lewat tgl_akhir_sewa dan belum ada pengembalian).
     * 2. Pembelian unit yang butuh persetujuan owner (is_owner_acc = Pending).
     * 3. Perawatan barang yang butuh persetujuan owner (is_owner_acc = Pending).
     */
    public function index(Request $request): JsonResponse
    {
        $hariIni = Carbon::now()->startOfDay();

        // 1. Pengembalian telat
        $sewaTelats = Sewa::with('customer')
            ->where('status_pembayaran', Sewa::BAYAR_CONFIRMED)
            ->whereDoesntHave('pengembalians')
            ->whereDate('tgl_akhir_sewa', '<', $hariIni)
            ->orderBy('tgl_akhir_sewa', 'asc')
            ->get();

        $notifPengembalian = $sewaTelats->map(function ($sewa) use ($hariIni) {
            $tglAkhir = Carbon::parse($sewa->tgl_akhir_sewa)->startOfDay();
            $selisihHari = (int) $tglAkhir->diffInDays($hariIni);

            return [
                'id' => 'pengembalian-'.$sewa->id,
                'kategori' => 'Pengembalian',
                'judul' => 'Sewa Melewati Batas Waktu',
                'pesan' => 'No. Sewa '.$sewa->no_sewa.' ('.($sewa->customer?->nama_lengkap ?? '-').') sudah lewat '.$selisihHari.' hari.',
                'waktu' => $sewa->tgl_akhir_sewa ? Carbon::parse($sewa->tgl_akhir_sewa)->locale('id')->translatedFormat('j F Y') : '-',
                'tipe' => 'danger',
                'url' => route('pengembalian.index'),
                'target_menu' => 'Pengembalian',
            ];
        });

        // 2. Pembelian unit butuh persetujuan owner (is_owner_acc = Pending)
        $pembelianPending = PembelianUnit::with('details.barang')
            ->where('is_owner_acc', PembelianUnit::STATUS_PENDING)
            ->orderByDesc('id')
            ->get();

        $notifPembelian = $pembelianPending->map(function ($pembelian) {
            $totalBiaya = (float) $pembelian->details->sum(fn ($d) => (float) ($d->harga_beli ?? 0) * (int) ($d->jumlah ?? 0));
            $jmlUnit = (int) $pembelian->details->sum('jumlah');

            return [
                'id' => 'pembelian-'.$pembelian->id,
                'kategori' => 'Pembelian Unit',
                'judul' => 'Butuh Persetujuan Owner',
                'pesan' => 'Pembelian #'.$pembelian->id.' ('.$jmlUnit.' unit - Rp '.number_format($totalBiaya, 0, ',', '.').') menunggu persetujuan.',
                'waktu' => $pembelian->tanggal ? Carbon::parse($pembelian->tanggal)->locale('id')->translatedFormat('j F Y') : '-',
                'tipe' => 'warning',
                'url' => route('pembelian-unit.index'),
                'target_menu' => 'Pembelian Unit',
            ];
        });

        // 3. Perawatan barang butuh persetujuan owner (is_owner_acc = Pending)
        $perawatanPending = Perawatan::with('details.barang')
            ->where('is_owner_acc', Perawatan::STATUS_PENDING)
            ->orderByDesc('id')
            ->get();

        $notifPerawatan = $perawatanPending->map(function ($perawatan) {
            $totalBiaya = (float) ($perawatan->total_biaya_perawatan ?? 0);
            $jmlItem = $perawatan->details->count();

            return [
                'id' => 'perawatan-'.$perawatan->id,
                'kategori' => 'Perawatan',
                'judul' => 'Butuh Persetujuan Owner',
                'pesan' => 'Perawatan #'.$perawatan->id.' ('.$jmlItem.' item - Rp '.number_format($totalBiaya, 0, ',', '.').') menunggu persetujuan.',
                'waktu' => $perawatan->tgl_perawatan ? Carbon::parse($perawatan->tgl_perawatan)->locale('id')->translatedFormat('j F Y') : '-',
                'tipe' => 'warning',
                'url' => route('perawatan.index'),
                'target_menu' => 'Perawatan',
            ];
        });

        $semua = $notifPengembalian->concat($notifPembelian)->concat($notifPerawatan)->values();

        return response()->json([
            'status' => 'success',
            'total' => $semua->count(),
            'counts' => [
                'pengembalian' => $notifPengembalian->count(),
                'pembelian' => $notifPembelian->count(),
                'perawatan' => $notifPerawatan->count(),
            ],
            'data' => $semua,
        ]);
    }
}
