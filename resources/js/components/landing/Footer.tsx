import React from 'react';
import { Link } from '@inertiajs/react';
import AiChatWidget from '@/components/common/AiChatWidget';

export default function Footer() {
  const handleHomeClick = (e: React.MouseEvent) => {
    if (window.location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-black text-white pt-16 pb-10 lg:pt-20 lg:pb-12 border-t border-zinc-800">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-5 lg:px-6">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-12">
          
          {/* Brand Area (4 cols on lg) */}
          <div className="lg:col-span-4 flex flex-col items-start">
            <Link href="/" onClick={handleHomeClick} className="inline-block mb-5">
              <img
                src="/assets/img/Icon White.svg"
                alt="SkyLens Logo"
                className="h-12 w-auto object-contain"
              />
            </Link>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-md lg:max-w-[360px] xl:max-w-[400px]">
              Sewa kamera, lensa, dan drone profesional dengan peralatan terawat dan pilihan yang sesuai untuk kebutuhan produksi Anda.
            </p>
          </div>

          {/* Support / Information (2 cols on lg) */}
          <div className="lg:col-span-2 flex flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
              Informasi
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-zinc-300 hover:text-brand-500 transition-colors duration-200"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-zinc-300 hover:text-brand-500 transition-colors duration-200"
                >
                  Kebijakan Privasi
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-zinc-300 hover:text-brand-500 transition-colors duration-200"
                >
                  Syarat &amp; Ketentuan
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media Area (2 cols on lg) */}
          <div className="lg:col-span-2 flex flex-col lg:items-end">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
              Ikuti Kami
            </h3>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center transition-all duration-200 hover:bg-brand-500 hover:border-brand-500 hover:scale-105 group"
              >
                <img
                  src="/assets/img/Instagram.png"
                  alt="Instagram"
                  className="w-5 h-5 object-contain brightness-0 invert opacity-80 group-hover:opacity-100 transition-opacity"
                />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center transition-all duration-200 hover:bg-brand-500 hover:border-brand-500 hover:scale-105 group"
              >
                <img
                  src="/assets/img/TikTok.png"
                  alt="TikTok"
                  className="w-5 h-5 object-contain brightness-0 invert opacity-80 group-hover:opacity-100 transition-opacity"
                />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center transition-all duration-200 hover:bg-brand-500 hover:border-brand-500 hover:scale-105 group"
              >
                <img
                  src="/assets/img/Twitter.png"
                  alt="Twitter"
                  className="w-5 h-5 object-contain brightness-0 invert opacity-80 group-hover:opacity-100 transition-opacity"
                />
              </a>
            </div>
          </div>

          {/* Lokasi / Google Maps (4 cols on lg) */}
          <div className="lg:col-span-4 flex flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
              Lokasi Kami
            </h3>
            <div className="relative h-56 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
              <iframe
                src="https://www.google.com/maps?q=-7.9826,112.6307&z=15&hl=id&output=embed"
                title="Lokasi SkyLens - Kota Malang"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="pointer-events-none absolute inset-0 h-full w-full border-0"
              />
              <a
                href="https://www.google.com/maps/search/?api=1&query=-7.9826,112.6307"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Buka lokasi SkyLens di Google Maps"
                className="absolute inset-0 z-10 flex items-end p-3 transition-colors hover:bg-black/20"
              >
                <span className="rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white">
                  Buka di Google Maps
                </span>
              </a>
            </div>
          </div>

        </div>

        {/* Horizontal Divider */}
        <div className="border-t border-zinc-800 pt-8 flex items-center justify-between text-xs text-zinc-500">
          <p>© 2026 SkyLens. All rights reserved.</p>
        </div>

      </div>
      <AiChatWidget mode="public" />
    </footer>
  );
}
