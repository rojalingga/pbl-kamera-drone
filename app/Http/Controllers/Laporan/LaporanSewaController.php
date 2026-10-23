<?php

namespace App\Http\Controllers\Laporan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\Customer;
use App\Models\Sewa;
use App\Services\LaporanExportService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class LaporanSewaController extends Controller
{
    public function __construct(private LaporanExportService $ekspor) {}

    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();
        $customers = Customer::orderBy('nama_lengkap')->get();

        return Inertia::render('Admin/Laporan/Sewa/Index', compact('permissions', 'customers'));
    }

    public function data(Request $request)
    {
        $request->validate([
            'tanggal_awal' => 'nullable|date',
            'tanggal_akhir' => 'nullable|date|after_or_equal:tanggal_awal',
        ], [
            'tanggal_akhir.after_or_equal' => 'Tanggal akhir tidak boleh sebelum tanggal awal.',
        ]);

        $data = Sewa::with(['customer', 'details.barang'])->withExists('pengembalians')
            ->when($request->filled('tanggal_awal'), fn ($query) => $query->whereDate('tgl_sewa', '>=', $request->tanggal_awal))
            ->when($request->filled('tanggal_akhir'), fn ($query) => $query->whereDate('tgl_sewa', '<=', $request->tanggal_akhir))
            ->when($request->filled('id_customer'), fn ($query) => $query->where('id_customer', $request->id_customer))
            ->orderByDesc('id');

        return DataTables::of($data)->escapeColumns([])
            ->addIndexColumn()
            ->addColumn('tanggal', fn ($row) => $row->tgl_sewa ? Carbon::parse($row->tgl_sewa)->locale('id')->translatedFormat('j F Y') : '-')
            ->addColumn('customer', fn ($row) => $row->customer?->nama_lengkap ?? '-')
            ->addColumn('periode', fn ($row) => ($row->tgl_sewa ? Carbon::parse($row->tgl_sewa)->locale('id')->translatedFormat('j F Y') : '-').' s/d '.($row->tgl_akhir_sewa ? Carbon::parse($row->tgl_akhir_sewa)->locale('id')->translatedFormat('j F Y') : '-'))
            ->addColumn('jumlah_item', fn ($row) => $row->details->sum('qty'))
            ->addColumn('total_biaya', fn ($row) => number_format($row->total_biaya ?? 0, 0, ',', '.'))
            ->addColumn('status', fn ($row) => $row->status_sewa)
            ->make(true);
    }

    public function cetakExcel(Request $request)
    {
        [$kepala, $baris] = $this->barisLaporan($request);

        return $this->ekspor->excel('laporan-sewa', 'Laporan Penyewaan', $kepala, $baris);
    }

    public function cetakPdf(Request $request)
    {
        [$kepala, $baris] = $this->barisLaporan($request);

        return $this->ekspor->pdf('laporan-sewa', 'Laporan Penyewaan', $kepala, $baris, $this->subjudul($request));
    }

    private function barisLaporan(Request $request): array
    {
        $this->validasiFilter($request);

        $rows = Sewa::with(['customer', 'details.barang'])->withExists('pengembalians')
            ->when($request->filled('tanggal_awal'), fn ($query) => $query->whereDate('tgl_sewa', '>=', $request->tanggal_awal))
            ->when($request->filled('tanggal_akhir'), fn ($query) => $query->whereDate('tgl_sewa', '<=', $request->tanggal_akhir))
            ->when($request->filled('id_customer'), fn ($query) => $query->where('id_customer', $request->id_customer))
            ->orderByDesc('id')
            ->get();

        $kepala = ['Tanggal', 'Customer', 'Periode', 'Item', 'Total Biaya', 'Status'];

        $baris = $rows->map(fn ($row) => [
            $row->tgl_sewa ? Carbon::parse($row->tgl_sewa)->locale('id')->translatedFormat('j F Y') : '-',
            $row->customer?->nama_lengkap ?? '-',
            ($row->tgl_sewa ? Carbon::parse($row->tgl_sewa)->locale('id')->translatedFormat('j F Y') : '-').' s/d '.($row->tgl_akhir_sewa ? Carbon::parse($row->tgl_akhir_sewa)->locale('id')->translatedFormat('j F Y') : '-'),
            $row->details->sum('qty'),
            number_format($row->total_biaya ?? 0, 0, ',', '.'),
            $row->status_sewa,
        ])->all();

        return [$kepala, $baris];
    }

    private function validasiFilter(Request $request): void
    {
        $request->validate([
            'tanggal_awal' => 'nullable|date',
            'tanggal_akhir' => 'nullable|date|after_or_equal:tanggal_awal',
        ], [
            'tanggal_akhir.after_or_equal' => 'Tanggal akhir tidak boleh sebelum tanggal awal.',
        ]);
    }

    private function subjudul(Request $request): ?string
    {
        $periode = $request->filled('tanggal_awal') || $request->filled('tanggal_akhir')
            ? 'Periode: '.($request->tanggal_awal ?? '-').' s/d '.($request->tanggal_akhir ?? '-')
            : null;

        return $periode;
    }
}
