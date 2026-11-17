<?php

namespace App\Http\Controllers\Keuangan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\Piutang;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class PiutangController extends Controller
{
    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        if (($request->has('datatable') || $request->wantsJson() || ($request->ajax() && $request->has('draw'))) && ! $request->header('X-Inertia')) {
            $data = Piutang::with('pengembalian.sewa.customer')->orderByDesc('id');

            return DataTables::of($data)->escapeColumns([])
                ->addIndexColumn()
                ->editColumn('tgl_piutang', fn ($row) => $row->tgl_piutang ? Carbon::parse($row->tgl_piutang)->locale('id')->translatedFormat('j F Y') : '-')
                ->editColumn('tgl_pelunasan', fn ($row) => $row->tgl_pelunasan ? Carbon::parse($row->tgl_pelunasan)->locale('id')->translatedFormat('j F Y') : '-')
                ->editColumn('nominal', fn ($row) => number_format((float) ($row->nominal ?? 0), 0, ',', '.'))
                ->editColumn('terbayar', fn ($row) => number_format((float) ($row->terbayar ?? 0), 0, ',', '.'))
                ->addColumn('sisa', fn ($row) => number_format(max(0, $row->nominal - ($row->terbayar ?? 0)), 0, ',', '.'))
                ->addColumn('status', fn ($row) => ($row->terbayar ?? 0) >= $row->nominal
                    ? '<span class="badge bg-success">Lunas</span>'
                    : '<span class="badge bg-danger">Belum Lunas</span>')
                ->addColumn('action', function ($row) use ($permissions) {
                    $btn = '<div class="d-flex justify-content-center">';

                    if ($permissions['edit']) {
                        $btn .= '<button class="btn btn-primary btn-sm mx-1 edit-button" data-id="'.e($row->id).'" data-url="'.e(route('piutang.edit', $row->id)).'">Edit</button>';
                    }

                    $btn .= '</div>';

                    return $btn;
                })
                ->rawColumns(['action', 'status'])
                ->make(true);
        }

        return Inertia::render('Admin/Keuangan/Piutang/Index', compact('permissions'));
    }

    public function edit($id)
    {
        $data = Piutang::with('pengembalian.sewa.customer')->findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'tgl_piutang' => 'required|date',
            'nominal' => 'required|numeric|min:0',
            'id_pengembalian' => 'nullable|integer|exists:pengembalian,id',
            'terbayar' => 'nullable|numeric|min:0',
            'tgl_pelunasan' => 'nullable|date',
        ], [
            'tgl_piutang.required' => 'Tanggal piutang wajib diisi.',
            'nominal.required' => 'Nominal wajib diisi.',
        ]);

        DB::beginTransaction();
        try {
            Piutang::create($request->only('tgl_piutang', 'nominal', 'id_pengembalian', 'terbayar', 'tgl_pelunasan'));

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating piutang: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $data = Piutang::findOrFail($id);

        $request->validate([
            'tgl_piutang' => 'required|date',
            'nominal' => 'required|numeric|min:0',
            'terbayar' => 'nullable|numeric|min:0',
            'tgl_pelunasan' => 'nullable|date',
        ], [
            'tgl_piutang.required' => 'Tanggal piutang wajib diisi.',
            'nominal.required' => 'Nominal wajib diisi.',
            'terbayar.min' => 'Terbayar tidak boleh kurang dari 0.',
        ]);

        if ((float) ($request->terbayar ?? 0) > (float) $request->nominal) {
            return response()->json([
                'status' => 'error',
                'error' => 'Pembayaran melebihi nominal piutang.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $db = $request->only('tgl_piutang', 'nominal', 'terbayar', 'tgl_pelunasan');

            if ((float) ($request->terbayar ?? 0) >= (float) $request->nominal) {
                $db['tgl_pelunasan'] = $request->tgl_pelunasan ?: now()->toDateString();
            }

            $data->update($db);

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating piutang: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $data = Piutang::findOrFail($id);

        DB::beginTransaction();
        try {
            $data->delete();

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting piutang: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }
}
