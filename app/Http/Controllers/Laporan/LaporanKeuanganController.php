<?php

namespace App\Http\Controllers\Laporan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\Rekening;
use App\Models\RiwayatSaldo;
use App\Services\LaporanExportService;
use App\Services\RiwayatSaldoService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class LaporanKeuanganController extends Controller
{
    public function __construct(private LaporanExportService $ekspor) {}

    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();
        $rekenings = Rekening::orderBy('nama_rek')->get(['id', 'nama_rek']);

        return Inertia::render('Admin/Laporan/Keuangan/Index', compact('permissions', 'rekenings'));
    }

    public function data(Request $request)
    {
        $request->validate([
            'tanggal_awal' => 'nullable|date',
            'tanggal_akhir' => 'nullable|date|after_or_equal:tanggal_awal',
            'id_rekening' => 'nullable|integer|exists:rekening,id',
        ], [
            'tanggal_akhir.after_or_equal' => 'Tanggal akhir tidak boleh sebelum tanggal awal.',
            'id_rekening.exists' => 'Rekening tidak valid.',
        ]);

        $awal = $request->tanggal_awal;
        $akhir = $request->tanggal_akhir;

        $riwayats = RiwayatSaldo::with(['rekening', 'pemasukan.kategoriTransaksi', 'pengeluaran.kategoriTransaksi'])
            ->when($awal, fn ($query) => $query->whereDate('tanggal', '>=', $awal))
            ->when($akhir, fn ($query) => $query->whereDate('tanggal', '<=', $akhir))
            ->when($request->filled('id_rekening'), fn ($query) => $query->where('id_rekening', $request->id_rekening))
            ->orderBy('tanggal')
            ->orderBy('id')
            ->get();

        $totalMasuk = (float) $riwayats->where('jenis', RiwayatSaldoService::MASUK)->sum('nominal');
        $totalKeluar = (float) $riwayats->where('jenis', RiwayatSaldoService::KELUAR)->sum('nominal');

        $rows = $riwayats->map(function ($row) {
            $isMasuk = $row->jenis === RiwayatSaldoService::MASUK;
            $pemasukan = $row->pemasukan;
            $pengeluaran = $row->pengeluaran;

            return [
                'tanggal' => $row->tanggal ? Carbon::parse($row->tanggal)->locale('id')->translatedFormat('j F Y') : '-',
                'jenis' => $isMasuk ? 'Pemasukan' : 'Pengeluaran',
                'kategori' => $pemasukan?->kategoriTransaksi?->kategori ?? $pengeluaran?->kategoriTransaksi?->kategori ?? '-',
                'rekening' => $row->rekening?->nama_rek ?? '-',
                'nominal' => number_format((float) ($row->nominal ?? 0), 0, ',', '.'),
                'saldo' => number_format((float) ($row->saldo ?? 0), 0, ',', '.'),
            ];
        })->values();

        return response()->json([
            'draw' => (int) $request->input('draw', 1),
            'recordsTotal' => $rows->count(),
            'recordsFiltered' => $rows->count(),
            'data' => $rows,
            'total_masuk' => $totalMasuk,
            'total_keluar' => $totalKeluar,
            'saldo' => $totalMasuk - $totalKeluar,
        ]);
    }

    public function cetakExcel(Request $request)
    {
        [$kepala, $baris] = $this->barisLaporan($request);

        return $this->ekspor->excel('laporan-arus-kas', 'Laporan Arus Kas', $kepala, $baris);
    }

    public function cetakPdf(Request $request)
    {
        [$kepala, $baris] = $this->barisLaporan($request);

        return $this->ekspor->pdf('laporan-arus-kas', 'Laporan Arus Kas', $kepala, $baris, $this->subjudul($request));
    }

    private function barisLaporan(Request $request): array
    {
        $request->validate([
            'tanggal_awal' => 'nullable|date',
            'tanggal_akhir' => 'nullable|date|after_or_equal:tanggal_awal',
            'id_rekening' => 'nullable|integer|exists:rekening,id',
        ], [
            'tanggal_akhir.after_or_equal' => 'Tanggal akhir tidak boleh sebelum tanggal awal.',
            'id_rekening.exists' => 'Rekening tidak valid.',
        ]);

        $rows = RiwayatSaldo::with(['rekening', 'pemasukan.kategoriTransaksi', 'pengeluaran.kategoriTransaksi'])
            ->when($request->filled('tanggal_awal'), fn ($query) => $query->whereDate('tanggal', '>=', $request->tanggal_awal))
            ->when($request->filled('tanggal_akhir'), fn ($query) => $query->whereDate('tanggal', '<=', $request->tanggal_akhir))
            ->when($request->filled('id_rekening'), fn ($query) => $query->where('id_rekening', $request->id_rekening))
            ->orderBy('tanggal')
            ->orderBy('id')
            ->get();

        $kepala = ['Tanggal', 'Jenis', 'Kategori', 'Rekening', 'Nominal', 'Saldo'];

        $baris = $rows->map(function ($row) {
            $isMasuk = $row->jenis === RiwayatSaldoService::MASUK;
            $pemasukan = $row->pemasukan;
            $pengeluaran = $row->pengeluaran;

            return [
                $row->tanggal ? Carbon::parse($row->tanggal)->locale('id')->translatedFormat('j F Y') : '-',
                $isMasuk ? 'Pemasukan' : 'Pengeluaran',
                $pemasukan?->kategoriTransaksi?->kategori ?? $pengeluaran?->kategoriTransaksi?->kategori ?? '-',
                $row->rekening?->nama_rek ?? '-',
                number_format((float) ($row->nominal ?? 0), 0, ',', '.'),
                number_format((float) ($row->saldo ?? 0), 0, ',', '.'),
            ];
        })->all();

        return [$kepala, $baris];
    }

    private function subjudul(Request $request): ?string
    {
        $bagian = [];

        if ($request->filled('tanggal_awal') || $request->filled('tanggal_akhir')) {
            $bagian[] = 'Periode: '.($request->tanggal_awal ?? '-').' s/d '.($request->tanggal_akhir ?? '-');
        }

        if ($request->filled('id_rekening')) {
            $bagian[] = 'Rekening: '.(Rekening::find($request->id_rekening)?->nama_rek ?? '-');
        }

        return $bagian === [] ? null : implode(' | ', $bagian);
    }
}
