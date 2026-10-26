import React, { useRef } from 'react';
import { Link } from '@inertiajs/react';
import { Sparkles, ArrowRight, ShieldCheck, Star, Clock, CheckCircle2 } from 'lucide-react';
import gsap from 'gsap';

interface HeroProps {
  onScrollToUnitUnggulan: (e: React.MouseEvent) => void;
  isDark?: boolean;
}

export default function Hero({ onScrollToUnitUnggulan, isDark = false }: HeroProps) {
  const visualRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!visualRef.current) return;
    const rect = visualRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    gsap.to(visualRef.current, {
      rotateX,
      rotateY,
      duration: 0.5,
      ease: 'power2.out',
      transformPerspective: 1200,
      transformOrigin: 'center center',
    });
  };

  const handleMouseLeave = () => {
    if (!visualRef.current) return;
    gsap.to(visualRef.current, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.8,
      ease: 'power2.out',
    });
  };

  return (
    <div className="relative overflow-hidden bg-transparent pt-32 sm:pt-36 lg:pt-40 pb-16 lg:pb-24">
      {/* Background Ambient Radial Glow */}
      <div className="absolute top-1/4 right-5 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-10 w-[400px] h-[400px] bg-amber-400/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-5 lg:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column — Value Proposition & CTA */}
          <div className="lg:col-span-7 flex flex-col items-start">
            {/* Pill Header */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-200/60 text-brand-600 text-xs font-bold tracking-wide mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>Rental Kamera Sinema &amp; Drone Terpercaya</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6 text-black">
              Wujudkan Visual Sinematik dengan{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-amber-500">
                Peralatan Pro
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg leading-relaxed text-black/65 mb-8 max-w-xl">
              Sewa kamera mirrorless full-frame, drone aerial 4K/8K, lensa sinema, dan perlengkapan produksi dengan kondisi terawat prima, siap pakai, dan pembayaran QRIS instan.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <Link
                href="/katalog"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-brand-500/25 hover:shadow-brand-500/35 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span>Jelajahi Katalog Lengkap</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#unit-unggulan"
                onClick={onScrollToUnitUnggulan}
                className="w-full sm:w-auto px-7 py-4 rounded-full bg-white hover:bg-black/5 text-black font-bold text-sm sm:text-base border border-black/10 transition-colors flex items-center justify-center cursor-pointer shadow-sm"
              >
                Unit Unggulan
              </a>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 pt-8 border-t border-black/10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs sm:text-sm font-semibold text-black/70">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 100% Terawat &amp; Bersih
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-500" /> Booking Cepat via QRIS
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-500" /> Pengambilan Fleksibel
              </span>
            </div>
          </div>

          {/* Right Column — 3D Interactive Hero Visual */}
          <div
            ref={visualRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="lg:col-span-5 relative will-change-transform"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Visual Glass Container */}
            <div className="relative rounded-[36px] overflow-hidden border border-black/10 shadow-2xl bg-white/40 backdrop-blur-xl p-3">
              <div className="relative rounded-[28px] overflow-hidden aspect-[4/3] bg-zinc-900">
                <img
                  src="/assets/img/Hero.jpg"
                  alt="SkyLens Equipment"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Overlaid Bottom Tagline */}
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-brand-400 block mb-1">
                    STANDAR SINEMATOGRAFI
                  </span>
                  <p className="text-sm font-extrabold leading-snug">
                    Dari kamera Sony FX3, DJI Inspire, hingga lensa prime G Master.
                  </p>
                </div>
              </div>
            </div>

            {/* Floating Glassmorphic Pill 1 — Rating */}
            <div className="absolute -top-4 -left-4 sm:-left-6 px-4 py-2.5 rounded-2xl bg-white/90 backdrop-blur-xl border border-black/10 shadow-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-white flex items-center justify-center">
                <Star className="w-4 h-4 fill-current" />
              </div>
              <div>
                <p className="text-xs font-black text-black">4.9 / 5.0</p>
                <p className="text-[10px] text-black/50 font-medium">Ulasan Kreator</p>
              </div>
            </div>

            {/* Floating Glassmorphic Pill 2 — Ready Stock */}
            <div className="absolute -bottom-4 -right-4 sm:-right-6 px-4 py-2.5 rounded-2xl bg-white/90 backdrop-blur-xl border border-black/10 shadow-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-black">90+ Unit Gear</p>
                <p className="text-[10px] text-black/50 font-medium">Siap Disewa Kapan Saja</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
