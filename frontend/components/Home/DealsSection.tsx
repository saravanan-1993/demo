"use client";

import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/services/online-services/frontendCategoryService";
import { generateCategorySlug } from "@/lib/slugify";

interface DealsSectionProps {
  categories: Category[];
}

export default function DealsSection({ categories }: DealsSectionProps) {
  return (
    <section className="py-4 sm:py-6 md:py-8 bg-gray-50">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Shop by Category */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-4 sm:mb-5">
            Shop by Category
          </h2>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${generateCategorySlug(category.name)}/${
                  category.id
                }`}
                className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 group border border-gray-100"
              >
                <div className="relative w-full aspect-square bg-gray-50">
                  {category.image && category.image.trim() !== '' ? (
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      priority={false}
                      quality={75}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                      No Image
                    </div>
                  )}
                </div>
                <div className="p-2 sm:p-3 text-center">
                  <span className="text-[10px] sm:text-xs md:text-sm text-gray-800 font-medium line-clamp-2 group-hover:text-[#e63946] transition-colors">
                    {category.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
