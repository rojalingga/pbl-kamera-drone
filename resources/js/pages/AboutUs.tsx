import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col selection:bg-brand-500 selection:text-white">
      <Head title="Tentang Kami — SkyLens" />
      
      <Navbar />

      <main className="flex-1 pt-32 sm:pt-40 lg:pt-48 pb-20 sm:pb-32">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-5 lg:px-6">
          
          {/* Top Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-3xl mx-auto text-center mb-24 sm:mb-32"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black mb-6 leading-[1.2]">
              Kenali Siapa Kami dan Apa yang Kami Lakukan - <span className="text-brand-500">Tentang SkyLens</span>
            </h1>
            <p className="text-base sm:text-lg text-black/60 leading-relaxed max-w-2xl mx-auto">
              Kami berdedikasi untuk menyediakan peralatan kamera, lensa, dan drone terbaik bagi para kreator visual, mulai dari pemula hingga profesional.
            </p>
          </motion.div>

          {/* Main Content Section */}
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            
            {/* Left Column: Text */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="w-full lg:w-1/2"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-black mb-6 leading-tight">
                Pelajari Tentang Kami dan Apa yang Membedakan Kami
              </h2>
              <p className="text-black/70 leading-relaxed mb-6">
                Di SkyLens, kami percaya bahwa setiap momen berharga layak diabadikan dengan kualitas terbaik. Kami hadir untuk menghilangkan batasan finansial dalam berkarya dengan menyediakan koleksi perlengkapan yang lengkap, terawat, dan selalu siap pakai.
              </p>
              <p className="text-black/70 leading-relaxed mb-10">
                Dengan proses penyewaan yang transparan, jaminan kondisi alat yang prima, serta layanan dukungan yang responsif, kami berkomitmen untuk menjadi partner andalan di setiap produksi visual Anda, baik itu untuk hobi, acara pernikahan, hingga proyek komersial skala besar.
              </p>
              
              <Link
                href="/katalog"
                className="inline-flex items-center gap-2 bg-[#111] hover:bg-brand-500 text-white font-semibold px-8 py-4 rounded-full transition-all duration-300 shadow-md hover:shadow-brand-500/20 group"
              >
                Eksplorasi Katalog
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Right Column: Image Collage */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
              className="w-full lg:w-1/2"
            >
              <div className="relative w-full h-[400px] sm:h-[500px]">
                {/* Decorative background block (from the figma sketch) */}
                <div className="absolute top-[5%] right-0 w-[70%] h-[90%] bg-black/5 rounded-3xl" />
                
                {/* Top left small image */}
                <div className="absolute top-0 left-0 w-[42%] h-[46%] rounded-3xl overflow-hidden shadow-lg bg-black/10">
                  <img 
                    src="/assets/img/1 Kamera.jpg" 
                    alt="Equipment" 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
                
                {/* Bottom left small image */}
                <div className="absolute bottom-0 left-0 w-[42%] h-[46%] rounded-3xl overflow-hidden shadow-lg bg-black/10">
                  <img 
                    src="/assets/img/2 Kamera.jpg" 
                    alt="Equipment" 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
                
                {/* Big right overlapping image */}
                <div className="absolute top-[10%] right-[5%] w-[65%] h-[80%] rounded-3xl overflow-hidden shadow-2xl bg-black/10 z-10 border-4 border-white">
                  <img 
                    src="/assets/img/Catalog.jpg" 
                    alt="Main Event" 
                    className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
            </motion.div>
            
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
