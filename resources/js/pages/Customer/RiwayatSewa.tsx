import React, { useState, useEffect } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import axios from 'axios';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import QrisPaymentModal from '@/components/booking/QrisPaymentModal';
import { confirmDialog, notifySuccess, notifyServerError } from '@/utils/toast';
import { PageProps } from '@/types';
import {
  Calendar,
  CreditCard,
  Clock,
  Package,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  Camera,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface RiwayatSewaProps {
  sewas: any[];
  isLocal?: boolean;
}

export default function RiwayatSewa({ sewas = [], isLocal = true }: RiwayatSewaProps) {
  const { auth } = usePage<PageProps>().props;
  const [sewaList, setSewaList] = useState<any[]>(sewas);
  const [activeTab, setActiveTab] = useState<'semua' | 'pending' | 'aktif' | 'selesai'>('semua');
  const [selectedSewaId, setSelectedSewaId] = useState<string | null>(null);
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    setSewaList(sewas);
  }, [sewas]);

  const customerName = auth?.customer?.nama_lengkap || 'Customer';

  const filteredSewas = sewaList.filter((s) => {
    if (activeTab === 'pending') {
      return s.status_pembayaran === 'Pending';
    }
    if (activeTab === 'aktif') {
      return s.status_pembayaran === 'Confirmed' && s.status_sewa !== 'Pengembalian';
    }
    if (activeTab === 'selesai') {
      return s.status_sewa === 'Pengembalian';
    }
    return true;
  });

  const handlePayClick = (sewaId: string) => {
    setSelectedSewaId(sewaId);
    setIsQrisModalOpen(true);
  };

  const handleCancelSewa = async (sewaId: string, noSewa: string) => {
    const confirmed = await confirmDialog(
      'Batalkan Sewa?',
      `Apakah Anda yakin ingin membatalkan transaksi ${noSewa || 'sewa'} ini? Unit peralatan akan otomatis dikembalikan ke stok katalog.`
    );
    if (!confirmed) return;

    setCancellingId(sewaId);
    try {
      const res = await axios.post(`/customer/sewa/${sewaId}/cancel`);
      if (res.data.status === 'success') {
        notifySuccess('Pemesanan Dibatalkan', res.data.message || 'Pemesanan berhasil dibatalkan.');
        setSewaList((prev) => prev.filter((s) => s.id !== sewaId));
        router.reload({ only: ['sewas'] });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal membatalkan pemesanan sewa.';
      notifyServerError(msg);
    } finally {
      setCancellingId(null);
    }
  };

  const formatRupiah = (val: number | string) => {
    const num = Number(val) || 0;
    return 'Rp' + num.toLocaleString('id-ID');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-black flex flex-col selection:bg-brand-500 selection:text-white">
      <Head title="Riwayat Sewa — SkyLens" />
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-36 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Title & Customer Greeting */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 text-xs font-bold uppercase tracking-widest mb-3">
                <Package className="w-3.5 h-3.5" /> Dashboard Penyewaan
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">
                Riwayat Sewa Saya
              </h1>
              <p className="text-sm text-black/60 mt-1">
                Halo, <span className="font-semibold text-black">{customerName}</span>. Pantau status pemesanan dan pembayaran peralatan Anda.
              </p>
            </div>

            <Link
              href="/katalog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white hover:bg-brand-500 transition-colors text-xs sm:text-sm font-semibold shrink-0"
            >
              Sewa Unit Baru <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Quick Counter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-sm">
              <span className="text-xs text-black/50 block mb-1">Total Transaksi</span>
              <span className="text-2xl font-black text-black">{sewas.length}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-sm">
              <span className="text-xs text-amber-600 font-medium block mb-1">Menunggu Bayar</span>
              <span className="text-2xl font-black text-amber-600">
                {sewas.filter((s) => s.status_pembayaran === 'Pending').length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-sm">
              <span className="text-xs text-brand-600 font-medium block mb-1">Sewa Berjalan</span>
              <span className="text-2xl font-black text-brand-600">
                {sewas.filter((s) => s.status_pembayaran === 'Confirmed' && s.status_sewa !== 'Pengembalian').length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-sm">
              <span className="text-xs text-emerald-600 font-medium block mb-1">Selesai Kembali</span>
              <span className="text-2xl font-black text-emerald-600">
                {sewas.filter((s) => s.status_sewa === 'Pengembalian').length}
              </span>
            </div>
          </div>

          {/* Tab Filter Navigation */}
          <div className="flex items-center gap-2 p-1.5 bg-black/5 rounded-2xl mb-8 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('semua')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'semua'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Semua ({sewaList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Menunggu Bayar ({sewaList.filter((s) => s.status_pembayaran === 'Pending').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('aktif')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'aktif'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Sewa Berjalan ({sewaList.filter((s) => s.status_pembayaran === 'Confirmed' && s.status_sewa !== 'Pengembalian').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('selesai')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'selesai'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Selesai ({sewaList.filter((s) => s.status_sewa === 'Pengembalian').length})
            </button>
          </div>

          {/* Rental List */}
          {filteredSewas.length > 0 ? (
            <div className="space-y-5">
              {filteredSewas.map((sewa) => {
                const isPending = sewa.status_pembayaran === 'Pending';
                const isConfirmed = sewa.status_pembayaran === 'Confirmed';
                const isReturned = sewa.status_sewa === 'Pengembalian';

                return (
                  <div
                    key={sewa.id}
                    className="bg-white border border-black/8 rounded-3xl p-5 sm:p-7 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Top Row: No. Sewa + Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-black uppercase tracking-wider block">
                            {sewa.no_sewa || 'SEWA-DOKUMEN'}
                          </span>
                          <span className="text-[11px] text-black/50">
                            Dibuat: {formatDate(sewa.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/60">
                            <Clock className="w-3 h-3" /> Menunggu QRIS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
                            <ShieldCheck className="w-3 h-3" /> Lunas Terverifikasi
                          </span>
                        )}

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isReturned
                              ? 'bg-gray-100 text-gray-700'
                              : sewa.status_sewa?.startsWith('Terlambat')
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-brand-50 text-brand-700'
                          }`}
                        >
                          {sewa.status_sewa}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Items List */}
                    <div className="py-4 space-y-3">
                      {sewa.details?.map((detail: any) => {
                        const fotoName = detail.barang?.fotos?.[0]?.foto;
                        const fotoUrl = fotoName ? `/assets/barang/${fotoName}` : null;

                        return (
                          <div
                            key={detail.id}
                            className="flex items-center gap-4 py-2"
                          >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/4 border border-black/5 overflow-hidden shrink-0 flex items-center justify-center">
                              {fotoUrl ? (
                                <img
                                  src={fotoUrl}
                                  alt={detail.barang?.nama_barang || 'Barang'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Camera className="w-6 h-6 text-black/20" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] uppercase font-bold text-black/40 tracking-wider">
                                {detail.barang?.merk?.merk || 'Brand'} • {detail.barang?.kategori?.kategori || 'Kategori'}
                              </span>
                              <h4 className="text-sm sm:text-base font-bold text-black truncate">
                                {detail.barang?.nama_barang}
                              </h4>
                              <p className="text-xs text-black/60 mt-0.5">
                                {detail.qty} unit × {formatRupiah(detail.harga_sewa_satuan)} /hari
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-sm font-extrabold text-black">
                                {formatRupiah(detail.qty * detail.harga_sewa_satuan)}
                              </span>
                              <span className="text-[11px] text-black/40 block">/hari</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom: Date Range, Total & Action Button */}
                    <div className="pt-4 border-t border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs text-black/60">
                        <Calendar className="w-4 h-4 text-brand-500" />
                        <span>
                          Periode Sewa:{' '}
                          <strong className="text-black">
                            {formatDate(sewa.tgl_sewa)} s/d {formatDate(sewa.tgl_akhir_sewa)}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5">
                        <div className="text-left sm:text-right">
                          <span className="text-[11px] text-black/50 block">Total Biaya Sewa</span>
                          <span className="text-lg sm:text-xl font-black text-brand-600">
                            {formatRupiah(sewa.total_biaya)}
                          </span>
                        </div>

                        {isPending ? (
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleCancelSewa(sewa.id, sewa.no_sewa)}
                              disabled={cancellingId === sewa.id}
                              className="px-4 py-2.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{cancellingId === sewa.id ? 'Membatalkan...' : 'Batalkan Sewa'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePayClick(sewa.id)}
                              className="px-6 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <CreditCard className="w-4 h-4" /> Bayar QRIS
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold px-4 py-2 rounded-full bg-emerald-50">
                            <CheckCircle2 className="w-4 h-4" /> Terverifikasi
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 bg-white border border-black/5 rounded-3xl flex flex-col items-center justify-center text-center p-6 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-black/4 flex items-center justify-center text-black/30 mb-4">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-black mb-1">
                Belum ada transaksi di tab ini
              </h3>
              <p className="text-xs sm:text-sm text-black/50 max-w-sm mb-6">
                Mulai sewa kamera sinema, drone, atau lensa profesional untuk proyek kreatif Anda berikutnya.
              </p>
              <Link
                href="/katalog"
                className="px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
              >
                Jelajahi Katalog Peralatan
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* QRIS Modal for pending payments */}
      <QrisPaymentModal
        isOpen={isQrisModalOpen}
        sewaId={selectedSewaId}
        onClose={() => {
          setIsQrisModalOpen(false);
          setSelectedSewaId(null);
        }}
        isLocal={isLocal}
      />
    </div>
  );
}
