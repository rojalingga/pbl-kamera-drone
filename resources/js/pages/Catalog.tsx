import React, { useState, useMemo, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Search, X, Tag, Layers, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import ProductCard from '@/components/landing/ProductCard';
import TablePagination from '@/components/common/TablePagination';
import FilterSelect from '@/components/landing/FilterSelect';

const PRICE_BRACKETS = [
  { label: 'Semua Harga', min: 0, max: Infinity },
  { label: 'Di bawah Rp200.000', min: 0, max: 199999 },
  { label: 'Rp200.000 – Rp500.000', min: 200000, max: 500000 },
  { label: 'Rp500.000 – Rp1.000.000', min: 500001, max: 1000000 },
  { label: 'Di atas Rp1.000.000', min: 1000001, max: Infinity },
] as const;

const PER_PAGE = 6;

interface CatalogProps {
  products?: any[];
  categories?: any[];
  brands?: any[];
  filters?: {
    search?: string;
    kategori?: string;
    merk?: string;
    sort?: string;
  };
}

export default function Catalog({
  products = [],
  categories = [],
  brands = [],
  filters = {},
}: CatalogProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(filters.kategori || 'Semua');
  const [selectedBrand, setSelectedBrand] = useState<string>(filters.merk || 'Semua');
  const [selectedBracketLabel, setSelectedBracketLabel] = useState<string>(PRICE_BRACKETS[0].label);
  const [sortBy, setSortBy] = useState<string>(filters.sort || 'terbaru');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const selectedBracket =
    PRICE_BRACKETS.find((bracket) => bracket.label === selectedBracketLabel) ?? PRICE_BRACKETS[0];

  // Sync from URL params on load if any
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('kategori');
    if (cat) setSelectedCategory(cat);
  }, []);

  // Filter products client-side for ultra-fast instant search & filter
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();

    return products.filter((item) => {
      // Search match
      const title = (item.nama_barang || item.name || '').toLowerCase();
      const cat = (item.kategori?.kategori || item.category || '').toLowerCase();
      const br = (item.merk?.merk || '').toLowerCase();
      const desc = (item.keterangan || item.description || '').toLowerCase();

      const matchSearch = !q || title.includes(q) || cat.includes(q) || br.includes(q) || desc.includes(q);

      // Category match
      const currentCat = item.kategori?.kategori || item.category;
      const matchCategory =
        selectedCategory === 'Semua' ||
        currentCat?.toLowerCase() === selectedCategory.toLowerCase();

      // Brand match
      const currentBrand = item.merk?.merk;
      const matchBrand =
        selectedBrand === 'Semua' ||
        (currentBrand && currentBrand.toLowerCase() === selectedBrand.toLowerCase());

      // Price match
      const price = item.harga_sewa !== undefined ? Number(item.harga_sewa) : item.priceValue || 0;
      const matchPrice = price >= selectedBracket.min && price <= selectedBracket.max;


      return matchSearch && matchCategory && matchBrand && matchPrice;
    }).sort((a, b) => {
      const priceA = Number(a.harga_sewa ?? a.priceValue ?? 0);
      const priceB = Number(b.harga_sewa ?? b.priceValue ?? 0);
      const stockA = Number(a.stok ?? 0);
      const stockB = Number(b.stok ?? 0);
      const terawaA = Number(a.jumlah_terewa ?? 0);
      const terawaB = Number(b.jumlah_terewa ?? 0);
      const readyA = stockA > 0 ? 1 : 0;
      const readyB = stockB > 0 ? 1 : 0;

      if (sortBy === 'harga_rendah') return priceA - priceB;
      if (sortBy === 'harga_tinggi') return priceB - priceA;
      if (sortBy === 'stok_terbanyak') return stockB - stockA;

      // Default: unit siap sewa dulu, lalu yang paling banyak disewa
      if (readyA !== readyB) return readyB - readyA;
      if (terawaA !== terawaB) return terawaB - terawaA;

      return 0;
    });
  }, [products, search, selectedCategory, selectedBrand, selectedBracket, sortBy]);

  const totalPages = Math.max(Math.ceil(filteredProducts.length / PER_PAGE), 1);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedBrand, selectedBracketLabel, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('Semua');
    setSelectedBrand('Semua');
    setSelectedBracketLabel(PRICE_BRACKETS[0].label);
    setSortBy('terbaru');
  };

  const hasActiveFilters =
    search !== '' ||
    selectedCategory !== 'Semua' ||
    selectedBrand !== 'Semua' ||
    selectedBracketLabel !== PRICE_BRACKETS[0].label ||
    sortBy !== 'terbaru';

  const categoryList = ['Semua', ...categories.map((c) => c.kategori)];
  const brandList = ['Semua', ...brands.map((b) => b.merk)];

  const kategoriOptions = [
    { value: 'Semua', label: 'Semua Kategori' },
    ...categoryList.slice(1).map((cat) => ({ value: cat, label: cat })),
  ];

  const merekOptions = [
    { value: 'Semua', label: 'Semua Merek' },
    ...brandList.slice(1).map((brand) => ({ value: brand, label: brand })),
  ];

  const hargaOptions = PRICE_BRACKETS.map((bracket) => ({
    value: bracket.label,
    label: bracket.label,
  }));

  const sortOptions = [
    { value: 'terbaru', label: 'Terlaris (Rekomendasi)' },
    { value: 'harga_rendah', label: 'Harga: Rendah ke Tinggi' },
    { value: 'harga_tinggi', label: 'Harga: Tinggi ke Rendah' },
    { value: 'stok_terbanyak', label: 'Stok Terbanyak' },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] text-black flex flex-col selection:bg-brand-500 selection:text-white">
      <Head title="Katalog Peralatan Kamera & Drone — SkyLens" />
      <Navbar />

      <main className="flex-1">
        {/* Hero Banner Section */}
        <section className="pt-28 sm:pt-36 lg:pt-40 pb-0">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-5 lg:px-6">
            <div className="relative w-full rounded-[36px] overflow-hidden bg-zinc-950 min-h-[280px] md:min-h-[340px] flex items-center shadow-xl border border-black/10">
              <img
                src="/assets/img/Catalog.jpg"
                alt="SkyLens Gear Collection"
                className="absolute right-0 top-0 w-full md:w-3/4 lg:w-2/3 h-full object-cover object-right"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/95 to-transparent w-full md:w-2/3" />

              <div className="relative z-10 p-8 sm:p-12 lg:p-16 w-full md:w-2/3 lg:w-[55%]">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-widest mb-3">
                  <Layers className="w-3.5 h-3.5" /> Eksplorasi Peralatan
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15] mb-3">
                  Katalog Unit Kamera &amp; Drone Pro
                </h1>
                <p className="text-sm sm:text-base text-white/70 font-medium leading-relaxed max-w-md">
                  Pilih dari {products.length}+ kamera sinema, drone aerial, lensa prime, dan aksesori produksi dengan stok terverifikasi.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Catalog Main Layout */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-5 lg:px-6 pt-10 sm:pt-14 pb-20">
          <div className="min-w-0">
            {/* Search, Filter & Sorting Toolbar */}
            <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-3 mb-6">
              {/* Search input */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/35 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kamera, drone, lensa, atau tipe..."
                  className="w-full pl-11 pr-10 py-3 text-sm rounded-2xl border border-black/10 bg-white placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all shadow-sm"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/35 hover:text-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Kategori */}
              <FilterSelect
                options={kategoriOptions}
                value={selectedCategory}
                onChange={setSelectedCategory}
                placeholder="Semua Kategori"
                searchPlaceholder="Cari kategori..."
                wrapperClassName="w-full sm:w-52"
              />

              {/* Filter Merek */}
              {brandList.length > 1 && (
                <FilterSelect
                  options={merekOptions}
                  value={selectedBrand}
                  onChange={setSelectedBrand}
                  placeholder="Semua Merek"
                  searchPlaceholder="Cari merek..."
                  wrapperClassName="w-full sm:w-44"
                />
              )}

              {/* Filter Rentang Harga Sewa */}
              <FilterSelect
                options={hargaOptions}
                value={selectedBracketLabel}
                onChange={setSelectedBracketLabel}
                placeholder="Semua Harga"
                searchPlaceholder="Cari rentang harga..."
                searchable={false}
                wrapperClassName="w-full sm:w-56"
              />

              {/* Sorting Dropdown */}
              <FilterSelect
                options={sortOptions}
                value={sortBy}
                onChange={setSortBy}
                placeholder="Urutkan"
                searchable={false}
                wrapperClassName="w-full sm:w-48"
              />
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {selectedCategory !== 'Semua' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-600">
                    Kategori: {selectedCategory}
                    <button type="button" onClick={() => setSelectedCategory('Semua')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedBrand !== 'Semua' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-600">
                    Merek: {selectedBrand}
                    <button type="button" onClick={() => setSelectedBrand('Semua')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedBracket !== PRICE_BRACKETS[0] && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-600">
                    {selectedBracket.label}
                    <button type="button" onClick={() => setSelectedBracketLabel(PRICE_BRACKETS[0].label)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {search && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 text-black/70">
                    "{search}"
                    <button type="button" onClick={() => setSearch('')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-bold text-black/40 hover:text-brand-500 ml-1 transition-colors"
                >
                  Hapus semua
                </button>
              </div>
            )}

            {/* Product Grid */}
            {filteredProducts.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4 text-xs font-semibold text-black/50">
                  <span>Total {filteredProducts.length} unit</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                  {paginatedProducts.map((item) => (
                    <ProductCard key={item.id} item={item} />
                  ))}
                </div>

                <div className="mt-6">
                  <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredProducts.length}
                    perPage={PER_PAGE}
                    setCurrentPage={setCurrentPage}
                    unitLabel="unit"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white border border-black/5 rounded-[32px] p-6 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-black/5 flex items-center justify-center mb-4 text-black/30">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-black mb-1">
                  Peralatan tidak ditemukan
                </h3>
                <p className="text-xs sm:text-sm text-black/50 max-w-sm mb-6">
                  Tidak ada unit yang sesuai dengan kata kunci atau filter yang Anda pilih. Coba sesuaikan pilihan filter.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-6 py-2.5 rounded-full bg-brand-500 text-white font-bold text-xs shadow-md transition-all"
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

    </div>
  );
}
