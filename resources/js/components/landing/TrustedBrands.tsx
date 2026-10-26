import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface TrustedBrandsProps {
  isDark?: boolean;
}

export default function TrustedBrands({ isDark = false }: TrustedBrandsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const brandsRef = useRef<HTMLDivElement>(null);

  const brands = [
    { name: 'Sony',           src: '/assets/brands/Sony.svg' },
    { name: 'Fujifilm',       src: '/assets/brands/Fujifilm.svg' },
    { name: 'DJI',            src: '/assets/brands/DJI.svg' },
    { name: 'Canon',          src: '/assets/brands/Canon.svg' },
    { name: 'Autel Robotics', src: '/assets/brands/Autel Robotics.svg' },
    { name: 'Samsung',        src: '/assets/brands/Samsung.svg' },
  ];

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top 85%',
      }
    });

    tl.from(textRef.current, {
      y: 20,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out'
    })
    .from('.brand-logo-wrapper', {
      y: 40,
      opacity: 0,
      duration: 1,
      stagger: 0.1,
      ease: 'power3.out'
    }, "-=0.4");
  }, { scope: containerRef, dependencies: [] });

  return (
    <section ref={containerRef} className="bg-transparent pt-12 pb-24 md:pt-20 md:pb-32 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-5 lg:px-6">
        
        {/* Header Text */}
        <div className="mb-10 sm:mb-14">
          <p ref={textRef} className={`font-normal text-sm sm:text-base transition-colors duration-700 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Dipercaya oleh para profesional, rumah produksi, dan enterprise
          </p>
        </div>

        {/* Brands Grid Container */}
        <div 
          ref={brandsRef} 
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 sm:gap-12 md:gap-16 place-items-center pb-4"
        >
          {brands.map((brand) => (
            <div key={brand.name} className="brand-logo-wrapper flex items-center justify-center w-full">
              <img
                src={brand.src}
                alt={brand.name}
                className={`max-w-[100px] sm:max-w-[120px] lg:max-w-full h-5 sm:h-6 md:h-8 lg:h-9 object-contain hover:opacity-100 transition-all duration-300 ${
                  isDark 
                    ? 'invert opacity-60' 
                    : 'grayscale opacity-40 hover:grayscale-0'
                }`}
              />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
