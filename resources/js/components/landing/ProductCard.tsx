import React, { useEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Camera, ArrowRight, ShieldCheck, Tag } from 'lucide-react';

export interface ProductCardProps {
  item: any;
  className?: string;
  isDark?: boolean;
}

export default function ProductCard({ item, className = '', isDark = false }: ProductCardProps) {
  // Determine photo
  const photoFilename = item.fotos?.[0]?.foto;
  const photoUrl = photoFilename
    ? (photoFilename.startsWith('http') ? photoFilename : `/assets/barang/${photoFilename}`)
    : null;

  // Determine title, category, brand, and price
  const title = item.nama_barang || item.name || 'Peralatan SkyLens';
  const category = item.kategori?.kategori || item.category || 'Peralatan';
  const brand = item.merk?.merk || null;
  const rawPrice = item.harga_sewa !== undefined ? Number(item.harga_sewa) : item.priceValue || 0;
  const formattedPrice = 'Rp' + rawPrice.toLocaleString('id-ID');
  const stock = item.stok !== undefined ? Number(item.stok) : 1;
  const isAvailable = stock > 0;
  const itemId = item.id || 'all';

  const photoRef = useRef<HTMLImageElement>(null);
  const [isPhotoLoaded, setIsPhotoLoaded] = useState(false);
  const [hasPhotoError, setHasPhotoError] = useState(false);

  useEffect(() => {
    setIsPhotoLoaded(false);
    setHasPhotoError(false);
  }, [photoUrl]);

  useEffect(() => {
    if (photoRef.current?.complete) {
      setIsPhotoLoaded(true);
    }
  }, [photoUrl]);

  const showPhoto = Boolean(photoUrl) && !hasPhotoError;

  return (
    <div
      className={`${className} transition-transform duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02]`}
    >
      <Link
        href={`/katalog/${itemId}`}
        className={`group flex flex-col rounded-[28px] overflow-hidden transition-all duration-300 relative border ${
          isDark
            ? 'bg-zinc-900/90 border-white/10 hover:border-brand-500/60 shadow-lg hover:shadow-brand-500/10'
            : 'bg-white/95 border-black/8 hover:border-brand-500/40 shadow-sm hover:shadow-xl hover:shadow-brand-500/5'
        }`}
      >
        {/* Top Image area */}
        <div className="w-full aspect-[4/3] relative overflow-hidden bg-zinc-100 flex items-center justify-center">
          {showPhoto ? (
            <>
              <img
                ref={photoRef}
                src={photoUrl ?? ""}
                alt={title}
                loading="lazy"
                onLoad={() => setIsPhotoLoaded(true)}
                onError={() => setHasPhotoError(true)}
                className={`w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-500 ease-out ${
                  isPhotoLoaded ? "opacity-100" : "opacity-0"
                }`}
              />

              {!isPhotoLoaded && (
                <div className="absolute inset-0 animate-pulse bg-zinc-200/70 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-black/10" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-black/20">
              <Camera className="w-12 h-12" />
            </div>
          )}

          {/* Badges on image */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            {/* Category / Brand Pill */}
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-black/60 text-white shadow-sm">
              {brand ? `${brand} • ${category}` : category}
            </span>

            {/* Stock Pill */}
            {isAvailable ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md bg-emerald-500/90 text-white shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Tersedia: {stock}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md bg-rose-500/90 text-white shadow-sm">
                Habis Tersewa
              </span>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex flex-col flex-1 p-5 gap-2">
          {/* Title */}
          <h3
            className={`text-base font-bold leading-snug line-clamp-2 min-h-[44px] transition-colors ${
              isDark ? 'text-white group-hover:text-brand-400' : 'text-black group-hover:text-brand-500'
            }`}
          >
            {title}
          </h3>

          {/* Price & Action button */}
          <div className="pt-2 border-t border-black/5 flex items-center justify-between mt-auto">
            <div>
              <span className="text-[10px] uppercase font-semibold text-black/40 block">Harga Sewa</span>
              <p className="text-sm sm:text-base font-black text-brand-500">
                {formattedPrice} <span className="text-xs font-medium text-black/50">/hari</span>
              </p>
            </div>

            <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-600 group-hover:bg-brand-500 group-hover:text-white transition-all duration-300 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 -translate-x-0.5 group-hover:translate-x-0 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
