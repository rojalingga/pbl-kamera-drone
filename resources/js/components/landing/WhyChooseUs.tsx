import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

/* ─── Content ────────────────────────────────────────────────────────────── */
const items = [
  {
    heading: 'Peralatan Terawat & Siap Pakai',
    description: 'Setiap unit rutin diperiksa dan dirawat untuk memastikan performa optimal di lapangan.',
    image: '/assets/img/2 Lensa.jpg',
    imageAlt: 'Peralatan terawat siap digunakan',
  },
  {
    heading: 'Pilihan Alat Profesional',
    description: 'Koleksi lengkap mulai dari kamera, lensa pro, drone, hingga perlengkapan lighting.',
    image: '/assets/img/2 Syuting.jpg',
    imageAlt: 'Pilihan peralatan kamera profesional',
  },
  {
    heading: 'Sewa Praktis & Fleksibel',
    description: 'Sistem booking mudah dengan pilihan durasi sewa yang dapat disesuaikan kebutuhan proyek.',
    image: '/assets/img/2 Kamera.jpg',
    imageAlt: 'Sewa drone mudah dan fleksibel',
  },
] as const;

/* ─── Component ──────────────────────────────────────────────────────────── */
interface WhyChooseUsProps {
  isDark?: boolean;
}

export default function WhyChooseUs({ isDark = false }: WhyChooseUsProps) {
  const [active, setActive] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Scroll-based bidirectional reveal animation
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      const rect = contentRef.current.getBoundingClientRect();
      
      // Trigger when the top of the content is around 25% of the viewport height.
      // (Raised further as requested)
      const triggerPoint = window.innerHeight * 0.25;
      
      if (rect.top <= triggerPoint) {
        setIsRevealed(true);
      } else {
        setIsRevealed(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check on mount
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. Autoplay active item every 5 seconds, ONLY when revealed
  useEffect(() => {
    if (!isRevealed) return;

    autoplayRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % items.length);
    }, 5000);

    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [active, isRevealed]); // Re-runs on active change, resetting the timer if manually clicked

  return (
    <section 
      className="relative overflow-hidden bg-transparent transition-colors duration-1000 ease-in-out"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-5 lg:px-6 pt-16 pb-32 lg:pt-24 lg:pb-56 relative z-10">
        
        {/* ── CENTERED HEADER ── */}
        <div className="mb-12 lg:mb-20 flex flex-col items-center text-center">
          <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-4 transition-colors duration-700 ${
            isDark ? 'text-brand-400' : 'text-brand-500'
          }`}>
            <Sparkles className="w-3.5 h-3.5" /> Kenapa Memilih Kami
          </div>
          <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] max-w-none transition-colors duration-700 ${
            isDark ? 'text-white' : 'text-black'
          }`}>
            Lebih dari <span className="text-brand-500">Sekadar Sewa</span> Peralatan
          </h2>
          <p className={`mt-4 text-base lg:text-lg max-w-xl transition-colors duration-700 ${
            isDark ? 'text-white/60' : 'text-black/60'
          }`}>
            Solusi penyewaan terpercaya untuk setiap kebutuhan produksi Anda, dari proyek kecil hingga profesional.
          </p>
        </div>

        {/* ── CONTENT AREA ── */}
        <div ref={contentRef} className="relative w-full">
          
          {/* ── CONTENT AREA (MOBILE / TABLET) ── */}
          <div className="grid grid-cols-1 lg:hidden gap-6 sm:gap-8">
            {items.map((item, i) => (
              <div key={i} className={`flex flex-col border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/5'
              }`}>
                <div className="w-full aspect-[4/3] relative overflow-hidden">
                  <img src={item.image} alt={item.imageAlt} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] pointer-events-none rounded-[2rem]" />
                </div>
                <div className="p-6 sm:p-8 flex flex-col gap-2">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-500/10 text-brand-500 font-bold text-sm mb-2">
                    {i + 1}
                  </div>
                  <h3 className={`text-xl font-bold transition-colors duration-700 ${isDark ? 'text-white' : 'text-black'}`}>{item.heading}</h3>
                  <p className={`text-sm leading-relaxed transition-colors duration-700 ${isDark ? 'text-white/70' : 'text-black/70'}`}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── CONTENT AREA (DESKTOP) ── */}
          <div className="hidden lg:block relative lg:min-h-[500px]">
            
            {/* ── LEFT: Animated Menu List ── */}
            <div 
              className={`absolute left-0 top-4 w-[42%] z-10 transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isRevealed 
                  ? 'opacity-100 translate-x-0 pointer-events-auto' 
                  : 'opacity-0 -translate-x-16 pointer-events-none'
              }`}
            >
              <div className="flex flex-col gap-12 max-w-lg">
                {items.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`text-left flex flex-col relative transition-all duration-300 ${
                      active === i 
                        ? 'opacity-100' 
                        : `opacity-40 hover:opacity-70 ${isDark ? 'text-white' : 'text-black'}`
                    }`}
                  >
                    {/* Vertical line indicator */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-full transition-colors duration-300 ${
                      active === i ? 'bg-brand-500' : 'bg-transparent'
                    }`} />
                    
                    <div className="pl-6">
                      <h3 className={`text-2xl font-bold mb-2 transition-colors duration-700 ${isDark ? 'text-white' : 'text-black'}`}>{item.heading}</h3>
                      <p className={`text-base leading-relaxed max-w-sm transition-colors duration-700 ${isDark ? 'text-white/70' : 'text-black/70'}`}>
                        {item.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── RIGHT: Image Container (Fixed size, Slides from Center to Right) ── */}
            <div 
              className={`w-[58%] ml-auto transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] relative z-0 ${
                isRevealed ? 'translate-x-0' : '-translate-x-[36.2%]'
              }`}
            >
              <div className="relative w-full aspect-[16/11] rounded-[3rem] overflow-hidden shadow-2xl bg-black/5 mx-auto">
                {items.map((item, i) => (
                  <img
                    key={item.image}
                    src={item.image}
                    alt={item.imageAlt}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                      active === i ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                  />
                ))}
                {/* Subtle inner shadow overlay */}
                <div className="absolute inset-0 rounded-[3rem] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] z-20 pointer-events-none" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
