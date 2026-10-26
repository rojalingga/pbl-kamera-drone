import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from '@inertiajs/react';
import { X, CheckCircle2, Clock, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';

export interface QrisPaymentModalProps {
  isOpen: boolean;
  sewaId: string | null;
  onClose: () => void;
  isLocal?: boolean;
}

export default function QrisPaymentModal({
  isOpen,
  sewaId,
  onClose,
  isLocal = true,
}: QrisPaymentModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPayment = async () => {
    if (!sewaId) return;
    try {
      const res = await axios.get(`/customer/payment/${sewaId}`);
      if (res.data.status === 'success') {
        const info = res.data.data;
        setData(info);

        const status = info.pembayaran?.transaction_status;
        if (status === 'settlement') {
          setIsSuccess(true);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat detail pembayaran.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && sewaId) {
      setLoading(true);
      setError(null);
      setIsSuccess(false);
      fetchPayment();

      // Poll status every 3.5 seconds
      pollTimerRef.current = setInterval(() => {
        fetchPayment();
      }, 3500);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, sewaId]);

  if (!isOpen) return null;

  const sewa = data?.sewa;
  const pembayaran = data?.pembayaran;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-lg w-full bg-white/95 backdrop-blur-2xl border border-black/10 rounded-[32px] shadow-2xl overflow-hidden p-6 sm:p-8 my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/60 hover:text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mb-3" />
            <p className="text-sm font-semibold text-black/60">Menyiapkan kode QRIS Midtrans...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500 font-semibold mb-4">{error}</p>
            <button
              type="button"
              onClick={fetchPayment}
              className="px-5 py-2.5 rounded-full bg-brand-500 text-white font-bold text-xs"
            >
              Coba Lagi
            </button>
          </div>
        ) : isSuccess || pembayaran?.transaction_status === 'settlement' ? (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">
              Pembayaran Berhasil!
            </span>
            <h2 className="text-2xl font-black text-black tracking-tight mb-2">
              Sewa Telah Dikonfirmasi
            </h2>
            <p className="text-xs sm:text-sm text-black/60 max-w-sm mb-6">
              Terima kasih! Pembayaran untuk dokumen{' '}
              <span className="font-bold text-black">{sewa?.no_sewa}</span> telah terverifikasi.
              Peralatan Anda siap disiapkan sesuai jadwal.
            </p>

            <div className="w-full bg-black/5 rounded-2xl p-4 mb-6 flex justify-between items-center text-sm">
              <span className="text-black/60">Total Terbayar:</span>
              <span className="font-bold text-brand-600 text-lg">
                Rp{sewa?.total_biaya}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Link
                href="/riwayat-sewa"
                className="flex-1 py-3 px-6 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all text-center"
              >
                Lihat Riwayat Sewa
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-6 rounded-full bg-black/5 hover:bg-black/10 text-black font-semibold text-xs sm:text-sm transition-all"
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="w-5 h-5 text-brand-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-brand-500">
                Pembayaran QRIS Midtrans
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight mb-1">
              Scan untuk Membayar
            </h2>
            <p className="text-xs text-black/60 max-w-xs mb-4">
              Gunakan GoPay, OVO, Dana, BCA Mobile, atau aplikasi e-wallet apa pun yang mendukung QRIS.
            </p>

            {/* Total Pill */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-brand-50 border border-brand-200/60 mb-5">
              <span className="text-xs text-black/60">Total Biaya:</span>
              <span className="text-base sm:text-lg font-black text-brand-600">
                Rp{sewa?.total_biaya}
              </span>
            </div>

            {/* QR Code Container */}
            <div className="relative p-4 rounded-3xl bg-white border border-black/10 shadow-lg mb-4 flex flex-col items-center">
              {pembayaran?.qr_url ? (
                <img
                  src={pembayaran.qr_url}
                  alt="QRIS Midtrans"
                  className="w-56 h-56 object-contain rounded-xl"
                />
              ) : pembayaran?.qr_string ? (
                /* Fallback QR generator from api if qr_url is not absolute */
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    pembayaran.qr_string
                  )}`}
                  alt="QRIS Code"
                  className="w-56 h-56 object-contain rounded-xl"
                />
              ) : (
                <div className="w-56 h-56 flex flex-col items-center justify-center bg-gray-50 rounded-xl text-black/40 text-xs">
                  <QrCode className="w-10 h-10 mb-2 opacity-50" />
                  <span>Kode QR sedang diproses</span>
                </div>
              )}

              {/* Status Indicator */}
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                Menunggu Pembayaran...
              </div>
            </div>

            {/* Expiry & Order Info */}
            <div className="text-[11px] text-black/50 mb-5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Nomor Sewa: <strong className="text-black/80">{sewa?.no_sewa}</strong>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-2.5">
              <div className="flex gap-2.5">
                <Link
                  href="/riwayat-sewa"
                  className="flex-1 py-3 px-4 rounded-2xl bg-black/5 hover:bg-black/10 text-black font-bold text-xs transition-colors text-center"
                >
                  Bayar Nanti di Riwayat Sewa
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-5 rounded-2xl border border-black/10 text-black/70 hover:text-black font-bold text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-black/40">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Transaksi aman &amp; otomatis terverifikasi sistem</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
