'use client';

import Link from 'next/link';
import DynamicProductCard from './DynamicProductCard';
import type { Product } from '@/services/online-services/frontendProductService';

interface TrendingProductsProps {
  products: Product[];
}

export default function TrendingProducts({ products }: TrendingProductsProps) {
  // Don't render section if no products
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-4 sm:py-6 md:py-8 bg-gray-50">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Trending Products</h2>
            <p className="text-xs sm:text-sm text-gray-500">Best deals with maximum savings</p>
          </div>
          <Link 
            href="/products" 
            className="text-[#e63946] font-medium hover:underline text-xs sm:text-sm md:text-base"
          >
            View All →
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
          {products.map((product) => (
            <DynamicProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
