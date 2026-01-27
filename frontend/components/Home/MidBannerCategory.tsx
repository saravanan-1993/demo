"use client";

import Image from "next/image";
import Link from "next/link";
import { useCurrency } from "@/hooks/useCurrency";

export default function MidBannerCategory() {
  const currencySymbol = useCurrency();
  const banners = [
    {
      title: "Fresh Fruits",
      subtitle: "Seasonal & Exotic",
      offer: "UP TO 35% OFF",
      bgColor: "bg-rose-50/60",
      image:
        "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=250&fit=crop",
      link: "/products",
    },
    {
      title: "Kitchen Essentials",
      subtitle: "Oil, Ghee & Masala",
      offer: `STARTING ${currencySymbol}99`,
      bgColor: "bg-amber-50/60",
      image:
        "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=250&fit=crop",
      link: "/products",
    },
    {
      title: "Personal Care",
      subtitle: "Beauty & Hygiene",
      offer: "BUY 1 GET 1",
      bgColor: "bg-blue-50/60",
      image:
        "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400&h=250&fit=crop",
      link: "/products",
    },
  ];

  return (
    <section className="py-4 sm:py-6 md:py-8 bg-gray-50">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {banners.map((banner, index) => (
            <Link
              key={index}
              href={banner.link}
              className={`relative overflow-hidden rounded-lg ${banner.bgColor} border border-gray-100 group transition-all duration-300 hover:shadow-lg block h-32 sm:h-40 md:h-48`}
            >
              <div className="flex h-full relative z-10">
                <div className="w-3/5 p-3 sm:p-4 md:p-6 flex flex-col justify-center">
                  <span className="text-[10px] sm:text-xs md:text-sm font-medium mb-1 sm:mb-2 text-gray-600 uppercase tracking-wider">
                    {banner.subtitle}
                  </span>
                  <h3 className="text-base sm:text-lg md:text-2xl font-bold text-gray-800 mb-1.5 sm:mb-3 leading-tight">
                    {banner.title}
                  </h3>
                  <div className="flex items-center gap-2 mb-2 sm:mb-4">
                    <span className="text-[10px] sm:text-xs font-bold bg-[#e63946] text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                      {banner.offer}
                    </span>
                  </div>
                  <span className="inline-flex items-center text-[10px] sm:text-xs font-medium text-[#e63946] group-hover:underline underline-offset-4">
                    Show More{" "}
                    <svg
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-1 transform group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </div>

                <div className="w-2/5 relative h-full">
                  <div className="absolute inset-0 bg-gradient-to-l from-white/20 to-transparent"></div>
                </div>
              </div>

              {/* Image Positioned Absolute Right */}
              <div className="absolute right-0 top-0 w-2/5 h-full">
                <Image
                  src={banner.image}
                  alt={banner.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  quality={80}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
