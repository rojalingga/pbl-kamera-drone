import React from 'react';
import { MessageSquare, Quote } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReviewsProps {
  isDark?: boolean;
}

export default function Reviews({ isDark = false }: ReviewsProps) {
  const reviews = [
    {
      id: 1,
      quote:
        'Peralatannya terawat dan kondisinya sangat baik. Proses sewanya juga mudah dan cepat.',
      name: 'Andi Pratama',
      initials: 'AP',
      role: 'Videographer',
    },
    {
      id: 2,
      quote:
        'Pilihan kamera dan lensanya lengkap. Sangat membantu untuk kebutuhan produksi video kami.',
      name: 'Raka Wijaya',
      initials: 'RW',
      role: 'Filmmaker',
    },
    {
      id: 3,
      quote:
        'Drone yang kami sewa bekerja dengan sangat baik dan proses pengambilannya juga praktis.',
      name: 'Dimas Saputra',
      initials: 'DS',
      role: 'Aerial Photographer',
    },
    {
      id: 4,
      quote:
        'Pelayanannya responsif dan peralatannya sesuai dengan kebutuhan produksi kami.',
      name: 'Fajar Ramadhan',
      initials: 'FR',
      role: 'Content Creator',
    },
  ];

  return (
    <section className="py-20 bg-transparent relative overflow-hidden transition-colors duration-1000 ease-in-out">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-5 lg:px-6">

        {/* Giant Wrapper Card */}
        <motion.div 
          className="bg-brand-500 rounded-[2.5rem] lg:rounded-[3rem] p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-2xl shadow-brand-500/20"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        >

          {/* Header — Centered */}
          <motion.div 
            className="flex flex-col items-center text-center mb-16 max-w-2xl mx-auto relative z-10"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Apa Kata Mereka?
            </h2>
            <p className="text-sm sm:text-base text-white/90">
              Pengalaman pelanggan yang telah menggunakan peralatan SkyLens untuk berbagai kebutuhan produksi.
            </p>
          </motion.div>

          {/* 4 Cards Grid */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } }
            }}
          >
            {reviews.map((item) => (
              <motion.div
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] } }
                }}
                className="group relative rounded-2xl p-6 sm:p-7 bg-white border border-transparent flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 hover:shadow-md hover:bg-black hover:border-black cursor-pointer"
              >
                {/* Quote Icon & Review Text */}
                <div>
                  <Quote className="w-8 h-8 mb-4 text-brand-500/30 group-hover:text-brand-500 transition-colors duration-500" />
                  <p className="text-sm sm:text-base font-medium leading-relaxed text-zinc-700 group-hover:text-zinc-100 transition-colors duration-500">
                    “{item.quote}”
                  </p>
                </div>

                {/* Customer Avatar & Name */}
                <div className="mt-8 pt-6 border-t border-zinc-100 group-hover:border-zinc-800 flex items-center gap-3 transition-colors duration-500">
                  <div className="w-10 h-10 rounded-full bg-brand-50 group-hover:bg-zinc-800 text-brand-500 group-hover:text-brand-500 font-bold text-sm flex items-center justify-center shrink-0 transition-colors duration-500">
                    {item.initials}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 group-hover:text-white transition-colors duration-500">
                      {item.name}
                    </h3>
                    <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors duration-500">
                      {item.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
