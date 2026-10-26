import React from 'react';
import { Workflow } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
  gridClass: string;
  image?: string;
}

export const processSteps: ProcessStep[] = [
  {
    number: '01',
    title: 'Pilih Peralatan',
    description:
      'Pilih kamera, lensa, drone, atau peralatan shooting berkualitas lainnya dengan spesifikasi yang dapat disesuaikan dengan kebutuhan produksi proyek Anda.',
    gridClass: 'lg:col-start-1 lg:row-start-1 lg:row-span-2',
  },
  {
    number: '02',
    title: 'Konsultasi & Reservasi',
    description:
      'Konfirmasikan kebutuhan dan jadwal penggunaan agar proses penyewaan disiapkan dengan tepat.',
    gridClass: 'lg:col-start-2 lg:row-start-1 lg:row-span-1',
  },
  {
    number: '03',
    title: 'Pemeriksaan Peralatan',
    description:
      'Setiap peralatan diperiksa terlebih dahulu untuk memastikan kondisi dan kelengkapannya sebelum diserahkan kepada pelanggan.',
    gridClass: 'lg:col-start-3 lg:row-start-1 lg:row-span-2',
  },
  {
    number: '04',
    title: 'Pengambilan Peralatan',
    description:
      'Setelah semua persiapan selesai, peralatan dapat segera diambil sesuai jadwal yang telah ditentukan. Pastikan membawa bukti pemesanan.',
    gridClass: 'lg:col-start-1 lg:row-start-3 lg:row-span-1',
  },
  {
    number: '05',
    title: 'Penggunaan Peralatan',
    description:
      'Gunakan peralatan sesuai kebutuhan proyek selama periode rental yang telah dipilih.',
    gridClass: 'lg:col-start-2 lg:row-start-2 lg:row-span-2',
  },
  {
    number: '06',
    title: 'Pengembalian & Pemeriksaan',
    description:
      'Setelah selesai digunakan, peralatan dikembalikan dan diperiksa kembali untuk memastikan kondisi tetap sesuai.',
    gridClass: 'lg:col-start-3 lg:row-start-3 lg:row-span-1',
  },
];

interface HowItWorksProps {
  isDark?: boolean;
}

export default function HowItWorks({ isDark = false }: HowItWorksProps) {
  return (
    <section id="proses-kerja" className="py-20 lg:py-32 relative overflow-hidden bg-transparent">

      <div className="max-w-[1440px] mx-auto px-4 sm:px-5 lg:px-6 relative z-10">
        
        {/* Header — Left Title + Right Description matching SkyLens section system */}
        <motion.div 
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 lg:mb-20 gap-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand-500 uppercase tracking-widest mb-2 lg:mb-4">
              <Workflow className="w-3.5 h-3.5" /> Alur Penyewaan
            </div>
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight transition-colors duration-700 ${
              isDark ? 'text-white' : 'text-black'
            }`}>
              Bagaimana Proses Kerja Kami?
            </h2>
          </div>
          <p className={`text-sm sm:text-base max-w-md transition-colors duration-700 ${
            isDark ? 'text-white/50' : 'text-black/50'
          }`}>
            Proses sederhana dan terstruktur untuk memastikan setiap peralatan siap digunakan sesuai kebutuhan proyek Anda.
          </p>
        </motion.div>

        {/* Bento Grid — 6 Modern Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[1fr_60px_1fr] gap-6 lg:gap-8"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.15 } }
          }}
        >
          {processSteps.map((step) => (
            <motion.div
              key={step.number}
              variants={{
                hidden: { opacity: 0, y: 40 },
                show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.23, 1, 0.32, 1] } }
              }}
              className={`group relative rounded-[2rem] lg:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 border overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:shadow-md flex flex-col ${step.gridClass} bg-zinc-900 border-zinc-800 hover:border-brand-500 hover:bg-brand-500`}
            >
              {/* Optional Soft Glow inside card on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 via-transparent to-brand-500/0 group-hover:to-brand-500/5 transition-colors duration-700" />

              <div className="relative z-10 flex flex-col h-full">
                {/* Top: Large Prominent Number */}
                <span className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter mb-4 block transition-colors duration-500 z-10 relative text-white/10 group-hover:text-white/30">
                  {step.number}
                </span>

                {/* Bottom: Title & Description */}
                <div className="max-w-sm">
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 tracking-tight z-10 relative transition-colors duration-500 text-white group-hover:text-white">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed z-10 relative transition-colors duration-500 text-white/60 group-hover:text-white/90">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
