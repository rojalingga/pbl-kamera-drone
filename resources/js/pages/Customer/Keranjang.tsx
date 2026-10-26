import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import {
  ShoppingCart,
  Trash2,
  Calendar,
  Minus,
  Plus,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Clock,
  X,
  Loader2,
} from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import QrisPaymentModal from '@/components/booking/QrisPaymentModal';
import DatePicker from '@/components/form/date-picker';
import { toast, confirmDialog } from '@/utils/toast';

interface CartItem {
  id: number;
  id_customer: string;
  id_barang: string;
  qty: number;
  tgl_sewa: string | null;
  tgl_akhir_sewa: string | null;
  barang: {
    id: string;
    nama_barang: string;
    harga_sewa: number;
    stok: number;
    keterangan?: string;
    kategori?: { id: number; kategori: string };
    merk?: { id: number; merk: string };
    fotos?: { id: number; foto: string }[];
  };
}

interface KeranjangProps {
  items: CartItem[];
}

export default function Keranjang({ items: initialItems }: KeranjangProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Local state for items in cart
  const [items, setItems] = useState<CartItem[]>(initialItems || []);
  const [selectedIds, setSelectedIds] = useState<number[]>(
    (initialItems || []).map((i) => i.id)
  );

  // Modal states
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [checkoutStartDate, setCheckoutStartDate] = useState<string>(todayStr);
  const [checkoutEndDate, setCheckoutEndDate] = useState<string>(tomorrowStr);
  const [submittingCheckout, setSubmittingCheckout] = useState<boolean>(false);

  // QRIS Payment Modal
  const [bookedSewaId, setBookedSewaId] = useState<string | null>(null);
  const [isQrisModalOpen, setIsQrisModalOpen] = useState<boolean>(false);

  // Sync state if initialItems change
  React.useEffect(() => {
    setItems(initialItems || []);
    setSelectedIds((initialItems || []).map((i) => i.id));
  }, [initialItems]);

  const formatRupiah = (val: number | string) => {
    return 'Rp' + Number(val || 0).toLocaleString('id-ID');
  };

  const getDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  };

  // Toggle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(items.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleItem = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isAllSelected = items.length > 0 && selectedIds.length === items.length;

  // Selected items
  const selectedItems = useMemo(() => {
    return items.filter((i) => selectedIds.includes(i.id));
  }, [items, selectedIds]);

  // Total daily rate for selected items (used on cart bottom bar)
  const totalDailyEstimated = useMemo(() => {
    return selectedItems.reduce((acc, curr) => {
      const price = Number(curr.barang?.harga_sewa || 0);
      return acc + price * (curr.qty || 1);
    }, 0);
  }, [selectedItems]);

  // Duration in Checkout Modal
  const checkoutDuration = useMemo(() => {
    return getDuration(checkoutStartDate, checkoutEndDate);
  }, [checkoutStartDate, checkoutEndDate]);

  // Total checkout amount in Checkout Modal
  const totalCheckoutAmount = useMemo(() => {
    return totalDailyEstimated * checkoutDuration;
  }, [totalDailyEstimated, checkoutDuration]);

  // Update item qty
  const handleUpdateItem = async (
    id: number,
    updates: { qty?: number; tgl_sewa?: string; tgl_akhir_sewa?: string }
  ) => {
    // Optimistic UI update
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

    try {
      await axios.put(`/keranjang/${id}`, updates);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memperbarui item keranjang.';
      toast.fire({ icon: 'error', title: msg });
      router.reload({ only: ['items'] });
    }
  };

  // Delete single item
  const handleDeleteItem = async (id: number) => {
    const confirmed = await confirmDialog(
      'Hapus Item?',
      'Apakah Anda yakin ingin menghapus produk ini dari keranjang belanja?'
    );
    if (!confirmed) return;

    try {
      const res = await axios.delete(`/keranjang/${id}`);
      if (res.data.status === 'success') {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setSelectedIds((prev) => prev.filter((i) => i !== id));
        router.reload({ only: ['auth'] });
      }
    } catch (err: any) {
      toast.fire({ icon: 'error', title: 'Gagal menghapus item.' });
    }
  };

  // Delete bulk selected items
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    const confirmed = await confirmDialog(
      'Hapus Item Terpilih?',
      `Hapus ${selectedIds.length} produk yang dipilih dari keranjang?`
    );
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => axios.delete(`/keranjang/${id}`)));
      setItems((prev) => prev.filter((i) => !selectedIds.includes(i.id)));
      setSelectedIds([]);
      router.reload({ only: ['auth'] });
    } catch (err: any) {
      toast.fire({ icon: 'error', title: 'Gagal menghapus item terpilih.' });
    }
  };

  // Open Checkout Modal
  const handleOpenCheckoutModal = () => {
    if (selectedItems.length === 0) {
      toast.fire({ icon: 'warning', title: 'Pilih minimal satu produk untuk di-checkout.' });
      return;
    }
    setCheckoutStartDate(todayStr);
    setCheckoutEndDate(tomorrowStr);
    setIsCheckoutModalOpen(true);
  };

  // Submit Checkout from Modal
  const handleSubmitCheckout = async () => {
    if (!checkoutStartDate || !checkoutEndDate) {
      toast.fire({ icon: 'warning', title: 'Silakan pilih tanggal mulai dan selesai sewa.' });
      return;
    }

    if (new Date(checkoutEndDate) <= new Date(checkoutStartDate)) {
      toast.fire({ icon: 'warning', title: 'Tanggal selesai harus setelah tanggal mulai sewa.' });
      return;
    }

    setSubmittingCheckout(true);
    try {
      const payload = {
        tgl_sewa: checkoutStartDate,
        tgl_akhir_sewa: checkoutEndDate,
        items: selectedItems.map((item) => ({
          id: item.id,
          qty: item.qty,
          tgl_sewa: checkoutStartDate,
          tgl_akhir_sewa: checkoutEndDate,
        })),
      };

      const res = await axios.post('/keranjang/checkout', payload);

      if (res.data.status === 'success') {
        setIsCheckoutModalOpen(false);
        const sewaId = res.data.sewa.id;
        setBookedSewaId(sewaId);
        setIsQrisModalOpen(true);

        // Remove checked out items from local state
        const checkedIds = selectedItems.map((i) => i.id);
        setItems((prev) => prev.filter((i) => !checkedIds.includes(i.id)));
        setSelectedIds([]);
        router.reload({ only: ['auth'] });
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Gagal memproses checkout. Silakan periksa kembali ketersediaan stok.';
      toast.fire({ icon: 'error', title: msg });
    } finally {
      setSubmittingCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-black flex flex-col selection:bg-brand-500 selection:text-white">
      <Head title="Keranjang Belanja — SkyLens" />
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-36 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs font-semibold text-black/40 mb-6">
            <Link href="/" className="hover:text-black transition-colors">
              Beranda
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/katalog" className="hover:text-black transition-colors">
              Katalog
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-black font-bold">Keranjang Belanja</span>
          </nav>

          {/* Page Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-500 mb-1">
                <ShoppingCart className="w-4 h-4" />
                <span>Peralatan Siap Disewa</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                Keranjang Belanja Saya
              </h1>
            </div>
            <Link
              href="/katalog"
              className="text-xs sm:text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1.5"
            >
              <span>+ Tambah Peralatan Lain</span>
            </Link>
          </div>

          {/* Cart Table Container */}
          {items.length === 0 ? (
            /* Empty Cart View */
            <div className="bg-white border border-black/8 rounded-[32px] p-12 text-center shadow-sm max-w-lg mx-auto my-8">
              <div className="w-20 h-20 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center mx-auto mb-5 shadow-inner">
                <ShoppingCart className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-black text-black mb-2">
                Keranjang Belanja Anda Kosong
              </h3>
              <p className="text-xs sm:text-sm text-black/55 mb-6 leading-relaxed">
                Belum ada peralatan kamera atau drone yang ditambahkan. Jelajahi katalog kami untuk menemukan gear impian Anda.
              </p>
              <Link
                href="/katalog"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-brand-500/25 transition-all"
              >
                <span>Mulai Sewa Peralatan</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Kolom: Produk, Harga Sewa, Jumlah Unit, Total Harga, Aksi */}
              <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-white border border-black/8 rounded-2xl shadow-sm text-xs font-bold text-black/60 uppercase tracking-wider items-center">
                <div className="col-span-5 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500/30 border-black/20 cursor-pointer"
                  />
                  <span>Produk</span>
                </div>
                <div className="col-span-2 text-center">Harga Sewa</div>
                <div className="col-span-2 text-center">Jumlah Unit</div>
                <div className="col-span-2 text-center">Total Harga</div>
                <div className="col-span-1 text-center">Aksi</div>
              </div>

              {/* List Item Keranjang */}
              <div className="space-y-3">
                {items.map((item) => {
                  const barang = item.barang;
                  const isChecked = selectedIds.includes(item.id);
                  const price = Number(barang?.harga_sewa || 0);
                  const stock = Number(barang?.stok || 0);
                  const itemDailyTotal = price * (item.qty || 1);

                  const photoUrl =
                    barang?.fotos && barang.fotos.length > 0
                      ? `/assets/barang/${barang.fotos[0].foto}`
                      : '/assets/img/1 Kamera.jpg';

                  return (
                    <div
                      key={item.id}
                      className={`bg-white border rounded-3xl p-5 sm:p-6 shadow-sm transition-all ${
                        isChecked ? 'border-brand-500/50 bg-brand-50/10' : 'border-black/8'
                      }`}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                        {/* Kolom 1: Checkbox & Info Produk (Col 5) */}
                        <div className="lg:col-span-5 flex items-start sm:items-center gap-3.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleItem(item.id)}
                            className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500/30 border-black/20 cursor-pointer mt-1 sm:mt-0"
                          />

                          {/* Foto Thumbnail */}
                          <Link
                            href={`/katalog/${barang?.id}`}
                            className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-zinc-50 border border-black/8 shrink-0 p-1 flex items-center justify-center hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={photoUrl}
                              alt={barang?.nama_barang}
                              className="w-full h-full object-contain rounded-xl"
                            />
                          </Link>

                          {/* Detail Nama & Spesifikasi */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {barang?.merk && (
                                <span className="px-2 py-0.5 rounded-md bg-black/5 text-[10px] font-bold text-black/70 uppercase">
                                  {barang.merk.merk}
                                </span>
                              )}
                              <span className="text-[10px] font-semibold text-brand-600 truncate">
                                {barang?.kategori?.kategori}
                              </span>
                            </div>

                            <Link
                              href={`/katalog/${barang?.id}`}
                              className="text-sm sm:text-base font-extrabold text-black hover:text-brand-600 transition-colors line-clamp-1"
                            >
                              {barang?.nama_barang}
                            </Link>

                            <p className="text-[11px] text-black/45 line-clamp-1 mt-0.5">
                              {barang?.keterangan || 'Unit terawat & teruji kelayakannya'}
                            </p>
                          </div>
                        </div>

                        {/* Kolom 2: Harga Sewa (Col 2) */}
                        <div className="lg:col-span-2 flex lg:flex-col items-center justify-between lg:justify-center border-t lg:border-t-0 pt-2 lg:pt-0 border-black/5">
                          <span className="lg:hidden text-xs text-black/50 font-semibold">
                            Harga Sewa:
                          </span>
                          <div className="text-right lg:text-center">
                            <span className="text-xs sm:text-sm font-bold text-black/80">
                              {formatRupiah(price)}
                            </span>
                            <span className="text-[11px] text-black/40 block">/hari</span>
                          </div>
                        </div>

                        {/* Kolom 3: Jumlah Unit (Col 2) — Hanya Jumlah Unit Saja */}
                        <div className="lg:col-span-2 flex flex-col items-start lg:items-center gap-1.5 border-t lg:border-t-0 pt-2 lg:pt-0 border-black/5">
                          <span className="lg:hidden text-xs text-black/50 font-semibold mb-1">
                            Jumlah Unit:
                          </span>
                          {/* Stepper Kuantitas */}
                          <div className="flex items-center justify-between w-28 h-9 rounded-xl border border-black/15 px-2 bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateItem(item.id, { qty: Math.max(1, item.qty - 1) })
                              }
                              disabled={item.qty <= 1}
                              className="text-black/60 hover:text-black disabled:opacity-30 p-1 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-extrabold text-xs text-black">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateItem(item.id, {
                                  qty: Math.min(stock, item.qty + 1),
                                })
                              }
                              disabled={item.qty >= stock}
                              className="text-black/60 hover:text-black disabled:opacity-30 p-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="text-[10px] text-black/45">
                            Tersisa: <strong className="text-black/70">{stock} unit</strong>
                          </span>
                        </div>

                        {/* Kolom 4: Total Harga Item (Col 2) */}
                        <div className="lg:col-span-2 flex lg:flex-col items-center justify-between lg:justify-center border-t lg:border-t-0 pt-2 lg:pt-0 border-black/5">
                          <span className="lg:hidden text-xs text-black/50 font-semibold">
                            Total Harga:
                          </span>
                          <div className="text-right lg:text-center">
                            <span className="text-sm sm:text-base font-black text-brand-600 block">
                              {formatRupiah(itemDailyTotal)}
                            </span>
                            <span className="text-[10px] text-black/40 block">
                              ({item.qty} unit /hari)
                            </span>
                          </div>
                        </div>

                        {/* Kolom 5: Aksi (Col 1) */}
                        <div className="lg:col-span-1 flex items-center justify-end lg:justify-center border-t lg:border-t-0 pt-2 lg:pt-0 border-black/5">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2.5 rounded-xl text-black/40 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus dari keranjang"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Sticky Checkout Bar (Shopee Style) */}
              <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-black/10 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Left: Bulk select & delete */}
                  <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-start">
                    <label className="flex items-center gap-2.5 text-xs font-bold text-black/75 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500/30 border-black/20 cursor-pointer"
                      />
                      <span>
                        Pilih Semua ({selectedIds.length}/{items.length})
                      </span>
                    </label>

                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeleteSelected}
                        className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer transition-colors"
                      >
                        Hapus Terpilih
                      </button>
                    )}
                  </div>

                  {/* Right: Total calculation & Checkout Button */}
                  <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="flex items-baseline gap-1.5 justify-end">
                        <span className="text-xs text-black/60 font-semibold">
                          Total ({selectedItems.length} produk):
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-brand-600">
                          {formatRupiah(totalDailyEstimated)}
                        </span>
                        <span className="text-xs text-black/40 font-normal">/hari</span>
                      </div>
                      <span className="text-[10px] text-black/40 block">
                        Lengkapi periode sewa pada formulir checkout
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenCheckoutModal}
                      disabled={selectedItems.length === 0}
                      className="px-7 sm:px-9 py-3.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-black text-xs sm:text-sm shadow-xl shadow-brand-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      <span>Checkout ({selectedItems.length})</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Formulir Pemesanan Modal (Checkout Modal) */}
      {isCheckoutModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingCheckout) {
              setIsCheckoutModalOpen(false);
            }
          }}
        >
          <div className="relative w-full max-w-3xl bg-white rounded-[32px] border border-black/10 shadow-2xl overflow-hidden p-6 sm:p-8 my-auto flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-black/8">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-500 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Formulir Pemesanan Sewa</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                  Konfirmasi Periode &amp; Detail Sewa
                </h2>
                <p className="text-xs text-black/60 mt-0.5">
                  Lengkapi tanggal pemakaian sewa dan periksa daftar peralatan sebelum melanjutkan ke QRIS.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !submittingCheckout && setIsCheckoutModalOpen(false)}
                className="w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/60 hover:text-black transition-colors shrink-0 cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
              {/* Section 1: Periode Tanggal Sewa */}
              <div className="bg-zinc-50 border border-black/8 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-black/60 block">
                  1. Tentukan Periode Tanggal Sewa
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-black/75 mb-1.5">
                      Tanggal Mulai Sewa <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      id="checkout_tgl_sewa"
                      placeholder="Pilih tanggal mulai"
                      defaultDate={checkoutStartDate}
                      minDate="today"
                      className="bg-white border-black/15 text-black"
                      onChange={(_dates: Date[], dateStr: string) => {
                        if (!dateStr) return;
                        setCheckoutStartDate(dateStr);
                        if (new Date(dateStr) >= new Date(checkoutEndDate)) {
                          const next = new Date(dateStr);
                          next.setDate(next.getDate() + 1);
                          setCheckoutEndDate(next.toISOString().split('T')[0]);
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black/75 mb-1.5">
                      Tanggal Selesai Sewa <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      id="checkout_tgl_akhir_sewa"
                      placeholder="Pilih tanggal selesai"
                      defaultDate={checkoutEndDate}
                      minDate={checkoutStartDate || 'today'}
                      className="bg-white border-black/15 text-black"
                      onChange={(_dates: Date[], dateStr: string) => {
                        if (!dateStr) return;
                        setCheckoutEndDate(dateStr);
                      }}
                    />
                  </div>
                </div>

                {/* Durasi Info Banner */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-800">
                    <Clock className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Durasi Waktu Sewa:</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-brand-500 text-white text-xs font-black shadow-sm">
                    {checkoutDuration} Hari Sewa ({checkoutDuration} × 24 Jam)
                  </span>
                </div>
              </div>

              {/* Section 2: Detail Unit yang Disewa */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-black/60">
                    2. Unit Peralatan yang Disewa ({selectedItems.length} Produk)
                  </span>
                  <span className="text-[11px] text-black/40">
                    Total {selectedItems.reduce((acc, curr) => acc + (curr.qty || 1), 0)} unit
                  </span>
                </div>

                <div className="divide-y divide-black/5 rounded-2xl border border-black/8 bg-zinc-50/50 p-2 sm:p-3 max-h-60 overflow-y-auto">
                  {selectedItems.map((item) => {
                    const barang = item.barang;
                    const price = Number(barang?.harga_sewa || 0);
                    const subtotalItem = price * (item.qty || 1) * checkoutDuration;
                    const photoUrl =
                      barang?.fotos && barang.fotos.length > 0
                        ? `/assets/barang/${barang.fotos[0].foto}`
                        : '/assets/img/1 Kamera.jpg';

                    return (
                      <div key={item.id} className="py-2.5 first:pt-1 last:pb-1 flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-white border border-black/8 overflow-hidden shrink-0 p-1 flex items-center justify-center">
                          <img
                            src={photoUrl}
                            alt={barang?.nama_barang}
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider">
                            {barang?.merk?.merk || 'Brand'} • {barang?.kategori?.kategori || 'Kategori'}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-black truncate">
                            {barang?.nama_barang}
                          </h4>
                          <p className="text-[11px] text-black/60">
                            {item.qty} unit × {formatRupiah(price)} /hari
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs sm:text-sm font-extrabold text-brand-600 block">
                            {formatRupiah(subtotalItem)}
                          </span>
                          <span className="text-[10px] text-black/40">
                            ({checkoutDuration} hari)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Ringkasan Rincian Biaya */}
              <div className="bg-white border border-black/10 rounded-2xl p-4 sm:p-5 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-black/60 block">
                  3. Rincian Total Biaya
                </span>
                <div className="space-y-1.5 text-xs text-black/70">
                  <div className="flex justify-between">
                    <span>Subtotal Tarif Harian:</span>
                    <span className="font-semibold text-black">{formatRupiah(totalDailyEstimated)} /hari</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Durasi Pemakaian:</span>
                    <span className="font-semibold text-black">{checkoutDuration} Hari</span>
                  </div>
                </div>
                <div className="pt-2.5 border-t border-black/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-black block">Total Biaya Pembayaran</span>
                    <span className="text-[11px] text-black/40">Pembayaran instan via QRIS Midtrans</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-brand-600">
                    {formatRupiah(totalCheckoutAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-black/50 bg-black/2 p-3 rounded-xl border border-black/5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  Verifikasi pembayaran QRIS otomatis terhubung langsung ke Midtrans tanpa perlu konfirmasi manual.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-black/8 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                disabled={submittingCheckout}
                className="px-5 py-3 rounded-full border border-black/15 text-black/70 hover:text-black font-bold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                Kembali ke Keranjang
              </button>
              <button
                type="button"
                onClick={handleSubmitCheckout}
                disabled={submittingCheckout}
                className="px-7 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submittingCheckout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses Checkout...</span>
                  </>
                ) : (
                  <>
                    <span>Konfirmasi &amp; Bayar QRIS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QRIS Payment Modal upon Checkout */}
      <QrisPaymentModal
        isOpen={isQrisModalOpen}
        sewaId={bookedSewaId}
        onClose={() => {
          setIsQrisModalOpen(false);
          setBookedSewaId(null);
        }}
      />
    </div>
  );
}
