import React from 'react';
import { Link } from '@inertiajs/react';
import { Layers, ArrowRight } from 'lucide-react';
import ProductCard from '@/components/landing/ProductCard';
import { featuredEquipments } from '@/data/products';
import { motion } from 'framer-motion';

interface FeaturedProductsProps {
  featuredProducts?: any[];
  isDark?: boolean;
}

export default function FeaturedProducts({
  featuredProducts = [],
  isDark = false,
}: FeaturedProductsProps) {
  // Use real products from database if available, otherwise fallback to featuredEquipments
  const itemsToDisplay =
    featuredProducts && featuredProducts.length > 0
      ? featuredProducts.slice(0, 6)
      : featuredEquipments.slice(0, 6);

  return (
    <section
      id="unit-unggulan"
      className="py-24 sm:py-32 bg-transparent"
    >
      <div id="unit-unggulan-content" className="max-w-[1440px] mx-auto px-4 sm:px-5 lg:px-6">
        {/* Section header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px' }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3 text-brand-500">
              <Layers className="w-3.5 h-3.5" /> Unit Unggulan Siap Pakai
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] text-black">
              Pilihan Favorit Para Sinematografer
            </h2>
            <p className="text-sm sm:text-base text-black/60 mt-2">
              Kamera, lensa, dan drone berkualitas tinggi yang paling sering disewa untuk syuting komersial, film pendek, dan dokumentasi.
            </p>
          </div>

          <div className="shrink-0 mb-1">
            <Link
              href="/katalog"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/20 transition-all"
            >
              Lihat Seluruh Katalog ({itemsToDisplay.length}+) <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </motion.div>

        {/* Responsive Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '0px' }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.07 } },
          }}
        >
          {itemsToDisplay.map((item, idx) => (
            <motion.div
              key={item.id || idx}
              variants={{
                hidden: { opacity: 0, y: 24 },
                show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] } },
              }}
            >
              <ProductCard item={item} isDark={isDark} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
