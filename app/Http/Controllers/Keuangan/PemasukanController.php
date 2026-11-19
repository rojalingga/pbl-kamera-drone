<?php

namespace App\Http\Controllers\Keuangan;

use App\Exceptions\SaldoTidakCukupException;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\KategoriTransaksi;
use App\Models\Pemasukan;
use App\Models\Rekening;
use App\Services\NomorDokumenService;
use App\Services\RiwayatSaldoService;
use App\Services\SupabaseStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class PemasukanController extends Controller
{
    public function __construct(
        private RiwayatSaldoService $saldo,
        private NomorDokumenService $nomor,
        private SupabaseStorageService $storage
    ) {}

    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        if (($request->has('datatable') || $request->wantsJson() || ($request->ajax() && $request->has('draw'))) && ! $request->header('X-Inertia')) {
            $data = Pemasukan::with(['kategoriTransaksi', 'rekening', 'sewa', 'pengembalian'])->orderByDesc('id');

            return DataTables::of($data)->escapeColumns([])
                ->addIndexColumn()
                ->editColumn('tgl_pemasukan', fn ($row) => $row->tgl_pemasukan ? Carbon::parse($row->tgl_pemasukan)->locale('id')->translatedFormat('j F Y') : '-')
                ->editColumn('nominal', fn ($row) => number_format((float) ($row->nominal ?? 0), 0, ',', '.'))
                ->addColumn('kategori', fn ($row) => $row->kategoriTransaksi?->kategori ?? '-')
                ->addColumn('rekening', fn ($row) => $row->rekening?->nama_rek ?? '-')
                ->addColumn('action', function ($row) use ($permissions) {
                    $btn = '<div class="d-flex justify-content-center">';
                    $kat = strtolower($row->kategoriTransaksi?->kategori ?? '');

                    if ($kat === 'sewa' || $kat === 'pembayaran denda') {
                        $btn .= '<button class="btn btn-info btn-sm mx-1 detail-button" data-id="'.e($row->id).'" data-url="'.e(route('pemasukan.edit', $row->id)).'"><i class="fa fa-eye"></i> Detail</button>';
                    } else {
                        if ($permissions['edit']) {
                            $btn .= '<button class="btn btn-primary btn-sm mx-1 edit-button" data-id="'.e($row->id).'" data-url="'.e(route('pemasukan.edit', $row->id)).'">Edit</button>';
                        }

                        if ($permissions['hapus']) {
                            $btn .= '<form action="'.e(route('pemasukan.destroy', $row->id)).'" method="POST" style="display:inline;">'
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

        $kategoris = KategoriTransaksi::where('jenis', 'Pemasukan')->orderBy('kategori')->get();
        $rekenings = Rekening::orderBy('nama_rek')->get();

        return Inertia::render('Admin/Keuangan/Pemasukan/Index', compact('permissions', 'kategoris', 'rekenings'));
    }

    public function edit($id)
    {
        $data = Pemasukan::findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'tgl_pemasukan' => 'required|date',
            'nominal' => 'required|numeric|min:0',
            'id_kategori_transaksi' => 'required|integer|exists:kategori_transaksi,id',
            'id_rekening' => 'required|integer|exists:rekening,id',
            'lampiran' => 'nullable|file|mimes:jpeg,png,jpg,pdf',
            'no_kwitansi' => 'nullable|string|max:100',
            'keterangan' => 'nullable|string',
        ], [
            'tgl_pemasukan.required' => 'Tanggal pemasukan wajib diisi.',
            'nominal.required' => 'Nominal wajib diisi.',
            'nominal.numeric' => 'Nominal harus berupa angka.',
            'id_kategori_transaksi.required' => 'Kategori transaksi wajib dipilih.',
            'id_rekening.required' => 'Rekening wajib dipilih.',
            'id_rekening.exists' => 'Rekening tidak valid.',
        ]);

        DB::beginTransaction();
        try {
            $db = $request->only('tgl_pemasukan', 'nominal', 'id_kategori_transaksi', 'id_rekening', 'no_kwitansi', 'keterangan');

            if (empty($db['no_kwitansi'])) {
                $db['no_kwitansi'] = $this->nomor->noKwitansi($db['tgl_pemasukan'] ?? null);
            }

            if ($request->hasFile('lampiran')) {
                $db['lampiran'] = $this->storage->upload($request->file('lampiran'), 'lampiran');
            }

            $pemasukan = Pemasukan::create($db);

            if (! empty($db['id_rekening'])) {
                $this->saldo->tambah((int) $db['id_rekening'], (int) $db['nominal'], RiwayatSaldoService::MASUK, ['id_pemasukan' => $pemasukan->id], $db['tgl_pemasukan'] ?? null);
            }

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (SaldoTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating pemasukan: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $data = Pemasukan::findOrFail($id);

        $request->validate([
            'tgl_pemasukan' => 'required|date',
            'nominal' => 'required|numeric|min:0',
            'id_kategori_transaksi' => 'required|integer|exists:kategori_transaksi,id',
            'id_rekening' => 'required|integer|exists:rekening,id',
            'lampiran' => 'nullable|file|mimes:jpeg,png,jpg,pdf',
            'no_kwitansi' => 'nullable|string|max:100',
            'keterangan' => 'nullable|string',
        ], [
            'tgl_pemasukan.required' => 'Tanggal pemasukan wajib diisi.',
            'nominal.required' => 'Nominal wajib diisi.',
            'id_kategori_transaksi.required' => 'Kategori transaksi wajib dipilih.',
            'id_rekening.required' => 'Rekening wajib dipilih.',
            'id_rekening.exists' => 'Rekening tidak valid.',
        ]);

        DB::beginTransaction();
        try {
            $db = $request->only('tgl_pemasukan', 'nominal', 'id_kategori_transaksi', 'id_rekening', 'no_kwitansi', 'keterangan');

            if (empty($db['no_kwitansi'])) {
                $db['no_kwitansi'] = $this->nomor->noKwitansi($db['tgl_pemasukan'] ?? null);
            }

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
                $this->saldo->batalkanMasuk($idRekeningLama, $nominalLama, ['id_pemasukan' => $data->id]);
            }

            $idRekeningBaru = (int) ($data->fresh()->id_rekening ?? 0);
            $nominalBaru = (int) ($data->fresh()->nominal ?? 0);

            if ($idRekeningBaru > 0 && $nominalBaru > 0) {
                $this->saldo->tambah($idRekeningBaru, $nominalBaru, RiwayatSaldoService::MASUK, ['id_pemasukan' => $data->id], $data->fresh()->tgl_pemasukan);
            }

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (SaldoTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating pemasukan: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $data = Pemasukan::with('kategoriTransaksi')->findOrFail($id);
        $kat = strtolower($data->kategoriTransaksi?->kategori ?? '');
        if ($kat === 'sewa' || $kat === 'pembayaran denda') {
            return response()->json([
                'status' => 'error',
                'error' => 'Pemasukan dari transaksi otomatis '.($data->kategoriTransaksi?->kategori ?? '').' tidak dapat dihapus.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            if (! empty($data->lampiran)) {
                $this->storage->delete($data->lampiran, 'lampiran');
            }

            $idRekeningHapus = (int) ($data->id_rekening ?? 0);
            $nominalHapus = (int) ($data->nominal ?? 0);
            $idPemasukanHapus = (int) $data->id;

            $data->delete();

            if ($idRekeningHapus > 0 && $nominalHapus > 0) {
                $this->saldo->batalkanMasuk($idRekeningHapus, $nominalHapus, ['id_pemasukan' => $idPemasukanHapus]);
            }

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (SaldoTidakCukupException $e) {
            DB::rollBack();

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting pemasukan: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }
}
