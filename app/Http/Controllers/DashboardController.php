<?php

namespace App\Http\Controllers;

use App\Models\Barang;
use App\Models\Kategori;
use App\Models\Pemasukan;
use App\Models\Pembayaran;
use App\Models\PengadaanBarang;
use App\Models\Pengeluaran;
use App\Models\Pengembalian;
use App\Models\Perawatan;
use App\Models\PerawatanDetail;
use App\Models\Piutang;
use App\Models\Rekening;
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
    public function index(Request $request): Response
    {
        $dashboardData = $this->getDashboardMetrics($request);

        return Inertia::render('Admin/Dashboard', $dashboardData);
    }

    public function data(Request $request): JsonResponse
    {
        $dashboardData = $this->getDashboardMetrics($request);

        return response()->json($dashboardData);
    }

    private function getDashboardMetrics(Request $request): array
    {
        $periode = $request->input('periode', 'bulan_ini');
        $customStart = $request->input('start_date');
        $customEnd = $request->input('end_date');

        $now = Carbon::now();

        switch ($periode) {
            case 'hari_ini':
                $start = $now->copy()->startOfDay();
                $end = $now->copy()->endOfDay();
                $prevStart = $now->copy()->subDay()->startOfDay();
                $prevEnd = $now->copy()->subDay()->endOfDay();
                $periodeLabel = 'Hari Ini ('.$start->locale('id')->translatedFormat('j M Y').')';
                break;
            case 'minggu_ini':
                $start = $now->copy()->startOfWeek();
                $end = $now->copy()->endOfWeek();
                $prevStart = $now->copy()->subWeek()->startOfWeek();
                $prevEnd = $now->copy()->subWeek()->endOfWeek();
                $periodeLabel = 'Minggu Ini ('.$start->locale('id')->translatedFormat('j M').' - '.$end->locale('id')->translatedFormat('j M Y').')';
                break;
            case 'tahun_ini':
                $start = $now->copy()->startOfYear();
                $end = $now->copy()->endOfYear();
                $prevStart = $now->copy()->subYear()->startOfYear();
                $prevEnd = $now->copy()->subYear()->endOfYear();
                $periodeLabel = 'Tahun '.$start->year;
                break;
            case 'custom':
                $start = $customStart ? Carbon::parse($customStart)->startOfDay() : $now->copy()->startOfMonth();
                $end = $customEnd ? Carbon::parse($customEnd)->endOfDay() : $now->copy()->endOfDay();
                $diffDays = max(1, $start->diffInDays($end));
                $prevStart = $start->copy()->subDays($diffDays);
                $prevEnd = $start->copy()->subSecond();
                $periodeLabel = $start->locale('id')->translatedFormat('j M Y').' - '.$end->locale('id')->translatedFormat('j M Y');
                break;
            case 'bulan_ini':
            default:
                $periode = 'bulan_ini';
                $start = $now->copy()->startOfMonth();
                $end = $now->copy()->endOfMonth();
                $prevStart = $now->copy()->subMonth()->startOfMonth();
                $prevEnd = $now->copy()->subMonth()->endOfMonth();
                $periodeLabel = 'Bulan '.$start->locale('id')->translatedFormat('F Y');
                break;
        }

        $sDate = $start->toDateString();
        $eDate = $end->toDateString();
        $prevSDate = $prevStart->toDateString();
        $prevEDate = $prevEnd->toDateString();

        // 1. Ringkasan Bisnis (Executive KPIs)
        $pemasukan = (float) Pemasukan::whereBetween('tgl_pemasukan', [$sDate, $eDate])->sum('nominal');
        $pengeluaran = (float) Pengeluaran::whereBetween('tgl_pengeluaran', [$sDate, $eDate])->sum('nominal');
        $profit = $pemasukan - $pengeluaran;

        $prevPemasukan = (float) Pemasukan::whereBetween('tgl_pemasukan', [$prevSDate, $prevEDate])->sum('nominal');
        $prevPengeluaran = (float) Pengeluaran::whereBetween('tgl_pengeluaran', [$prevSDate, $prevEDate])->sum('nominal');
        $prevProfit = $prevPemasukan - $prevPengeluaran;

        $calcGrowth = function (float $current, float $previous): float {
            if ($previous == 0.0) {
                return $current > 0 ? 100.0 : 0.0;
            }

            return round((($current - $previous) / abs($previous)) * 100, 1);
        };

        $pemasukanGrowth = $calcGrowth($pemasukan, $prevPemasukan);
        $pengeluaranGrowth = $calcGrowth($pengeluaran, $prevPengeluaran);
        $profitGrowth = $calcGrowth($profit, $prevProfit);
        $profitMargin = $pemasukan > 0 ? round(($profit / $pemasukan) * 100, 1) : 0.0;

        $totalPiutangBelum = (float) Piutang::whereRaw('COALESCE(terbayar, 0) < nominal')
            ->sum(DB::raw('nominal - COALESCE(terbayar, 0)'));
        $piutangCount = Piutang::whereRaw('COALESCE(terbayar, 0) < nominal')->count();

        // 2. Operasional Penyewaan (Rental Operations)
        $totalSewaPeriode = Sewa::whereBetween('tgl_sewa', [$sDate, $eDate])->count();
        $sewaBerjalan = Sewa::where('status_pembayaran', Sewa::BAYAR_CONFIRMED)
            ->whereDoesntHave('pengembalians')
            ->count();
        $sewaTerlambat = Sewa::where('status_pembayaran', Sewa::BAYAR_CONFIRMED)
            ->whereDoesntHave('pengembalians')
            ->whereDate('tgl_akhir_sewa', '<', $now->toDateString())
            ->count();
        $menungguKonfirmasi = Sewa::where('status_pembayaran', Sewa::BAYAR_PENDING)->count();
        $pengembalianBelumSelesai = Pengembalian::where('status_pembayaran', 'Belum Lunas')->count();

        // 3. Inventaris (Fleet & Equipment Overview)
        $totalJenisBarang = Barang::count();
        $stokTersedia = (int) Barang::sum('stok');
        $sedangDisewa = (int) SewaDetail::whereHas('sewa', function ($q) {
            $q->where('status_pembayaran', Sewa::BAYAR_CONFIRMED)->whereDoesntHave('pengembalians');
        })->sum('qty');
        $dalamPerawatan = (int) PerawatanDetail::where('status', 'Perawatan')->sum('qty');
        $totalStokUnit = $stokTersedia + $sedangDisewa + $dalamPerawatan;
        $stokRendahCount = Barang::where('stok', '<=', 2)->count();
        $utilisasiPersen = $totalStokUnit > 0 ? round(($sedangDisewa / $totalStokUnit) * 100, 1) : 0.0;

        $barangStokRendah = Barang::with(['merk', 'kategori', 'fotos'])
            ->where('stok', '<=', 2)
            ->orderBy('stok')
            ->limit(5)
            ->get()
            ->map(function ($b) {
                $foto = $b->fotos->first()?->foto;

                return [
                    'id' => $b->id,
                    'nama_barang' => $b->nama_barang,
                    'merk' => $b->merk?->merk ?? '-',
                    'kategori' => $b->kategori?->kategori ?? '-',
                    'stok' => (int) $b->stok,
                    'harga_sewa' => (int) $b->harga_sewa,
                    'foto' => $foto ? (str_starts_with($foto, 'http') ? $foto : "/assets/barang/{$foto}") : '/assets/img/1 Kamera.jpg',
                ];
            });

        // 4. Keuangan (Accounts Liquidity & Periodic Charts)
        $saldoRekening = Rekening::orderBy('id')->get()->map(function ($r) {
            return [
                'id' => $r->id,
                'nama_rek' => $r->nama_rek,
                'no_rek' => $r->no_rek ?? '-',
                'pemilik_rek' => $r->pemilik_rek ?? '-',
                'saldo' => (float) $r->saldo,
            ];
        });
        $totalSaldoRekening = (float) Rekening::sum('saldo');

        // Dynamic chart for selected period
        $chartPeriode = $this->buildChartForPeriod($periode, $start, $end);

        // Historical 6-month trend chart
        $chartBulanan = [
            'categories' => [],
            'pemasukan' => [],
            'pengeluaran' => [],
            'laba' => [],
        ];

        for ($i = 5; $i >= 0; $i--) {
            $date = $now->copy()->subMonths($i);
            $startM = $date->copy()->startOfMonth()->toDateString();
            $endM = $date->copy()->endOfMonth()->toDateString();

            $pM = (float) Pemasukan::whereBetween('tgl_pemasukan', [$startM, $endM])->sum('nominal');
            $eM = (float) Pengeluaran::whereBetween('tgl_pengeluaran', [$startM, $endM])->sum('nominal');

            $chartBulanan['categories'][] = $date->locale('id')->translatedFormat('M Y');
            $chartBulanan['pemasukan'][] = (int) $pM;
            $chartBulanan['pengeluaran'][] = (int) $eM;
            $chartBulanan['laba'][] = (int) ($pM - $eM);
        }

        // 5. Aktivitas Terbaru
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
                    'no_hp' => $s->customer?->no_hp ?? '-',
                    'total_biaya' => (float) ($s->total_biaya ?? 0),
                    'status_pembayaran' => $s->status_pembayaran ?? 'Pending',
                    'status_sewa' => $s->status_sewa,
                    'asal_pesanan' => $s->asal_pesanan ?? 'admin',
                    'tgl_sewa' => $s->tgl_sewa ? Carbon::parse($s->tgl_sewa)->locale('id')->translatedFormat('j M Y') : '-',
                    'tgl_akhir_sewa' => $s->tgl_akhir_sewa ? Carbon::parse($s->tgl_akhir_sewa)->locale('id')->translatedFormat('j M Y') : '-',
                    'items_count' => (int) $s->details->sum('qty'),
                    'items' => $s->details->map(fn ($d) => ($d->barang?->nama_barang ?? 'Item').' ('.$d->qty.'x)')->implode(', '),
                ];
            });

        $pembayaranTerbaru = Pembayaran::with(['sewa.customer', 'pengembalian.sewa.customer'])
            ->orderByDesc('created_at')
            ->limit(6)
            ->get()
            ->map(function ($p) {
                $cust = $p->sewa?->customer?->nama_lengkap ?? $p->pengembalian?->sewa?->customer?->nama_lengkap ?? '-';
                $noDok = $p->sewa?->no_sewa ?? $p->pengembalian?->sewa?->no_sewa ?? $p->order_id ?? '-';

                return [
                    'id' => $p->id,
                    'order_id' => $p->order_id ?? '-',
                    'no_dokumen' => $noDok,
                    'tipe' => $p->id_pengembalian ? 'Denda Pengembalian' : 'Sewa Unit',
                    'customer' => $cust,
                    'gross_amount' => (float) ($p->gross_amount ?? 0),
                    'payment_type' => $p->payment_type ?? $p->metode_pembayaran ?? 'Manual',
                    'metode_pembayaran' => $p->metode_pembayaran ?? 'manual',
                    'transaction_status' => $p->transaction_status ?? 'settlement',
                    'waktu' => $p->created_at ? Carbon::parse($p->created_at)->locale('id')->diffForHumans() : '-',
                    'tanggal' => $p->created_at ? Carbon::parse($p->created_at)->locale('id')->translatedFormat('j M Y, H:i') : '-',
                ];
            });

        $pengembalianTerbaru = Pengembalian::with(['sewa.customer', 'user', 'details.sewaDetail.barang'])
            ->orderByDesc('created_at')
            ->limit(6)
            ->get()
            ->map(function ($pg) {
                return [
                    'id' => $pg->id,
                    'no_sewa' => $pg->sewa?->no_sewa ?? '-',
                    'customer' => $pg->sewa?->customer?->nama_lengkap ?? '-',
                    'tgl_pengembalian' => $pg->tgl_pengembalian ? Carbon::parse($pg->tgl_pengembalian)->locale('id')->translatedFormat('j M Y') : '-',
                    'total_denda' => (float) ($pg->total_denda ?? 0),
                    'status_pembayaran' => $pg->status_pembayaran ?? 'Lunas',
                    'petugas' => $pg->user?->nama_lengkap ?? '-',
                    'items_count' => (int) $pg->details->sum('qty_pengembalian'),
                ];
            });

        $perawatanTerbaru = Perawatan::with(['details.barang', 'user'])
            ->orderByDesc('tgl_perawatan')
            ->limit(5)
            ->get()
            ->map(function ($pr) {
                return [
                    'id' => $pr->id,
                    'tgl_perawatan' => $pr->tgl_perawatan ? Carbon::parse($pr->tgl_perawatan)->locale('id')->translatedFormat('j M Y') : '-',
                    'total_biaya' => (float) ($pr->total_biaya_perawatan ?? 0),
                    'status_pembayaran' => $pr->status_pembayaran ?? 'Belum Lunas',
                    'petugas' => $pr->user?->nama_lengkap ?? '-',
                    'items' => $pr->details->map(fn ($d) => ($d->barang?->nama_barang ?? 'Item').' ('.$d->qty.' unit)')->implode(', '),
                ];
            });

        $pengadaanTerbaru = PengadaanBarang::with(['details.barang'])
            ->orderByDesc('tgl_pengadaan')
            ->limit(5)
            ->get()
            ->map(function ($pd) {
                return [
                    'id' => $pd->id,
                    'tgl_pengadaan' => $pd->tgl_pengadaan ? Carbon::parse($pd->tgl_pengadaan)->locale('id')->translatedFormat('j M Y') : '-',
                    'keterangan' => $pd->keterangan ?? 'Pengadaan Unit Baru',
                    'total_unit' => (int) $pd->details->sum('jumlah'),
                    'items' => $pd->details->map(fn ($d) => ($d->barang?->nama_barang ?? 'Item').' ('.$d->jumlah.' unit)')->implode(', '),
                ];
            });

        // 6. Action Items / Perhatian Owner
        $overdueRentalsList = Sewa::with(['customer', 'details.barang'])
            ->where('status_pembayaran', Sewa::BAYAR_CONFIRMED)
            ->whereDoesntHave('pengembalians')
            ->whereDate('tgl_akhir_sewa', '<', $now->toDateString())
            ->orderBy('tgl_akhir_sewa')
            ->limit(5)
            ->get()
            ->map(function ($s) use ($now) {
                $days = Carbon::parse($s->tgl_akhir_sewa)->diffInDays($now);

                return [
                    'id' => $s->id,
                    'no_sewa' => $s->no_sewa,
                    'customer' => $s->customer?->nama_lengkap ?? '-',
                    'no_hp' => $s->customer?->no_hp ?? '-',
                    'tgl_akhir' => $s->tgl_akhir_sewa ? Carbon::parse($s->tgl_akhir_sewa)->locale('id')->translatedFormat('j M Y') : '-',
                    'hari_terlambat' => (int) $days,
                    'status_sewa' => $s->status_sewa,
                    'total_biaya' => (float) ($s->total_biaya ?? 0),
                    'items' => $s->details->map(fn ($d) => $d->barang?->nama_barang ?? 'Item')->implode(', '),
                ];
            });

        $pendingPaymentsList = Sewa::with('customer')
            ->where('status_pembayaran', Sewa::BAYAR_PENDING)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(function ($s) {
                return [
                    'id' => $s->id,
                    'no_sewa' => $s->no_sewa,
                    'customer' => $s->customer?->nama_lengkap ?? '-',
                    'total_biaya' => (float) ($s->total_biaya ?? 0),
                    'tgl_sewa' => $s->tgl_sewa ? Carbon::parse($s->tgl_sewa)->locale('id')->translatedFormat('j M Y') : '-',
                    'asal_pesanan' => $s->asal_pesanan ?? 'admin',
                ];
            });

        $unpaidFinesList = Pengembalian::with(['sewa.customer'])
            ->where('status_pembayaran', 'Belum Lunas')
            ->where('total_denda', '>', 0)
            ->orderByDesc('tgl_pengembalian')
            ->limit(5)
            ->get()
            ->map(function ($pg) {
                return [
                    'id' => $pg->id,
                    'no_sewa' => $pg->sewa?->no_sewa ?? '-',
                    'customer' => $pg->sewa?->customer?->nama_lengkap ?? '-',
                    'no_hp' => $pg->sewa?->customer?->no_hp ?? '-',
                    'total_denda' => (float) ($pg->total_denda ?? 0),
                    'tgl_pengembalian' => $pg->tgl_pengembalian ? Carbon::parse($pg->tgl_pengembalian)->locale('id')->translatedFormat('j M Y') : '-',
                ];
            });

        // Top Rented Gear & Category breakdown for compatibility & insights
        $kategoriList = Kategori::all();
        $chartKategori = ['labels' => [], 'series' => []];
        $totalSewaDetail = SewaDetail::count();

        foreach ($kategoriList as $kat) {
            $count = (int) SewaDetail::whereHas('barang', fn ($q) => $q->where('id_kategori', $kat->id))->sum('qty');
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

        $chartAsalPesanan = [
            'labels' => ['Online Web', 'Kasir Admin'],
            'series' => [
                Sewa::where('asal_pesanan', Sewa::ASAL_WEB)->count(),
                Sewa::where(function ($q) {
                    $q->where('asal_pesanan', Sewa::ASAL_ADMIN)->orWhereNull('asal_pesanan');
                })->count(),
            ],
        ];

        return [
            'filter' => [
                'periode' => $periode,
                'start_date' => $sDate,
                'end_date' => $eDate,
                'label' => $periodeLabel,
            ],
            'ringkasanBisnis' => [
                'total_pemasukan' => $pemasukan,
                'total_pengeluaran' => $pengeluaran,
                'profit' => $profit,
                'total_piutang_belum_lunas' => $totalPiutangBelum,
                'pemasukan_growth' => $pemasukanGrowth,
                'pengeluaran_growth' => $pengeluaranGrowth,
                'profit_growth' => $profitGrowth,
                'profit_margin' => $profitMargin,
                'piutang_count' => $piutangCount,
            ],
            'operasional' => [
                'total_sewa' => $totalSewaPeriode,
                'sewa_berjalan' => $sewaBerjalan,
                'sewa_terlambat' => $sewaTerlambat,
                'menunggu_konfirmasi' => $menungguKonfirmasi,
                'pengembalian_belum_selesai' => $pengembalianBelumSelesai,
            ],
            'inventaris' => [
                'total_jenis_barang' => $totalJenisBarang,
                'total_stok_unit' => $totalStokUnit,
                'stok_tersedia' => $stokTersedia,
                'sedang_disewa' => $sedangDisewa,
                'dalam_perawatan' => $dalamPerawatan,
                'stok_rendah_count' => $stokRendahCount,
                'utilisasi_persen' => $utilisasiPersen,
                'barang_stok_rendah' => $barangStokRendah,
            ],
            'keuangan' => [
                'saldo_rekening' => $saldoRekening,
                'total_saldo_rekening' => $totalSaldoRekening,
                'chart_periode' => $chartPeriode,
                'chart_bulanan' => $chartBulanan,
            ],
            'aktivitas' => [
                'sewa_terbaru' => $sewaTerbaru,
                'pembayaran_terbaru' => $pembayaranTerbaru,
                'pengembalian_terbaru' => $pengembalianTerbaru,
                'perawatan_terbaru' => $perawatanTerbaru,
                'pengadaan_terbaru' => $pengadaanTerbaru,
            ],
            'actionItems' => [
                'overdue_rentals' => $overdueRentalsList,
                'pending_payments' => $pendingPaymentsList,
                'unpaid_fines' => $unpaidFinesList,
            ],
            // Kompatibilitas props sebelumnya
            'stats' => [
                'total_pendapatan' => $pemasukan,
                'total_pengeluaran' => $pengeluaran,
                'laba_bersih' => $profit,
                'sewa_aktif' => $sewaBerjalan,
                'sewa_bulan_ini' => $totalSewaPeriode,
                'sewa_web_count' => $chartAsalPesanan['series'][0],
                'sewa_admin_count' => $chartAsalPesanan['series'][1],
                'total_barang' => $totalJenisBarang,
                'stok_kritis' => $stokRendahCount,
                'unit_dalam_perawatan' => $dalamPerawatan,
                'piutang_belum' => $totalPiutangBelum,
            ],
            'chartKeuangan' => $chartBulanan,
            'chartKategori' => $chartKategori,
            'chartAsalPesanan' => $chartAsalPesanan,
            'sewaTerbaru' => $sewaTerbaru,
            'topBarang' => $barangStokRendah,
            'jatuhTempo' => $overdueRentalsList,
        ];
    }

    private function buildChartForPeriod(string $periode, Carbon $start, Carbon $end): array
    {
        $categories = [];
        $pemasukan = [];
        $pengeluaran = [];
        $profit = [];

        if ($periode === 'hari_ini') {
            // Group by hours
            $hours = [
                ['00:00 - 06:00', '00:00:00', '05:59:59'],
                ['06:00 - 10:00', '06:00:00', '09:59:59'],
                ['10:00 - 14:00', '10:00:00', '13:59:59'],
                ['14:00 - 18:00', '14:00:00', '17:59:59'],
                ['18:00 - 21:00', '18:00:00', '20:59:59'],
                ['21:00 - 24:00', '21:00:00', '23:59:59'],
            ];

            foreach ($hours as $slot) {
                $categories[] = $slot[0];
                $sDt = $start->toDateString().' '.$slot[1];
                $eDt = $start->toDateString().' '.$slot[2];

                $p = (float) Pemasukan::whereBetween('created_at', [$sDt, $eDt])->sum('nominal');
                $e = (float) Pengeluaran::whereBetween('created_at', [$sDt, $eDt])->sum('nominal');

                $pemasukan[] = (int) $p;
                $pengeluaran[] = (int) $e;
                $profit[] = (int) ($p - $e);
            }
        } elseif ($periode === 'minggu_ini') {
            // 7 days of this week
            for ($d = 0; $d < 7; $d++) {
                $day = $start->copy()->addDays($d);
                $categories[] = $day->locale('id')->translatedFormat('D, j M');
                $dateStr = $day->toDateString();

                $p = (float) Pemasukan::whereDate('tgl_pemasukan', $dateStr)->sum('nominal');
                $e = (float) Pengeluaran::whereDate('tgl_pengeluaran', $dateStr)->sum('nominal');

                $pemasukan[] = (int) $p;
                $pengeluaran[] = (int) $e;
                $profit[] = (int) ($p - $e);
            }
        } elseif ($periode === 'tahun_ini') {
            // 12 months
            for ($m = 1; $m <= 12; $m++) {
                $monthDate = Carbon::create($start->year, $m, 1);
                $categories[] = $monthDate->locale('id')->translatedFormat('M');
                $startM = $monthDate->copy()->startOfMonth()->toDateString();
                $endM = $monthDate->copy()->endOfMonth()->toDateString();

                $p = (float) Pemasukan::whereBetween('tgl_pemasukan', [$startM, $endM])->sum('nominal');
                $e = (float) Pengeluaran::whereBetween('tgl_pengeluaran', [$startM, $endM])->sum('nominal');

                $pemasukan[] = (int) $p;
                $pengeluaran[] = (int) $e;
                $profit[] = (int) ($p - $e);
            }
        } else {
            // bulan_ini & custom: split into 4-5 weekly segments
            $diffDays = max(1, $start->diffInDays($end));
            $segments = $diffDays <= 7 ? $diffDays : 4;
            $step = ceil($diffDays / $segments);

            for ($i = 0; $i < $segments; $i++) {
                $segStart = $start->copy()->addDays($i * $step);
                if ($segStart->greaterThan($end)) {
                    break;
                }
                $segEnd = $start->copy()->addDays(($i + 1) * $step - 1);
                if ($segEnd->greaterThan($end) || $i === $segments - 1) {
                    $segEnd = $end->copy();
                }

                if ($diffDays <= 7) {
                    $label = $segStart->locale('id')->translatedFormat('D, j M');
                } else {
                    $label = 'Mgg '.($i + 1).' ('.$segStart->format('j').'-'.$segEnd->locale('id')->translatedFormat('j M').')';
                }

                $categories[] = $label;

                $p = (float) Pemasukan::whereBetween('tgl_pemasukan', [$segStart->toDateString(), $segEnd->toDateString()])->sum('nominal');
                $e = (float) Pengeluaran::whereBetween('tgl_pengeluaran', [$segStart->toDateString(), $segEnd->toDateString()])->sum('nominal');

                $pemasukan[] = (int) $p;
                $pengeluaran[] = (int) $e;
                $profit[] = (int) ($p - $e);
            }
        }

        return [
            'categories' => $categories,
            'pemasukan' => $pemasukan,
            'pengeluaran' => $pengeluaran,
            'profit' => $profit,
        ];
    }
}
