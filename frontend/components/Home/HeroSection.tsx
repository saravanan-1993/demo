'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
}

interface HeroSectionProps {
  banners: Banner[];
}

export default function HeroSection({ banners }: HeroSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-slide effect
  useEffect(() => {
    if (banners.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  // Don't render if no banners
  if (banners.length === 0) {
    return null;
  }

  return (
    <section className="">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-4">
        {/* Main Banner Slider */}
        <div className="relative rounded-lg sm:rounded-xl overflow-hidden group shadow-lg">
          {/* Banner Container */}
          <div className="relative w-full h-[180px] sm:h-[250px] md:h-[320px] lg:h-[380px] xl:h-[420px]">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                {/* Banner Link Wrapper - Use linkUrl if exists, otherwise /products */}
                <Link href={banner.linkUrl || '/products'} className="block w-full h-full">
                  <Image
                    src={banner.imageUrl}
                    alt={banner.title}
                    fill
                    sizes="100vw"
                    className="object-cover"
                    priority={index === 0}
                    quality={85}
                    loading={index === 0 ? undefined : 'lazy'}
                  />
                </Link>
              </div>
            ))}
          </div>

          {/* Navigation Arrows - Only show if more than 1 banner */}
          {banners.length > 1 && (
            <>
              <button
                onClick={goToPrev}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                aria-label="Previous slide"
              >
                <IconChevronLeft size={20} className="text-gray-700 sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                aria-label="Next slide"
              >
                <IconChevronRight size={20} className="text-gray-700 sm:w-6 sm:h-6" />
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-3 sm:bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 sm:gap-2">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                      index === currentSlide 
                        ? 'bg-[#e63946] w-6 sm:w-8 shadow-lg' 
                        : 'bg-white/70 hover:bg-white w-1.5 sm:w-2'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}