import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
  X,
  Calendar,
  Minus,
  Plus,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Package,
} from 'lucide-react';
import DatePicker from '@/components/form/date-picker';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  barang: any;
  onSuccess: (sewaId: string) => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  barang,
  onSuccess,
}: BookingModalProps) {
  if (!isOpen || !barang) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [tglSewa, setTglSewa] = useState<string>(todayStr);
  const [tglAkhirSewa, setTglAkhirSewa] = useState<string>(tomorrowStr);
  const [quantity, setQuantity] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pricePerDay = Number(barang?.harga_sewa || 0);
  const stock = Number(barang?.stok || 0);

  const rentalDays = useMemo(() => {
    if (!tglSewa || !tglAkhirSewa) return 1;
    const start = new Date(tglSewa);
    const end = new Date(tglAkhirSewa);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }, [tglSewa, tglAkhirSewa]);

  const totalRentalPrice = pricePerDay * quantity * rentalDays;

  const formatRupiah = (val: number) => {
    return 'Rp' + val.toLocaleString('id-ID');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (quantity > stock) {
      setErrorMsg(`Jumlah unit melebihi stok yang tersedia (${stock} unit).`);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id_barang', barang.id);
      formData.append('qty', String(quantity));
      formData.append('tgl_sewa', tglSewa);
      formData.append('tgl_akhir_sewa', tglAkhirSewa);

      const res = await axios.post('/booking', formData);

      if (res.data.status === 'success') {
        const sewaId = res.data.sewa.id;
        onSuccess(sewaId);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Gagal memproses booking. Pastikan data tanggal dan stok sesuai.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const photoUrl =
    barang.fotos && barang.fotos.length > 0
      ? `/assets/barang/${barang.fotos[0].foto}`
      : '/assets/img/1 Kamera.jpg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-black/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-black/10 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h3 className="text-base sm:text-lg font-black text-black">
              Formulir Booking Sewa
            </h3>
            <p className="text-xs text-black/50">
              Konfirmasi tanggal dan jumlah unit peralatan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 text-black/50 hover:text-black transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Product Summary Row */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-zinc-50 border border-black/5">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-black/10 shrink-0 p-1 flex items-center justify-center">
              <img
                src={photoUrl}
                alt={barang.nama_barang}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 block truncate">
                {barang.kategori?.kategori || 'Peralatan'}
              </span>
              <h4 className="text-sm font-extrabold text-black truncate">
                {barang.nama_barang}
              </h4>
              <p className="text-xs font-semibold text-black/60">
                {formatRupiah(pricePerDay)}{' '}
                <span className="text-[11px] font-normal text-black/40">/ hari</span>
              </p>
            </div>
          </div>

          {/* Tanggal Sewa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 mb-1.5 block">
                Mulai Sewa <span className="text-red-500">*</span>
              </label>
              <DatePicker
                id="booking_tgl_sewa"
                placeholder="Pilih tanggal mulai"
                defaultDate={tglSewa}
                minDate="today"
                className="bg-white border-black/15 text-black"
                onChange={(_dates: Date[], dateStr: string) => {
                  if (!dateStr) return;
                  setTglSewa(dateStr);
                  if (new Date(dateStr) >= new Date(tglAkhirSewa)) {
                    const next = new Date(dateStr);
                    next.setDate(next.getDate() + 1);
                    setTglAkhirSewa(next.toISOString().split('T')[0]);
                  }
                }}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 mb-1.5 block">
                Selesai Sewa <span className="text-red-500">*</span>
              </label>
              <DatePicker
                id="booking_tgl_akhir_sewa"
                placeholder="Pilih tanggal selesai"
                defaultDate={tglAkhirSewa}
                minDate={tglSewa || 'today'}
                className="bg-white border-black/15 text-black"
                onChange={(_dates: Date[], dateStr: string) => {
                  if (!dateStr) return;
                  setTglAkhirSewa(dateStr);
                }}
              />
            </div>
          </div>

          {/* Jumlah Unit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 block">
                Jumlah Unit
              </label>
              <span className="text-xs text-black/50 font-medium">
                Tersedia: <strong className="text-black">{stock} unit</strong>
              </span>
            </div>

            <div className="flex items-center justify-between w-full h-11 rounded-xl border border-black/15 px-3 bg-white">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-black/60 hover:text-black hover:bg-black/5 disabled:opacity-30 cursor-pointer transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-extrabold text-sm text-black">
                {quantity} unit
              </span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                disabled={quantity >= stock}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-black/60 hover:text-black hover:bg-black/5 disabled:opacity-30 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Ringkasan Durasi & Biaya */}
          <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-black/60 block">
                Durasi: <strong className="text-black">{rentalDays} Hari</strong> ({quantity} unit)
              </span>
              <span className="text-[11px] text-black/40">
                {quantity} × {formatRupiah(pricePerDay)} × {rentalDays} hari
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block">
                Total Biaya Sewa
              </span>
              <span className="text-lg font-black text-brand-600">
                {formatRupiah(totalRentalPrice)}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || stock <= 0}
              className="w-full py-3.5 px-6 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                'Memproses Booking...'
              ) : (
                <>
                  <span>Konfirmasi Booking &amp; Bayar QRIS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-black/45">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Foto jaminan identitas akan diverifikasi saat pengambilan unit</span>
          </div>
        </form>
      </div>
    </div>
  );
}
