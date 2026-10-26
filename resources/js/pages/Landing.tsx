import React from 'react';
import { Head } from '@inertiajs/react';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import TrustedBrands from '@/components/landing/TrustedBrands';
import EquipmentCategories from '@/components/landing/EquipmentCategories';
import FeaturedProducts from '@/components/landing/FeaturedProducts';
import WhyChooseUs from '@/components/landing/WhyChooseUs';
import HowItWorks from '@/components/landing/HowItWorks';
import Reviews from '@/components/landing/Reviews';
import Footer from '@/components/landing/Footer';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

interface LandingProps {
  categories?: any[];
  brands?: any[];
  featuredProducts?: any[];
}

function LandingContent({ categories = [], brands = [], featuredProducts = [] }: LandingProps) {
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const scrollToUnitUnggulan = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('unit-unggulan-content');
    if (el) {
      const navbar = document.querySelector('header');
      const navbarHeight = navbar ? navbar.offsetHeight : 96;
      const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight - 32;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div
      id="landing-root"
      className={`min-h-screen flex flex-col selection:bg-brand-500 selection:text-white`}
    >
      <div className="flex-1 flex flex-col bg-white text-black">
        <Head title="Sewa Kamera & Drone Profesional — SkyLens" />

        <Navbar isDark={isDark} />
        <main className="flex-1">
          <Hero onScrollToUnitUnggulan={scrollToUnitUnggulan} isDark={isDark} />
          <TrustedBrands isDark={isDark} />
          <EquipmentCategories isDark={isDark} />
          <FeaturedProducts featuredProducts={featuredProducts} isDark={isDark} />
          <WhyChooseUs isDark={isDark} />
          <HowItWorks isDark={isDark} />
          <Reviews isDark={isDark} />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function Landing(props: LandingProps) {
  return (
    <ThemeProvider>
      <LandingContent {...props} />
    </ThemeProvider>
  );
}
