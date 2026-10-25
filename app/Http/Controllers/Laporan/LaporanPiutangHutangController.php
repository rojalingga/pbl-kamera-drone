<?php

namespace App\Http\Controllers\Laporan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\Piutang;
use App\Services\LaporanExportService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class LaporanPiutangHutangController extends Controller
{
    public function __construct(private LaporanExportService $ekspor) {}

    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        return Inertia::render('Admin/Laporan/PiutangHutang/Index', compact('permissions'));
    }

    public function dataPiutang(Request $request)
    {
        $data = Piutang::with('pengembalian.sewa.customer')
            ->when($request->filled('status') && $request->status === 'lunas', fn ($query) => $query->whereRaw('terbayar >= nominal'))
            ->when($request->filled('status') && $request->status === 'belum', fn ($query) => $query->whereRaw('terbayar < nominal'))
            ->when($request->filled('tanggal_akhir'), fn ($query) => $query->whereDate('tgl_piutang', '<=', $request->tanggal_akhir))
            ->orderByDesc('id');

        return DataTables::of($data)->escapeColumns([])
            ->addIndexColumn()
            ->editColumn('tgl_piutang', fn ($row) => $row->tgl_piutang ? Carbon::parse($row->tgl_piutang)->locale('id')->translatedFormat('j F Y') : '-')
            ->addColumn('customer', fn ($row) => $row->pengembalian?->sewa?->customer?->nama_lengkap ?? '-')
            ->editColumn('nominal', fn ($row) => number_format((float) ($row->nominal ?? 0), 0, ',', '.'))
            ->editColumn('terbayar', fn ($row) => number_format((float) ($row->terbayar ?? 0), 0, ',', '.'))
            ->addColumn('sisa', fn ($row) => number_format(max(0, $row->nominal - ($row->terbayar ?? 0)), 0, ',', '.'))
            ->addColumn('status', fn ($row) => ($row->terbayar ?? 0) >= $row->nominal ? 'Lunas' : 'Belum Lunas')
            ->addColumn('tgl_pelunasan', fn ($row) => $row->tgl_pelunasan ? Carbon::parse($row->tgl_pelunasan)->locale('id')->translatedFormat('j F Y') : '-')
            ->make(true);
    }

    public function cetakExcel(Request $request)
    {
        [$kepala, $baris] = $this->barisLaporan($request);

        return $this->ekspor->excel('laporan-piutang', 'Laporan Piutang', $kepala, $baris);
    }

    public function cetakPdf(Request $request)
    {
        [$kepala, $baris] = $this->barisLaporan($request);

        return $this->ekspor->pdf('laporan-piutang', 'Laporan Piutang', $kepala, $baris, $this->subjudul($request));
    }

    private function barisLaporan(Request $request): array
    {
        $rows = Piutang::with('pengembalian.sewa.customer')
            ->when($request->filled('status') && $request->status === 'lunas', fn ($query) => $query->whereRaw('terbayar >= nominal'))
            ->when($request->filled('status') && $request->status === 'belum', fn ($query) => $query->whereRaw('terbayar < nominal'))
            ->when($request->filled('tanggal_akhir'), fn ($query) => $query->whereDate('tgl_piutang', '<=', $request->tanggal_akhir))
            ->orderByDesc('id')
            ->get();

        $kepala = ['Tanggal', 'Customer', 'Nominal', 'Terbayar', 'Sisa', 'Status', 'Tgl. Pelunasan'];

        $baris = $rows->map(fn ($row) => [
            $row->tgl_piutang ? Carbon::parse($row->tgl_piutang)->locale('id')->translatedFormat('j F Y') : '-',
            $row->pengembalian?->sewa?->customer?->nama_lengkap ?? '-',
            number_format((float) ($row->nominal ?? 0), 0, ',', '.'),
            number_format((float) ($row->terbayar ?? 0), 0, ',', '.'),
            number_format(max(0, $row->nominal - ($row->terbayar ?? 0)), 0, ',', '.'),
            ($row->terbayar ?? 0) >= $row->nominal ? 'Lunas' : 'Belum Lunas',
            $row->tgl_pelunasan ? Carbon::parse($row->tgl_pelunasan)->locale('id')->translatedFormat('j F Y') : '-',
        ])->all();

        return [$kepala, $baris];
    }

    private function subjudul(Request $request): ?string
    {
        $bagian = [];

        if ($request->filled('status')) {
            $bagian[] = 'Status: '.($request->status === 'lunas' ? 'Lunas' : 'Belum Lunas');
        }

        if ($request->filled('tanggal_akhir')) {
            $bagian[] = 'Sampai: '.$request->tanggal_akhir;
        }

        return $bagian === [] ? null : implode(' | ', $bagian);
    }
}
