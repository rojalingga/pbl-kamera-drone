<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\Rekening;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class RekeningController extends Controller
{
    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        if (($request->has('datatable') || $request->wantsJson() || ($request->ajax() && $request->has('draw'))) && ! $request->header('X-Inertia')) {
            $data = Rekening::orderBy('id');

            return DataTables::of($data)->escapeColumns([])
                ->addIndexColumn()
                ->editColumn('saldo', fn ($row) => number_format((float) ($row->saldo ?? 0), 0, ',', '.'))
                ->addColumn('action', function ($row) use ($permissions) {
                    $btn = '<div class="d-flex justify-content-center">';

                    if ($permissions['edit']) {
                        $btn .= '<button class="btn btn-primary btn-sm mx-1 edit-button" data-id="'.e($row->id).'" data-url="'.e(route('rekening.edit', $row->id)).'">Edit</button>';
                    }

                    $btn .= '</div>';

                    return $btn;
                })
                ->rawColumns(['action'])
                ->make(true);
        }

        return Inertia::render('Admin/MasterData/Rekening/Index', compact('permissions'));
    }

    public function edit($id)
    {
        $data = Rekening::findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama_rek' => 'required|string|max:100',
            'no_rek' => 'nullable|string|max:100',
            'pemilik_rek' => 'nullable|string|max:100',
        ], [
            'nama_rek.required' => 'Nama rekening wajib diisi.',
            'nama_rek.max' => 'Nama rekening maksimal 100 karakter.',
            'no_rek.max' => 'Nomor rekening maksimal 100 karakter.',
            'pemilik_rek.max' => 'Pemilik rekening maksimal 100 karakter.',
        ]);

        DB::beginTransaction();
        try {
            Rekening::create([
                'nama_rek' => $request->nama_rek,
                'no_rek' => $request->no_rek,
                'pemilik_rek' => $request->pemilik_rek,
                'saldo' => 0,
            ]);

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating rekening: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $data = Rekening::findOrFail($id);

        $request->validate([
            'nama_rek' => 'required|string|max:100',
            'no_rek' => 'nullable|string|max:100',
            'pemilik_rek' => 'nullable|string|max:100',
        ], [
            'nama_rek.required' => 'Nama rekening wajib diisi.',
            'nama_rek.max' => 'Nama rekening maksimal 100 karakter.',
            'no_rek.max' => 'Nomor rekening maksimal 100 karakter.',
            'pemilik_rek.max' => 'Pemilik rekening maksimal 100 karakter.',
        ]);

        DB::beginTransaction();
        try {
            $data->update($request->only('nama_rek', 'no_rek', 'pemilik_rek'));

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating rekening: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $data = Rekening::findOrFail($id);

        DB::beginTransaction();
        try {
            $data->delete();

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting rekening: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }
}
