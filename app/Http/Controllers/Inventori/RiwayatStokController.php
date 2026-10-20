<?php

namespace App\Http\Controllers\Inventori;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\Barang;
use App\Models\RiwayatStok;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class RiwayatStokController extends Controller
{
    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        if (($request->has('datatable') || $request->wantsJson() || ($request->ajax() && $request->has('draw'))) && ! $request->header('X-Inertia')) {
            $data = Barang::with(['merk', 'kategori'])->orderBy('nama_barang');

            return DataTables::of($data)->escapeColumns([])
                ->addIndexColumn()
                ->editColumn('merk', fn ($row) => $row->merk?->merk ?? '-')
                ->editColumn('kategori', fn ($row) => $row->kategori?->kategori ?? '-')
                ->make(true);
        }

        return Inertia::render('Admin/Inventori/RiwayatStok/Index', compact('permissions'));
    }

    public function data(Request $request)
    {
        $request->validate([
            'id_barang' => 'required|string|exists:barang,id',
        ], [
            'id_barang.required' => 'Barang wajib dipilih.',
            'id_barang.exists' => 'Barang tidak valid.',
        ]);

        $data = RiwayatStok::where('id_barang', $request->id_barang)
            ->orderByDesc('id')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'tanggal' => $row->tanggal ? Carbon::parse($row->tanggal)->locale('id')->translatedFormat('j F Y') : ($row->created_at ? Carbon::parse($row->created_at)->locale('id')->translatedFormat('j F Y H:i') : '-'),
                'jenis' => $row->jenis,
                'sumber' => $this->sumberLabel($row),
                'jumlah' => $row->jumlah,
                'stok' => $row->stok,
            ]);

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    private function sumberLabel(RiwayatStok $riwayat): string
    {
        if (! empty($riwayat->id_pengadaan_barang_detail)) {
            return 'Pengadaan Barang';
        }

        if (! empty($riwayat->id_sewa_detail)) {
            return 'Sewa';
        }

        if (! empty($riwayat->id_pengembalian_detail)) {
            return 'Pengembalian';
        }

        if (! empty($riwayat->id_perawatan_detail)) {
            return 'Perawatan';
        }

        if (! empty($riwayat->id_pembelian_unit_detail)) {
            return 'Pembelian Unit';
        }

        return '-';
    }
}
