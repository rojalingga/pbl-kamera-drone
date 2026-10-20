<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pengaturan\HakAksesController;
use App\Models\Barang;
use App\Models\FotoBarang;
use App\Models\Kategori;
use App\Models\Merk;
use App\Services\RiwayatStokService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class BarangController extends Controller
{
    public function __construct(private RiwayatStokService $stok) {}

    public function index(Request $request)
    {
        $permissions = HakAksesController::getUserPermissions();

        if (($request->has('datatable') || $request->wantsJson() || ($request->ajax() && $request->has('draw'))) && ! $request->header('X-Inertia')) {
            $data = Barang::with(['merk', 'kategori', 'fotos'])->orderByDesc('id');

            return DataTables::of($data)->escapeColumns([])
                ->addIndexColumn()
                ->editColumn('harga_sewa', fn ($row) => number_format((float) ($row->harga_sewa ?? 0), 0, ',', '.'))
                ->editColumn('merk', fn ($row) => $row->merk?->merk ?? '-')
                ->editColumn('kategori', fn ($row) => $row->kategori?->kategori ?? '-')
                ->addColumn('jumlah_foto', fn ($row) => $row->fotos->count())
                ->addColumn('action', function ($row) use ($permissions) {
                    $btn = '<div class="d-flex justify-content-center">';

                    if ($permissions['edit']) {
                        $btn .= '<button class="btn btn-primary btn-sm mx-1 edit-button" data-id="'.e($row->id).'" data-url="'.e(route('barang.edit', $row->id)).'">Edit</button>';
                    }

                    if ($permissions['hapus']) {
                        $btn .= '<form action="'.e(route('barang.destroy', $row->id)).'" method="POST" style="display:inline;">'
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

        $merks = Merk::orderBy('merk')->get();
        $kategoris = Kategori::orderBy('kategori')->get();

        return Inertia::render('Admin/MasterData/Barang/Index', compact('permissions', 'merks', 'kategoris'));
    }

    public function edit($id)
    {
        $data = Barang::with('fotos')->findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function store(Request $request)
    {
        $this->formatHargaSewa($request);

        $request->validate([
            'nama_barang' => 'required|string|max:150',
            'id_merk' => 'required|integer|exists:merk,id',
            'id_kategori' => 'required|integer|exists:kategori,id',
            'keterangan' => 'nullable|string',
            'harga_sewa' => 'required|numeric|min:0',
            'denda_per_hari' => 'nullable|numeric|min:0',
            'foto' => 'required|array|min:1',
            'foto.*' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ], [
            'nama_barang.required' => 'Nama barang wajib diisi.',
            'id_merk.required' => 'Merk wajib dipilih.',
            'id_merk.exists' => 'Merk tidak valid.',
            'id_kategori.required' => 'Kategori wajib dipilih.',
            'id_kategori.exists' => 'Kategori tidak valid.',
            'harga_sewa.required' => 'Harga sewa wajib diisi.',
            'harga_sewa.numeric' => 'Harga sewa harus berupa angka.',
            'denda_per_hari.numeric' => 'Denda per hari harus berupa angka.',
            'denda_per_hari.min' => 'Denda per hari tidak boleh negatif.',
            'foto.required' => 'Foto wajib diupload minimal 1.',
            'foto.min' => 'Foto wajib diupload minimal 1.',
            'foto.*.required' => 'Foto tidak boleh kosong.',
            'foto.*.image' => 'Foto harus berupa gambar valid.',
            'foto.*.mimes' => 'Foto harus berformat jpeg, png, jpg, atau webp.',
            'foto.*.max' => 'Ukuran foto maksimal 2MB.',
        ]);

        DB::beginTransaction();
        try {
            $filenames = $this->simpanFoto($request->file('foto', []));

            $barang = Barang::create([
                'nama_barang' => $request->nama_barang,
                'id_merk' => $request->id_merk,
                'id_kategori' => $request->id_kategori,
                'stok' => 0,
                'keterangan' => $request->keterangan,
                'harga_sewa' => $request->harga_sewa,
                'denda_per_hari' => $request->denda_per_hari !== null && $request->denda_per_hari !== ''
                    ? (int) $request->denda_per_hari
                    : null,
            ]);

            foreach ($filenames as $filename) {
                FotoBarang::create([
                    'id_barang' => $barang->id,
                    'foto' => $filename,
                ]);
            }

            DB::commit();

            return response()->json(['status' => 'success', 'id' => $barang->id]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating barang: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $data = Barang::findOrFail($id);

        $this->formatHargaSewa($request);

        $validator = Validator::make($request->all(), [
            'nama_barang' => 'required|string|max:150',
            'id_merk' => 'required|integer|exists:merk,id',
            'id_kategori' => 'required|integer|exists:kategori,id',
            'keterangan' => 'nullable|string',
            'harga_sewa' => 'required|numeric|min:0',
            'denda_per_hari' => 'nullable|numeric|min:0',
            'foto' => 'nullable|array',
            'foto.*' => 'image|mimes:jpeg,png,jpg,webp|max:2048',
            'existing_foto' => 'nullable|array',
            'existing_foto.*' => 'integer|exists:foto_barang,id',
        ], [
            'nama_barang.required' => 'Nama barang wajib diisi.',
            'id_merk.required' => 'Merk wajib dipilih.',
            'id_merk.exists' => 'Merk tidak valid.',
            'id_kategori.required' => 'Kategori wajib dipilih.',
            'id_kategori.exists' => 'Kategori tidak valid.',
            'harga_sewa.required' => 'Harga sewa wajib diisi.',
            'harga_sewa.numeric' => 'Harga sewa harus berupa angka.',
            'denda_per_hari.numeric' => 'Denda per hari harus berupa angka.',
            'denda_per_hari.min' => 'Denda per hari tidak boleh negatif.',
            'foto.array' => 'Foto tidak valid.',
            'foto.*.image' => 'Foto harus berupa gambar valid.',
            'foto.*.mimes' => 'Foto harus berformat jpeg, png, jpg, atau webp.',
            'foto.*.max' => 'Ukuran foto maksimal 2MB.',
            'existing_foto.array' => 'Data foto lama tidak valid.',
        ]);

        $validator->after(function ($validator) use ($request) {
            $totalFoto = count($request->file('foto') ?? [])
                + count($request->input('existing_foto') ?? []);

            if ($totalFoto === 0) {
                $validator->errors()->add('foto', 'Foto wajib diupload minimal 1.');
            }
        });

        $validator->validate();

        DB::beginTransaction();
        try {
            $data->update([
                'nama_barang' => $request->nama_barang,
                'id_merk' => $request->id_merk,
                'id_kategori' => $request->id_kategori,
                'keterangan' => $request->keterangan,
                'harga_sewa' => $request->harga_sewa,
                'denda_per_hari' => $request->denda_per_hari !== null && $request->denda_per_hari !== ''
                    ? (int) $request->denda_per_hari
                    : null,
            ]);

            $this->sinkronFoto($data, $request);

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating barang: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $data = Barang::with('fotos')->findOrFail($id);

        DB::beginTransaction();
        try {
            foreach ($data->fotos as $foto) {
                if (! empty($foto->foto) && file_exists(public_path('assets/barang/'.$foto->foto))) {
                    unlink(public_path('assets/barang/'.$foto->foto));
                }
                $foto->delete();
            }

            $this->stok->hapusRiwayat($data->id);
            $data->delete();

            DB::commit();

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting barang: '.$e->getMessage());

            return response()->json(['status' => 'error', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Buang pemisah ribuan dari input nominal (harga sewa & denda per hari).
     *
     * Aturan validasi `numeric` menolak "150.000", jadi nilai dari input
     * berformat Rp. harus dibersihkan lebih dulu.
     *
     * @var list<string>
     */
    private const FIELD_NOMINAL = ['harga_sewa', 'denda_per_hari'];

    private function formatHargaSewa(Request $request): void
    {
        $bersih = [];

        foreach (self::FIELD_NOMINAL as $field) {
            $nilai = $request->input($field);

            if (! is_scalar($nilai)) {
                continue;
            }

            $nilai = (string) $nilai;

            if (preg_match('/^\d{1,3}(?:\.\d{3})+$/', $nilai)) {
                $nilai = str_replace('.', '', $nilai);
            }

            $bersih[$field] = $nilai;
        }

        if ($bersih !== []) {
            $request->merge($bersih);
        }
    }

    private function simpanFoto(array $files): array
    {
        $filenames = [];
        $direktori = public_path('assets/barang');

        if (! is_dir($direktori)) {
            mkdir($direktori, 0755, true);
        }

        foreach ($files as $file) {
            if (! $file || ! $file->isValid()) {
                continue;
            }

            $filename = Str::random(25).'.'.$file->getClientOriginalExtension();
            $file->move($direktori, $filename);
            $filenames[] = $filename;
        }

        return $filenames;
    }

    private function sinkronFoto(Barang $barang, Request $request): void
    {
        $finalFotos = [];
        $existingFotos = $request->input('existing_foto', []);
        $uploadedFotos = $request->file('foto', []);

        if (! empty($existingFotos)) {
            $fotosDb = FotoBarang::whereIn('id', $existingFotos)->get()->keyBy('id');

            foreach ($existingFotos as $idFoto) {
                if (isset($fotosDb[$idFoto])) {
                    $finalFotos[] = $fotosDb[$idFoto]->foto;
                }
            }
        }

        foreach ($this->simpanFoto($uploadedFotos) as $filename) {
            $finalFotos[] = $filename;
        }

        $oldFotos = FotoBarang::where('id_barang', $barang->id)->pluck('foto')->toArray();
        $removedFotos = array_diff($oldFotos, $finalFotos);

        foreach ($removedFotos as $removedFoto) {
            if (file_exists(public_path('assets/barang/'.$removedFoto))) {
                unlink(public_path('assets/barang/'.$removedFoto));
            }
        }

        FotoBarang::where('id_barang', $barang->id)->delete();

        foreach ($finalFotos as $filename) {
            FotoBarang::create([
                'id_barang' => $barang->id,
                'foto' => $filename,
            ]);
        }
    }
}
