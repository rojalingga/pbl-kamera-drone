<?php

namespace App\Http\Controllers\Keuangan;

use App\Exceptions\SaldoTidakCukupException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\KategoriTransaksi;
use App\Models\Pengeluaran;
use App\Models\Perawatan;
use App\Models\Rekening;
use App\Services\RiwayatSaldoService;
use App\Services\SupabaseStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class PengeluaranController extends Controller
{
    public function __construct(
        private RiwayatSaldoService $saldo,
        private SupabaseStorageService $storage
    ) {}

    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        if (($request->has('datatable') || $request->wantsJson() || ($request->ajax() && $request->has('draw'))) && ! $request->header('X-Inertia')) {
            $data = Pengeluaran::with(['kategoriTransaksi', 'rekening', 'perawatan'])->orderByDesc('id');

            return DataTables::of($data)->escapeColumns([])
                ->addIndexColumn()
                ->editColumn('tgl_pengeluaran', fn ($row) => $row->tgl_pengeluaran ? Carbon::parse($row->tgl_pengeluaran)->locale('id')->translatedFormat('j F Y') : '-')
                ->editColumn('nominal', fn ($row) => number_format((float) ($row->nominal ?? 0), 0, ',', '.'))
                ->addColumn('kategori', fn ($row) => $row->kategoriTransaksi?->kategori ?? '-')
                ->addColumn('rekening', fn ($row) => $row->rekening?->nama_rek ?? '-')
                ->addColumn('action', function ($row) use ($permissions) {
                    $btn = '<div class="d-flex justify-content-center">';
                    $kat = strtolower($row->kategoriTransaksi?->kategori ?? '');

                    if ($kat === 'perawatan' || $kat === 'pembelian unit') {
                        $btn .= '<button class="btn btn-info btn-sm mx-1 detail-button" data-id="'.e($row->id).'" data-url="'.e(route('pengeluaran.edit', $row->id)).'"><i class="fa fa-eye"></i> Detail</button>';
                    } else {
                        if ($permissions['edit']) {
                            $btn .= '<button class="btn btn-primary btn-sm mx-1 edit-button" data-id="'.e($row->id).'" data-url="'.e(route('pengeluaran.edit', $row->id)).'">Edit</button>';
                        }

                        if ($permissions['hapus']) {
                            $btn .= '<form action="'.e(route('pengeluaran.destroy', $row->id)).'" method="POST" style="display:inline;">'
                            .csrf_field().method_field('DELETE').'
                            <button type="submit" class="delete-button btn btn-danger btn-sm mx-1">Hapus</button>
                            </form>';
                        }
                    }

                    $btn .= '</div>';

                    return $btn;
                })
                ->rawColumns(['action'])
                ->make(true);
        }

        $kategoris = KategoriTransaksi::where('jenis', 'Pengeluaran')->orderBy('kategori')->get();
        $perawatans = Perawatan::orderByDesc('id')->get();
        $rekenings = Rekening::orderBy('nama_rek')->get();

        return Inertia::render('Admin/Keuangan/Pengeluaran/Index', compact('permissions', 'kategoris', 'rekenings', 'perawatans'));
    }

    public function edit($id)
    {
        $data = Pengeluaran::findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'tgl_pengeluaran' => 'required|date',
            'nominal' => 'required|numeric|min:0',
            'id_kategori_transaksi' => 'required|integer|exists:kategori_transaksi,id',
            'id_rekening' => 'required|integer|exists:rekening,id',
            'lampiran' => 'nullable|file|mimes:jpeg,png,jpg,pdf',
            'keterangan' => 'nullable|string',
        ], [
            'tgl_pengeluaran.required' => 'Tanggal pengeluaran wajib diisi.',
            'nominal.required' => 'Nominal wajib diisi.',
            'nominal.numeric' => 'Nominal harus berupa angka.',
            'id_kategori_transaksi.required' => 'Kategori transaksi wajib dipilih.',
            'id_rekening.required' => 'Rekening wajib dipilih.',
            'id_rekening.exists' => 'Rekening tidak valid.',
        ]);

        DB::beginTransaction();
        try {
            if (! empty($request->id_rekening) && (int) $request->nominal > 0) {
                $this->saldo->pastikanSaldoCukup((int) $request->id_rekening, (int) $request->nominal);
            }

            $db = $request->only('tgl_pengeluaran', 'nominal', 'id_kategori_transaksi', 'id_rekening', 'keterangan');

            if ($request->hasFile('lampiran')) {
                $db['lampiran'] = $this->storage->upload($request->file('lampiran'), 'lampiran');
            }

            $pengeluaran = Pengeluaran::create($db);

            if (! empty($db['id_rekening'])) {
                $this->saldo->kurang((int) $db['id_rekening'], (int) $db['nominal'], RiwayatSaldoService::KELUAR, ['id_pengeluaran' => $pengeluaran->id], $db['tgl_pengeluaran'] ?? null);
            }

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (SaldoTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating pengeluaran: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $data = Pengeluaran::findOrFail($id);

        $request->validate([
            'tgl_pengeluaran' => 'required|date',
            'nominal' => 'required|numeric|min:0',
            'id_kategori_transaksi' => 'required|integer|exists:kategori_transaksi,id',
            'id_rekening' => 'required|integer|exists:rekening,id',
            'lampiran' => 'nullable|file|mimes:jpeg,png,jpg,pdf',
            'keterangan' => 'nullable|string',
        ], [
            'tgl_pengeluaran.required' => 'Tanggal pengeluaran wajib diisi.',
            'nominal.required' => 'Nominal wajib diisi.',
            'id_kategori_transaksi.required' => 'Kategori transaksi wajib dipilih.',
            'id_rekening.required' => 'Rekening wajib dipilih.',
            'id_rekening.exists' => 'Rekening tidak valid.',
        ]);

        DB::beginTransaction();
        try {
            if (! empty($request->id_rekening) && (int) $request->nominal > 0) {
                $this->saldo->pastikanSaldoCukup((int) $request->id_rekening, (int) $request->nominal);
            }

            $db = $request->only('tgl_pengeluaran', 'nominal', 'id_kategori_transaksi', 'id_rekening', 'keterangan');

            if ($request->hasFile('lampiran')) {
                if (! empty($data->lampiran)) {
                    $this->storage->delete($data->lampiran, 'lampiran');
                }

                $db['lampiran'] = $this->storage->upload($request->file('lampiran'), 'lampiran');
            }

            $idRekeningLama = (int) ($data->id_rekening ?? 0);
            $nominalLama = (int) ($data->nominal ?? 0);

            $data->update($db);

            if ($idRekeningLama > 0 && $nominalLama > 0) {
                $this->saldo->batalkanKeluar($idRekeningLama, $nominalLama, ['id_pengeluaran' => $data->id]);
            }

            $idRekeningBaru = (int) ($data->fresh()->id_rekening ?? 0);
            $nominalBaru = (int) ($data->fresh()->nominal ?? 0);

            if ($idRekeningBaru > 0 && $nominalBaru > 0) {
                $this->saldo->kurang($idRekeningBaru, $nominalBaru, RiwayatSaldoService::KELUAR, ['id_pengeluaran' => $data->id], $data->fresh()->tgl_pengeluaran);
            }

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (SaldoTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating pengeluaran: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $data = Pengeluaran::with('kategoriTransaksi')->findOrFail($id);
        $kat = strtolower($data->kategoriTransaksi?->kategori ?? '');
        if ($kat === 'perawatan' || $kat === 'pembelian unit') {
            return response()->json([
                'status' => 'error',
                'error' => 'Pengeluaran dari transaksi otomatis '.($data->kategoriTransaksi?->kategori ?? '').' tidak dapat dihapus.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            if (! empty($data->lampiran)) {
                $this->storage->delete($data->lampiran, 'lampiran');
            }

            $idRekeningHapus = (int) ($data->id_rekening ?? 0);
            $nominalHapus = (int) ($data->nominal ?? 0);
            $idPengeluaranHapus = (int) $data->id;

            $data->delete();

            if ($idRekeningHapus > 0 && $nominalHapus > 0) {
                $this->saldo->batalkanKeluar($idRekeningHapus, $nominalHapus, ['id_pengeluaran' => $idPengeluaranHapus]);
            }

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (SaldoTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting pengeluaran: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }
}
