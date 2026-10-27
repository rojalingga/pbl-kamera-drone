<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\KategoriTransaksi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class KategoriTransaksiController extends Controller
{
    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        if (($request->has('datatable') || $request->wantsJson() || ($request->ajax() && $request->has('draw'))) && ! $request->header('X-Inertia')) {
            $data = KategoriTransaksi::orderByDesc('id');

            return DataTables::of($data)->escapeColumns([])
                ->addIndexColumn()
                ->addColumn('action', function ($row) use ($permissions) {
                    $btn = '<div class="d-flex justify-content-center">';

                    if ($permissions['edit']) {
                        $btn .= '<button class="btn btn-primary btn-sm mx-1 edit-button" data-id="'.e($row->id).'" data-url="'.e(route('kategori-transaksi.edit', $row->id)).'">Edit</button>';
                    }

                    if ($permissions['hapus']) {
                        $btn .= '<form action="'.e(route('kategori-transaksi.destroy', $row->id)).'" method="POST" style="display:inline;">'
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

        return Inertia::render('Admin/MasterData/KategoriTransaksi/Index', compact('permissions'));
    }

    public function edit($id)
    {
        $data = KategoriTransaksi::findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'kategori' => 'required|string|max:100',
            'jenis' => 'required|string|max:50|in:Pemasukan,Pengeluaran',
        ], [
            'kategori.required' => 'Kategori wajib diisi.',
            'jenis.required' => 'Jenis wajib diisi.',
            'jenis.in' => 'Jenis harus Pemasukan atau Pengeluaran.',
        ]);

        DB::beginTransaction();
        try {
            KategoriTransaksi::create($request->only('kategori', 'jenis'));

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating kategori transaksi: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $data = KategoriTransaksi::findOrFail($id);

        $request->validate([
            'kategori' => 'required|string|max:100',
            'jenis' => 'required|string|max:50|in:Pemasukan,Pengeluaran',
        ], [
            'kategori.required' => 'Kategori wajib diisi.',
            'jenis.required' => 'Jenis wajib diisi.',
        ]);

        DB::beginTransaction();
        try {
            $data->update($request->only('kategori', 'jenis'));

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating kategori transaksi: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $data = KategoriTransaksi::findOrFail($id);

        DB::beginTransaction();
        try {
            $data->delete();

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting kategori transaksi: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }
}
