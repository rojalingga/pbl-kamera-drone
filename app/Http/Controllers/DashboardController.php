<?php

namespace App\Http\Controllers;

use App\Models\Barang;
use App\Models\Kategori;
use App\Models\Pemasukan;
use App\Models\Pengeluaran;
use App\Models\PerawatanDetail;
use App\Models\Piutang;
use App\Models\Sewa;
use App\Models\SewaDetail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $dashboardData = $this->getDashboardMetrics();

        return Inertia::render('Admin/Dashboard', $dashboardData);
    }

    public function data(Request $request): JsonResponse
    {
        $dashboardData = $this->getDashboardMetrics();

        return response()->json($dashboardData);
    }

    private function getDashboardMetrics(): array
    {
        $awal = now()->startOfMonth()->toDateString();
        $akhir = now()->endOfMonth()->toDateString();
        $hariIni = now()->toDateString();

        // 1. Metrics Utama
        $pemasukanBulan = (float) Pemasukan::whereBetween('tgl_pemasukan', [$awal, $akhir])->sum('nominal');
        $pengeluaranBulan = (float) Pengeluaran::whereBetween('tgl_pengeluaran', [$awal, $akhir])->sum('nominal');
        $labaBulan = $pemasukanBulan - $pengeluaranBulan;

        $sewaAktif = Sewa::where('status_pembayaran', Sewa::BAYAR_CONFIRMED)
            ->whereDoesntHave('pengembalians')
            ->count();

        $sewaBulanIni = Sewa::whereBetween('created_at', [
            now()->startOfMonth()->toDateTimeString(),
            now()->endOfMonth()->toDateTimeString(),
        ])->count();

        $sewaWebCount = Sewa::where('asal_pesanan', Sewa::ASAL_WEB)
            ->whereBetween('created_at', [
                now()->startOfMonth()->toDateTimeString(),
                now()->endOfMonth()->toDateTimeString(),
            ])->count();

        $sewaAdminCount = Sewa::where(function ($q) {
            $q->where('asal_pesanan', Sewa::ASAL_ADMIN)
                ->orWhereNull('asal_pesanan');
        })
            ->whereBetween('created_at', [
                now()->startOfMonth()->toDateTimeString(),
                now()->endOfMonth()->toDateTimeString(),
            ])->count();

        $unitPerawatan = (int) PerawatanDetail::where('status', 'Perawatan')->sum('qty');

        $piutangBelum = (float) Piutang::whereRaw('COALESCE(terbayar, 0) < nominal')
            ->sum(DB::raw('nominal - COALESCE(terbayar, 0)'));

        $stats = [
            'total_pendapatan' => $pemasukanBulan,
            'total_pengeluaran' => $pengeluaranBulan,
            'laba_bersih' => $labaBulan,
            'sewa_aktif' => $sewaAktif,
            'sewa_bulan_ini' => $sewaBulanIni,
            'sewa_web_count' => $sewaWebCount,
            'sewa_admin_count' => $sewaAdminCount,
            'total_barang' => Barang::count(),
            'stok_kritis' => Barang::where('stok', '<=', 2)->count(),
            'unit_dalam_perawatan' => $unitPerawatan,
            'piutang_belum' => $piutangBelum,
            // Kompatibilitas dengan props sebelumnya
            'pemasukan_bulan' => $pemasukanBulan,
            'pengeluaran_bulan' => $pengeluaranBulan,
        ];

        // 2. Trend Keuangan 6 Bulan Terakhir
        $chartKeuangan = [
            'categories' => [],
            'pemasukan' => [],
            'pengeluaran' => [],
            'laba' => [],
        ];

        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $startM = $date->copy()->startOfMonth()->toDateString();
            $endM = $date->copy()->endOfMonth()->toDateString();

            $pemasukanM = (float) Pemasukan::whereBetween('tgl_pemasukan', [$startM, $endM])->sum('nominal');
            $pengeluaranM = (float) Pengeluaran::whereBetween('tgl_pengeluaran', [$startM, $endM])->sum('nominal');

            $chartKeuangan['categories'][] = $date->locale('id')->translatedFormat('M Y');
            $chartKeuangan['pemasukan'][] = (int) $pemasukanM;
            $chartKeuangan['pengeluaran'][] = (int) $pengeluaranM;
            $chartKeuangan['laba'][] = (int) ($pemasukanM - $pengeluaranM);
        }

        // 3. Komposisi Sewa Berdasarkan Kategori Barang
        $kategoriList = Kategori::all();
        $chartKategori = [
            'labels' => [],
            'series' => [],
        ];

        $totalSewaDetail = SewaDetail::count();

        foreach ($kategoriList as $kat) {
            $count = (int) SewaDetail::whereHas('barang', function ($q) use ($kat) {
                $q->where('id_kategori', $kat->id);
            })->sum('qty');

            if ($count > 0 || $totalSewaDetail === 0) {
                $chartKategori['labels'][] = $kat->kategori;
                $chartKategori['series'][] = $totalSewaDetail === 0
                    ? (int) Barang::where('id_kategori', $kat->id)->sum('stok')
                    : $count;
            }
        }

        if (empty($chartKategori['labels'])) {
            $chartKategori['labels'] = ['Kamera', 'Drone', 'Lensa'];
            $chartKategori['series'] = [1, 1, 1];
        }

        // 4. Distribusi Asal Pesanan
        $chartAsalPesanan = [
            'labels' => ['Online Web', 'Kasir Admin'],
            'series' => [
                Sewa::where('asal_pesanan', Sewa::ASAL_WEB)->count(),
                Sewa::where(function ($q) {
                    $q->where('asal_pesanan', Sewa::ASAL_ADMIN)->orWhereNull('asal_pesanan');
                })->count(),
            ],
        ];

        // 5. Transaksi Sewa Terbaru (6 transaksi)
        $sewaTerbaru = Sewa::with(['customer', 'details.barang'])
            ->withExists('pengembalians')
            ->orderByDesc('created_at')
            ->limit(6)
            ->get()
            ->map(function ($s) {
                return [
                    'id' => $s->id,
                    'no_sewa' => $s->no_sewa ?? 'SEWA-'.substr($s->id, 0, 8),
                    'customer' => $s->customer?->nama_lengkap ?? '-',
                    'total_biaya' => (int) ($s->total_biaya ?? 0),
                    'status_pembayaran' => $s->status_pembayaran ?? 'Pending',
                    'status_sewa' => $s->status_sewa,
                    'asal_pesanan' => $s->asal_pesanan ?? 'admin',
                    'tgl_sewa' => $s->tgl_sewa ? Carbon::parse($s->tgl_sewa)->locale('id')->translatedFormat('j M Y') : '-',
                    'tgl_akhir_sewa' => $s->tgl_akhir_sewa ? Carbon::parse($s->tgl_akhir_sewa)->locale('id')->translatedFormat('j M Y') : '-',
                    'items_count' => $s->details->count(),
                ];
            });

        // 6. Peralatan Terpopuler (Top Rented Gear)
        $topBarangAgg = SewaDetail::select('id_barang', DB::raw('SUM(qty) as total_tersewa'))
            ->groupBy('id_barang')
            ->orderByDesc('total_tersewa')
            ->limit(5)
            ->get();

        $topBarangIds = $topBarangAgg->pluck('total_tersewa', 'id_barang')->all();

        $topBarang = Barang::with(['kategori', 'merk', 'fotos'])
            ->whereIn('id', array_keys($topBarangIds))
            ->get()
            ->map(function ($b) use ($topBarangIds) {
                $foto = $b->fotos->first()?->foto;

                return [
                    'id' => $b->id,
                    'nama_barang' => $b->nama_barang,
                    'kategori' => $b->kategori?->kategori ?? '-',
                    'merk' => $b->merk?->merk ?? '-',
                    'stok' => (int) $b->stok,
                    'harga_sewa' => (int) $b->harga_sewa,
                    'total_tersewa' => (int) ($topBarangIds[$b->id] ?? 0),
                    'foto' => $foto ? "/assets/barang/{$foto}" : '/assets/img/1 Kamera.jpg',
                ];
            })
            ->sortByDesc('total_tersewa')
            ->values();

        if ($topBarang->isEmpty()) {
            $topBarang = Barang::with(['kategori', 'merk', 'fotos'])
                ->limit(5)
                ->get()
                ->map(function ($b) {
                    $foto = $b->fotos->first()?->foto;

                    return [
                        'id' => $b->id,
                        'nama_barang' => $b->nama_barang,
                        'kategori' => $b->kategori?->kategori ?? '-',
                        'merk' => $b->merk?->merk ?? '-',
                        'stok' => (int) $b->stok,
                        'harga_sewa' => (int) $b->harga_sewa,
                        'total_tersewa' => 0,
                        'foto' => $foto ? "/assets/barang/{$foto}" : '/assets/img/1 Kamera.jpg',
                    ];
                });
        }

        // 7. Peringatan Jatuh Tempo Hari Ini / Terlambat
        $jatuhTempo = Sewa::with('customer')
            ->where('status_pembayaran', Sewa::BAYAR_CONFIRMED)
            ->whereDoesntHave('pengembalians')
            ->whereDate('tgl_akhir_sewa', '<=', $hariIni)
            ->orderBy('tgl_akhir_sewa')
            ->limit(5)
            ->get()
            ->map(function ($s) {
                return [
                    'id' => $s->id,
                    'no_sewa' => $s->no_sewa,
                    'customer' => $s->customer?->nama_lengkap ?? '-',
                    'no_hp' => $s->customer?->no_hp ?? '-',
                    'tgl_akhir' => $s->tgl_akhir_sewa ? Carbon::parse($s->tgl_akhir_sewa)->locale('id')->translatedFormat('j M Y') : '-',
                    'status_sewa' => $s->status_sewa,
                ];
            });

        return [
            'stats' => $stats,
            'chartKeuangan' => $chartKeuangan,
            'chartKategori' => $chartKategori,
            'chartAsalPesanan' => $chartAsalPesanan,
            'sewaTerbaru' => $sewaTerbaru,
            'topBarang' => $topBarang,
            'jatuhTempo' => $jatuhTempo,
        ];
    }
}
