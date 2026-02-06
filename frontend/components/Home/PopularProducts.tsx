'use client';

import { useState } from 'react';
import Link from 'next/link';
import DynamicProductCard from './DynamicProductCard';
import { getHomepageProducts, type Product } from '@/services/online-services/frontendProductService';

interface Category {
  id: string;
  name: string;
}

interface PopularProductsProps {
  initialProducts: Product[];
  categories: Category[];
}

export default function PopularProducts({ initialProducts, categories }: PopularProductsProps) {
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);

  console.log('[PopularProducts] Initial render:', {
    initialProductsCount: initialProducts.length,
    categoriesCount: categories.length,
    categories: categories.map(c => c.name),
  });

  // Fetch products when category changes (using client-side service)
  const handleCategoryChange = async (categoryName: string) => {
    setActiveCategory(categoryName);
    setLoading(true);
    
    try {
      console.log('[PopularProducts] Fetching products with:', {
        badge: 'Bestseller',
        category: categoryName || 'all',
        limit: 10,
      });
      
      const response = await getHomepageProducts({
        badge: 'Bestseller',
        category: categoryName || undefined,
        limit: 10,
      });
      
      console.log('[PopularProducts] Response:', response);
      
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-4 sm:py-6 md:py-8 bg-white">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Best Sellers</h2>
            <p className="text-xs sm:text-sm text-gray-500">Most popular products near you</p>
          </div>
          <Link 
            href="/products" 
            className="text-[#e63946] font-medium hover:underline text-xs sm:text-sm md:text-base"
          >
            View All →
          </Link>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => handleCategoryChange('')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors active:scale-95 ${
              activeCategory === ''
                ? 'bg-[#e63946] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.name)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors active:scale-95 ${
                activeCategory === category.name
                  ? 'bg-[#e63946] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-3">
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">No Bestseller Products Available</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4">
              {activeCategory 
                ? `No bestseller products found in "${activeCategory}" category. Try selecting a different category.`
                : 'No bestseller products available at the moment. Products need to be marked as "Bestseller" in the dashboard.'}
            </p>
            {activeCategory && (
              <button
                onClick={() => handleCategoryChange('')}
                className="inline-flex items-center px-4 py-2 bg-[#e63946] text-white rounded-lg hover:bg-[#d62839] transition-colors text-sm sm:text-base"
              >
                View All Categories
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
            {products.map((product) => (
              <DynamicProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
