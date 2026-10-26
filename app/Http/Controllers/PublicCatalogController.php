<?php

namespace App\Http\Controllers;

use App\Models\Barang;
use App\Models\Kategori;
use App\Models\Merk;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class PublicCatalogController extends Controller
{
    public function landing(): Response
    {
        $categories = Schema::hasTable('kategori')
            ? Kategori::has('barangs')
                ->withCount('barangs')
                ->orderBy('kategori')
                ->get()
            : collect();

        $brands = Schema::hasTable('merk')
            ? Merk::has('barangs')
                ->withCount('barangs')
                ->orderBy('merk')
                ->get()
            : collect();

        $featuredProducts = Schema::hasTable('barang')
            ? Barang::with(['kategori', 'merk', 'fotos'])
                ->orderByDesc('stok')
                ->take(8)
                ->get()
            : collect();

        return Inertia::render('Landing', [
            'categories' => $categories,
            'brands' => $brands,
            'featuredProducts' => $featuredProducts,
        ]);
    }

    public function index(Request $request): Response
    {
        if (! Schema::hasTable('barang')) {
            return Inertia::render('Catalog', [
                'products' => collect(),
                'categories' => collect(),
                'brands' => collect(),
                'filters' => [
                    'search' => '',
                    'kategori' => 'Semua',
                    'merk' => 'Semua',
                    'sort' => 'terbaru',
                ],
            ]);
        }

        $query = Barang::select('barang.*')
            ->selectSub($this->jumlahTersewaSubquery(), 'jumlah_terewa')
            ->with(['kategori', 'merk', 'fotos']);

        if ($request->filled('search')) {
            $search = trim((string) $request->search);
            $query->where(function ($q) use ($search) {
                $q->where('nama_barang', 'like', "%{$search}%")
                    ->orWhere('keterangan', 'like', "%{$search}%")
                    ->orWhereHas('merk', fn ($m) => $m->where('merk', 'like', "%{$search}%"))
                    ->orWhereHas('kategori', fn ($k) => $k->where('kategori', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('kategori') && $request->kategori !== 'Semua') {
            $query->whereHas('kategori', function ($q) use ($request) {
                $q->where('kategori', $request->kategori);
            });
        }

        if ($request->filled('merk') && $request->merk !== 'Semua') {
            $query->whereHas('merk', function ($q) use ($request) {
                $q->where('merk', $request->merk);
            });
        }

        if ($request->filled('min_price')) {
            $query->where('harga_sewa', '>=', (float) $request->min_price);
        }

        if ($request->filled('max_price')) {
            $query->where('harga_sewa', '<=', (float) $request->max_price);
        }

        // Sorting
        $sort = $request->input('sort', 'terbaru');
        match ($sort) {
            'harga_rendah' => $query->orderBy('harga_sewa', 'asc'),
            'harga_tinggi' => $query->orderBy('harga_sewa', 'desc'),
            'stok_terbanyak' => $query->orderBy('stok', 'desc'),
            default => $query
                ->orderByRaw('CASE WHEN barang.stok > 0 THEN 0 ELSE 1 END')
                ->orderByDesc('jumlah_terewa')
                ->orderByDesc('created_at'),
        };

        $products = $query->get();

        $categories = Schema::hasTable('kategori')
            ? Kategori::has('barangs')
                ->withCount('barangs')
                ->orderBy('kategori')
                ->get()
            : collect();

        $brands = Schema::hasTable('merk')
            ? Merk::has('barangs')
                ->withCount('barangs')
                ->orderBy('merk')
                ->get()
            : collect();

        return Inertia::render('Catalog', [
            'products' => $products,
            'categories' => $categories,
            'brands' => $brands,
            'filters' => [
                'search' => $request->input('search', ''),
                'kategori' => $request->input('kategori', 'Semua'),
                'merk' => $request->input('merk', 'Semua'),
                'sort' => $sort,
            ],
        ]);
    }

    /**
     * Subquery total unit yang pernah disewa per barang, dipakai untuk
     * mengurutkan unit paling laris di katalog publik.
     */
    private function jumlahTersewaSubquery(): Builder
    {
        return DB::table('sewa_detail')
            ->selectRaw('COALESCE(SUM(sewa_detail.qty), 0)')
            ->join('sewa', 'sewa.id', '=', 'sewa_detail.id_sewa')
            ->whereColumn('sewa_detail.id_barang', 'barang.id');
    }

    public function show(string $id): Response
    {
        $barang = Barang::with(['kategori', 'merk', 'fotos'])->findOrFail($id);

        $related = Barang::with(['kategori', 'merk', 'fotos'])
            ->where('id_kategori', $barang->id_kategori)
            ->where('id', '!=', $barang->id)
            ->take(4)
            ->get();

        return Inertia::render('ProductDetail', [
            'barang' => $barang,
            'related' => $related,
        ]);
    }
}
