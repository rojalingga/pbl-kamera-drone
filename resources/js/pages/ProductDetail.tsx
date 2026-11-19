import React, { useState, useMemo } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import axios from 'axios';
import {
  Star,
  Minus,
  Plus,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  Upload,
  AlertCircle,
  CheckCircle2,
  Package,
  Camera,
  Layers,
  ChevronRight,
  FileText,
  ShoppingCart,
  Check,
  Loader2,
} from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import ProductCard from '@/components/landing/ProductCard';
import CustomerAuthModal from '@/components/auth/CustomerAuthModal';
import QrisPaymentModal from '@/components/booking/QrisPaymentModal';
import BookingModal from '@/components/booking/BookingModal';
import { toast, notifyServerError } from '@/utils/toast';
import { playSound } from '@/utils/sound';
import { PageProps } from '@/types';

interface ProductDetailProps {
  barang?: any;
  related?: any[];
}

export default function ProductDetail({ barang, related = [] }: ProductDetailProps) {
  const { auth } = usePage<PageProps>().props;
  const customer = auth?.customer;

  // Real photos from database
  const photos = useMemo(() => {
    if (barang?.fotos && barang.fotos.length > 0) {
      return barang.fotos.map((f: any) =>
        f.foto ? (f.foto.startsWith('http') ? f.foto : `/assets/barang/${f.foto}`) : '/assets/img/1 Kamera.jpg'
      );
    }
    return ['/assets/img/1 Kamera.jpg'];
  }, [barang]);

  const [activePhoto, setActivePhoto] = useState<string>(photos[0] || '/assets/img/1 Kamera.jpg');
  const [activeTab, setActiveTab] = useState<'description' | 'spec'>('description');

  // Modals & Booking flow
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);
  const [bookedSewaId, setBookedSewaId] = useState<string | null>(null);
  const [cartButtonState, setCartButtonState] = useState<'idle' | 'loading' | 'success'>('idle');

  const pricePerDay = Number(barang?.harga_sewa || 0);
  const stock = Number(barang?.stok || 0);
  const isAvailable = stock > 0;

  const formatRupiah = (val: number) => {
    return 'Rp' + val.toLocaleString('id-ID');
  };

  const handleAddToCart = async () => {
    if (!customer) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!isAvailable) {
      notifyServerError('Maaf, unit ini sedang habis tersewa.');
      return;
    }

    if (cartButtonState !== 'idle') return;

    setCartButtonState('loading');
    try {
      const res = await axios.post('/keranjang', {
        id_barang: barang.id,
        qty: 1,
      });

      if (res.data.status === 'success') {
        setCartButtonState('success');
        playSound('success');
        router.reload({ only: ['auth'] });

        setTimeout(() => {
          setCartButtonState('idle');
        }, 1800);
      } else {
        setCartButtonState('idle');
      }
    } catch (err: any) {
      setCartButtonState('idle');
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Gagal menambahkan ke keranjang.';
      notifyServerError(msg);
    }
  };

  const handleBookingClick = () => {
    if (!customer) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!isAvailable) {
      toast.fire({
        icon: 'error',
        title: 'Maaf, unit ini sedang habis tersewa.',
      });
      return;
    }

    setIsBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-black flex flex-col selection:bg-brand-500 selection:text-white">
      <Head title={`${barang?.nama_barang || 'Detail Produk'} — SkyLens`} />
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-36 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs font-semibold text-black/40 mb-8">
            <Link href="/" className="hover:text-black transition-colors">
              Beranda
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/katalog" className="hover:text-black transition-colors">
              Katalog
            </Link>
            {barang?.kategori && (
              <>
                <ChevronRight className="w-3 h-3" />
                <Link
                  href={`/katalog?kategori=${encodeURIComponent(barang.kategori.kategori)}`}
                  className="hover:text-black transition-colors"
                >
                  {barang.kategori.kategori}
                </Link>
              </>
            )}
            <ChevronRight className="w-3 h-3" />
            <span className="text-black truncate max-w-xs">{barang?.nama_barang}</span>
          </nav>

          {/* Main Product Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            {/* Left Column: Image Gallery (7 cols on lg) */}
            <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
              {/* Thumbnails */}
              {photos.length > 1 && (
                <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-visible shrink-0 pb-2 sm:pb-0">
                  {photos.map((photo: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhoto(photo)}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 transition-all p-1 bg-white shrink-0 ${
                        activePhoto === photo
                          ? 'border-brand-500 shadow-md scale-105'
                          : 'border-black/8 hover:border-black/20 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Main Photo Card */}
              <div className="flex-1 rounded-[32px] overflow-hidden bg-white border border-black/8 shadow-md relative aspect-[4/3] flex items-center justify-center p-4">
                <img
                  src={activePhoto}
                  alt={barang?.nama_barang}
                  className="w-full h-full object-contain rounded-2xl"
                />

                {/* Brand & Stock Floating Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  {barang?.merk && (
                    <span className="px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider">
                      {barang.merk.merk}
                    </span>
                  )}
                  {isAvailable ? (
                    <span className="px-3 py-1.5 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      Tersedia: {stock} unit
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full bg-rose-500/90 backdrop-blur-md text-white text-xs font-bold">
                      Habis Tersewa
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Pricing & Booking Form (5 cols on lg) */}
            <div className="lg:col-span-5 flex flex-col">
              {/* Product Title & Brand */}
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-500 mb-2">
                  <Package className="w-3.5 h-3.5" />
                  <span>{barang?.kategori?.kategori || 'Peralatan Produksi'}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-black tracking-tight leading-tight">
                  {barang?.nama_barang}
                </h1>
              </div>

              {/* Price Row */}
              <div className="p-4 rounded-2xl bg-white border border-black/8 shadow-sm flex items-center justify-between mb-6">
                <div>
                  <span className="text-[11px] font-bold text-black/40 uppercase tracking-wider block">
                    Tarif Sewa Harian
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-brand-600">
                      {formatRupiah(pricePerDay)}
                    </span>
                    <span className="text-xs font-semibold text-black/50">/ hari</span>
                  </div>
                </div>

                {barang?.denda_per_hari > 0 && (
                  <div className="text-right border-l border-black/8 pl-4">
                    <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider block">
                      Denda Keterlambatan
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-amber-600">
                      {formatRupiah(Number(barang.denda_per_hari))}
                      <span className="text-[11px] font-normal text-black/40"> /hari</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Action Box: 2 Buttons (Cart & Booking Now) */}
              <div className="bg-white border border-black/10 rounded-[32px] p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
                    <h3 className="text-sm font-extrabold text-black">Pilihan Penyewaan</h3>
                  </div>
                  <span className="text-xs text-brand-600 font-bold">QRIS Midtrans</span>
                </div>

                {/* Fitur Singkat */}
                <div className="space-y-2 text-xs text-black/70">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Unit bersih, terawat, &amp; lolos uji fungsi teknis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Konfirmasi instan &amp; pembayaran QRIS otomatis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Bebas atur tanggal mulai &amp; selesai saat booking</span>
                  </div>
                </div>

                {/* 2 Buttons: Cart & Booking Sekarang */}
                <div className="flex items-center gap-3 pt-2">
                  {/* Button 1: Icon Keranjang with Loader & Success Animation */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={cartButtonState !== 'idle' || !isAvailable}
                    title="Tambah ke Keranjang"
                    className={`h-14 px-5 rounded-2xl border-2 font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2.5 shrink-0 shadow-sm cursor-pointer disabled:cursor-not-allowed ${
                      cartButtonState === 'success'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-emerald-500/20'
                        : cartButtonState === 'loading'
                        ? 'border-brand-500 bg-brand-50 text-brand-600 opacity-90'
                        : 'border-brand-500 bg-brand-50 hover:bg-brand-100 text-brand-600'
                    }`}
                  >
                    {cartButtonState === 'loading' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
                        <span className="text-xs sm:text-sm font-bold">Menambahkan...</span>
                      </>
                    ) : cartButtonState === 'success' ? (
                      <>
                        <Check className="w-5 h-5 text-emerald-600 stroke-[3] animate-in zoom-in-75 duration-300" />
                        <span className="text-xs sm:text-sm font-bold text-emerald-700">Tersimpan!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        <span className="text-xs sm:text-sm font-bold">Keranjang</span>
                      </>
                    )}
                  </button>

                  {/* Button 2: Booking Sekarang */}
                  <button
                    type="button"
                    onClick={handleBookingClick}
                    disabled={!isAvailable}
                    className="flex-1 h-14 px-6 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Booking Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-[11px] text-black/45 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Jaminan keamanan unit &amp; transaksi terenkripsi</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Description & Specifications */}
          <div className="mt-16 bg-white border border-black/8 rounded-[32px] p-6 sm:p-10 shadow-sm">
            <div className="flex items-center gap-6 border-b border-black/8 pb-4 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('description')}
                className={`text-lg sm:text-xl font-bold transition-colors ${
                  activeTab === 'description' ? 'text-black border-b-2 border-brand-500 pb-2 -mb-4' : 'text-black/40 hover:text-black'
                }`}
              >
                Deskripsi Lengkap
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('spec')}
                className={`text-lg sm:text-xl font-bold transition-colors ${
                  activeTab === 'spec' ? 'text-black border-b-2 border-brand-500 pb-2 -mb-4' : 'text-black/40 hover:text-black'
                }`}
              >
                Informasi Rental
              </button>
            </div>

            <div className="text-black/75 leading-relaxed text-sm sm:text-base space-y-4">
              {activeTab === 'description' ? (
                <div>
                  <p className="whitespace-pre-line">
                    {barang?.keterangan ||
                      'Unit kamera atau drone profesional berkualitas tinggi dari SkyLens. Dirawat secara rutin dan diuji kelayakannya sebelum diserahkan ke pelanggan untuk memastikan performa produksi tanpa kendala.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div className="p-4 rounded-2xl bg-black/2 border border-black/5">
                    <span className="font-bold text-black block mb-1">Ketentuan Pengambilan</span>
                    <p className="text-black/60">
                      Unit diambil langsung di lokasi SkyLens Studio atau diantar sesuai kesepakatan. Harap membawa identitas asli saat serah terima unit.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/2 border border-black/5">
                    <span className="font-bold text-black block mb-1">Kondisi &amp; Garansi</span>
                    <p className="text-black/60">
                      Seluruh sensor, lensa optik, dan baterai telah dikalibrasi penuh. Jika terjadi kendala operasional, tim teknisi kami siap membantu 24/7.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related Gear Showcase */}
          {related.length > 0 && (
            <div className="mt-16 sm:mt-24">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                    Peralatan Serupa
                  </h2>
                  <p className="text-xs sm:text-sm text-black/50 mt-1">
                    Lengkapi produksi Anda dengan unit terkait dalam kategori ini.
                  </p>
                </div>
                <Link
                  href="/katalog"
                  className="text-xs sm:text-sm font-bold text-brand-500 hover:text-black transition-colors"
                >
                  Lihat Semua
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {related.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Customer Auth Modal (pops up if user is not logged in) */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
        }}
      />

      {/* Booking Form Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        barang={barang}
        onSuccess={(sewaId) => {
          setIsBookingModalOpen(false);
          setBookedSewaId(sewaId);
          setIsQrisModalOpen(true);
        }}
      />

      {/* QRIS Payment Modal */}
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
