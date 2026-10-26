import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const categories = [
  {
    id: 'kamera',
    subtitle: 'TANGKAP SETIAP MOMEN',
    title: 'KAMERA PROFESIONAL',
    image: '/assets/img/1 Kamera.jpg',
  },
  {
    id: 'drone',
    subtitle: 'AMBIL SUDUT TERBAIK DARI UDARA',
    title: 'DRONE CANGGIH',
    image: '/assets/img/1 Drone.jpg',
  },
  {
    id: 'lensa',
    subtitle: 'TAJAM DAN FOKUS',
    title: 'LENSA PREMIUM',
    image: '/assets/img/1 Lensa.jpg',
  },
  {
    id: 'syuting',
    subtitle: 'LENGKAPI KEBUTUHAN PRODUKSI',
    title: 'PERALATAN SYUTING',
    image: '/assets/img/1 Syuting.jpg',
  },
];

const FRAME_POS = [
  // 0: Tersembunyi di belakang
  {
    x: '0%',
    y: '0%',
    rotate: '-8deg',
    scale: 0.85,
    zIndex: 0,
    opacity: 0,
    shadow: '0 0 0 rgba(0,0,0,0)',
  },
  // 1: Paling belakang terlihat
  {
    x: '-6%',
    y: '8%',
    rotate: '-5deg',
    scale: 0.9,
    zIndex: 10,
    opacity: 1,
    shadow: '0 4px 15px rgba(0,0,0,0.05)',
  },
  // 2: Tengah
  {
    x: '6%',
    y: '-4%',
    rotate: '4deg',
    scale: 0.95,
    zIndex: 20,
    opacity: 1,
    shadow: '0 10px 30px rgba(0,0,0,0.08)',
  },
  // 3: Paling depan (Aktif)
  {
    x: '0%',
    y: '0%',
    rotate: '0deg',
    scale: 1,
    zIndex: 30,
    opacity: 1,
    shadow: '0 20px 50px -12px rgba(0,0,0,0.2)',
  },
];

function slotFor(itemIdx: number, activeIdx: number): number {
  const offset = (itemIdx - activeIdx + categories.length) % categories.length;
  // offset 0 (aktif) -> slot 3 (paling depan)
  // offset 1 -> slot 2
  // offset 2 -> slot 1
  // offset 3 -> slot 0 (tersembunyi)
  return categories.length - 1 - offset;
}

interface EquipmentCategoriesProps {
  isDark?: boolean;
}

export default function EquipmentCategories({ isDark = false }: EquipmentCategoriesProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="py-16 md:py-24 bg-transparent relative overflow-hidden transition-colors duration-1000">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-5 lg:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-24 items-center">
          
          {/* Left Side: Stacked Animated Cards (Hidden on mobile) */}
          <motion.div 
            className="relative w-full max-w-[280px] md:max-w-[320px] lg:max-w-md mx-auto aspect-square hidden md:block"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-150px", amount: 0.2 }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.3 } }
            }}
          >
            {categories.map((cat, i) => {
              const slot = slotFor(i, activeIndex);
              const f = FRAME_POS[slot];

              return (
                <motion.div
                  key={cat.id}
                  variants={{
                    hidden: { opacity: 0, y: 50, scale: 0.9 },
                    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 1, ease: [0.23, 1, 0.32, 1] } }
                  }}
                  className="absolute inset-0"
                  style={{ zIndex: f.zIndex }}
                >
                  <div
                    className={`absolute inset-0 rounded-3xl flex items-center justify-center border transition-colors duration-700 ${
                      isDark ? 'bg-white/10 border-white/10' : 'bg-white border-black/5'
                    }`}
                    style={{
                      opacity: f.opacity,
                      transform: `translate(${f.x}, ${f.y}) rotate(${f.rotate}) scale(${f.scale})`,
                      boxShadow: f.shadow,
                      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.7s ease-in-out, border-color 0.7s ease-in-out',
                    }}
                  >
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="w-full h-full object-cover rounded-3xl"
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Right Side: Category List (Responsive) */}
          <motion.div 
            className="flex flex-col justify-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-150px", amount: 0.2 }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.25 } }
            }}
          >
            {categories.map((cat, index) => {
              const isActive = activeIndex === index;
              
              return (
                <motion.div
                  key={cat.id}
                  variants={{
                    hidden: { opacity: 0, x: 30 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] } }
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    const targetCategory =
                      cat.id === 'kamera' ? 'Kamera' : cat.id === 'drone' ? 'Drone' : cat.id === 'lensa' ? 'Lensa' : 'Semua';
                    window.location.href = `/katalog?kategori=${encodeURIComponent(targetCategory)}`;
                  }}
                  className={`py-6 md:py-8 cursor-pointer transition-colors duration-700 border-b group flex items-center ${
                    isDark ? 'border-white/10' : 'border-black/10'
                  } ${index === 0 ? 'border-t' : ''}`}
                >
                  {/* Mobile Thumbnail (Hidden on tablet/desktop) */}
                  <div className={`w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-2xl border shadow-sm mr-8 sm:mr-10 md:hidden transition-colors duration-700 ${
                    isDark ? 'bg-white/10 border-white/10' : 'bg-white border-black/5'
                  }`}>
                    <img 
                      src={cat.image} 
                      alt={cat.title} 
                      className="w-full h-full object-cover rounded-2xl" 
                    />
                  </div>

                  <div className="flex flex-1 items-center justify-between w-full">
                    <div className="flex flex-col">
                      <span 
                        className={`text-[10px] sm:text-[11px] lg:text-xs font-bold mb-1 md:mb-2 uppercase tracking-widest transition-colors duration-500 ${
                          isActive 
                            ? 'text-brand-500' 
                            : isDark 
                              ? 'text-white/40 group-hover:text-white/60' 
                              : 'text-black/40 group-hover:text-black/50'
                        }`}
                      >
                        {cat.subtitle}
                      </span>
                      <h3 
                        className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tighter transition-colors duration-500 ${
                          isActive 
                            ? (isDark ? 'text-white' : 'text-black')
                            : isDark
                              ? 'text-white/40 md:text-white/20 group-hover:text-white/60 md:group-hover:text-white/30'
                              : 'text-black/40 md:text-black/20 group-hover:text-black/60 md:group-hover:text-black/30'
                        }`}
                      >
                        {cat.title}
                      </h3>
                    </div>
                    
                    {/* Arrow Container - always reserves space */}
                    <div className="ml-4 shrink-0 flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10">
                      <ArrowRight 
                        className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 transition-all duration-300 ${
                          isDark ? 'text-white' : 'text-black'
                        } ${
                          isActive 
                            ? 'opacity-100 translate-x-0' 
                            : 'opacity-0 -translate-x-3'
                        }`} 
                        strokeWidth={2.5} 
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

        </div>
      </div>
    </section>
  );
}


