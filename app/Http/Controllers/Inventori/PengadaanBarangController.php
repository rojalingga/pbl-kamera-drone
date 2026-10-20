<?php

namespace App\Http\Controllers\Inventori;

use App\Exceptions\StokTidakCukupException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\Barang;
use App\Models\PengadaanBarang;
use App\Models\PengadaanBarangDetail;
use App\Services\RiwayatStokService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class PengadaanBarangController extends Controller
{
    public function __construct(private RiwayatStokService $stok) {}

    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        if (($request->has('datatable') || $request->wantsJson() || ($request->ajax() && $request->has('draw'))) && ! $request->header('X-Inertia')) {
            $data = PengadaanBarang::with('details.barang')->orderByDesc('id');

            return DataTables::of($data)->escapeColumns([])
                ->addIndexColumn()
                ->editColumn('tgl_pengadaan', fn ($row) => $row->tgl_pengadaan ? Carbon::parse($row->tgl_pengadaan)->locale('id')->translatedFormat('j F Y') : '-')
                ->addColumn('jumlah_item', fn ($row) => $row->details->count())
                ->addColumn('total_unit', fn ($row) => (int) $row->details->sum('jumlah'))
                ->addColumn('barang_list', fn ($row) => $row->details
                    ->map(fn ($detail) => ($detail->barang?->nama_barang ?? '-').' ('.$detail->jumlah.')')
                    ->join(', '))
                ->addColumn('action', function ($row) use ($permissions) {
                    $btn = '<div class="d-flex justify-content-center">';

                    if ($permissions['edit']) {
                        $btn .= '<button class="btn btn-primary btn-sm mx-1 edit-button" data-id="'.e($row->id).'" data-url="'.e(route('pengadaan-barang.edit', $row->id)).'">Edit</button>';
                    }

                    if ($permissions['hapus']) {
                        $btn .= '<form action="'.e(route('pengadaan-barang.destroy', $row->id)).'" method="POST" style="display:inline;">'
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

        return Inertia::render('Admin/Inventori/PengadaanBarang/Index', [
            'permissions' => $permissions,
            'barangs' => Barang::orderBy('nama_barang')->get(['id', 'nama_barang', 'stok', 'harga_sewa']),
        ]);
    }

    public function edit($id)
    {
        $data = PengadaanBarang::with('details')->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $data->id,
                'tgl_pengadaan' => $data->tgl_pengadaan?->format('Y-m-d'),
                'keterangan' => $data->keterangan,
                'details' => $data->details->map(fn ($detail) => [
                    'id_barang' => (string) $detail->id_barang,
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
            $pengadaan = PengadaanBarang::create([
                'tgl_pengadaan' => $request->tgl_pengadaan,
                'keterangan' => $request->keterangan,
            ]);

            foreach ($request->details as $detail) {
                $detailBaru = PengadaanBarangDetail::create([
                    'id_pengadaan_barang' => $pengadaan->id,
                    'id_barang' => $detail['id_barang'],
                    'jumlah' => (int) $detail['jumlah'],
                ]);

                $this->stok->tambah($detail['id_barang'], (int) $detail['jumlah'], RiwayatStokService::MASUK, [
                    'id_pengadaan_barang_detail' => $detailBaru->id,
                ]);
            }

            DB::commit();

            return response()->json(['status' => 'success', 'id' => $pengadaan->id]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating pengadaan barang: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $pengadaan = PengadaanBarang::with('details')->findOrFail($id);

        $this->validasi($request);

        DB::beginTransaction();
        try {

            foreach ($pengadaan->details as $detailLama) {
                $this->stok->batalkanMasuk($detailLama->id_barang, (int) $detailLama->jumlah, [
                    'id_pengadaan_barang_detail' => $detailLama->id,
                ]);
            }

            PengadaanBarangDetail::where('id_pengadaan_barang', $pengadaan->id)->delete();

            foreach ($request->details as $detail) {
                $detailBaru = PengadaanBarangDetail::create([
                    'id_pengadaan_barang' => $pengadaan->id,
                    'id_barang' => $detail['id_barang'],
                    'jumlah' => (int) $detail['jumlah'],
                ]);

                $this->stok->tambah($detail['id_barang'], (int) $detail['jumlah'], RiwayatStokService::MASUK, [
                    'id_pengadaan_barang_detail' => $detailBaru->id,
                ]);
            }

            $pengadaan->update([
                'tgl_pengadaan' => $request->tgl_pengadaan,
                'keterangan' => $request->keterangan,
            ]);

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (StokTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating pengadaan barang: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $pengadaan = PengadaanBarang::with('details')->findOrFail($id);

        DB::beginTransaction();
        try {
            foreach ($pengadaan->details as $detail) {
                $this->stok->batalkanMasuk($detail->id_barang, (int) $detail->jumlah, [
                    'id_pengadaan_barang_detail' => $detail->id,
                ]);
            }

            PengadaanBarangDetail::where('id_pengadaan_barang', $pengadaan->id)->delete();
            $pengadaan->delete();

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (StokTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting pengadaan barang: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    private function validasi(Request $request): void
    {
        $request->validate([
            'tgl_pengadaan' => 'required|date',
            'keterangan' => 'nullable|string|max:255',
            'details' => 'required|array|min:1',
            'details.*.id_barang' => 'required|string|exists:barang,id',
            'details.*.jumlah' => 'required|integer|min:1',
        ], [
            'tgl_pengadaan.required' => 'Tanggal pengadaan wajib diisi.',
            'tgl_pengadaan.date' => 'Tanggal pengadaan tidak valid.',
            'details.required' => 'Minimal harus ada 1 item barang.',
            'details.min' => 'Minimal harus ada 1 item barang.',
            'details.array' => 'Item barang tidak valid.',
            'details.*.id_barang.required' => 'Barang wajib dipilih.',
            'details.*.id_barang.exists' => 'Barang tidak valid.',
            'details.*.jumlah.required' => 'Jumlah wajib diisi.',
            'details.*.jumlah.integer' => 'Jumlah harus berupa angka.',
            'details.*.jumlah.min' => 'Jumlah minimal 1.',
        ]);
    }
}
