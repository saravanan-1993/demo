'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { type Category } from '@/services/online-services/frontendCategoryService';
import { generateCategoryUrl } from '@/lib/slugify';

interface AboutPageClientProps {
  initialCategories: Category[];
}

export default function AboutPageClient({ initialCategories }: AboutPageClientProps) {
  const [categories] = useState<Category[]>(initialCategories);

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
            <Link href="/" className="text-[#e63946] hover:text-[#c1121f]">Home</Link>
            <span>/</span>
            <span className="text-gray-900">About Us</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left Content - About Text */}
          <div className="w-full lg:w-[76%]">
            <div className="prose max-w-none">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">Welcome to Leats</h1>
              
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4 sm:mb-6">
                Welcome to Leats, your trusted online destination for fresh groceries, organic produce, and everyday essentials. We are committed to bringing the finest quality products directly to your doorstep, making grocery shopping convenient, affordable, and enjoyable for families across India.
              </p>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 mt-6 sm:mt-8">Our Story</h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4 sm:mb-6">
                Founded with a passion for healthy living and sustainable practices, Leats started as a small local grocery store with a big vision. Today, we have grown into a comprehensive online marketplace that serves thousands of customers daily.
              </p>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 mt-6 sm:mt-8">What We Offer</h2>
              <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 leading-relaxed mb-4 sm:mb-6 space-y-1 sm:space-y-2">
                <li>Fresh Produce: Farm-fresh fruits and vegetables sourced from local farmers</li>
                <li>Dairy and Bakery: Fresh milk, paneer, bread, and baked goods delivered daily</li>
                <li>Staples: Atta, rice, dal and everything you need to stock your kitchen</li>
                <li>Cooking Essentials: Oil, ghee, masalas and spices for authentic Indian cooking</li>
                <li>Snacks and Beverages: Chips, biscuits, drinks and more for every taste</li>
                <li>Personal Care: Beauty and hygiene products for the whole family</li>
              </ul>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 mt-6 sm:mt-8">10 Minute Delivery</h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4 sm:mb-6">
                We understand that your time is precious. That is why we have built a network of dark stores across the city to ensure your groceries reach you in just 10 minutes.
              </p>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 mt-6 sm:mt-8">Why Choose Leats?</h2>
              <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 leading-relaxed mb-4 sm:mb-6 space-y-1 sm:space-y-2">
                <li>10 Minute Delivery: Get your groceries delivered in minutes</li>
                <li>Best Prices: Har Din Sasta - everyday low prices</li>
                <li>Fresh Quality: Farm-fresh produce and quality products</li>
                <li>Wide Selection: Thousands of products across categories</li>
                <li>Easy Returns: Hassle-free returns and refunds</li>
                <li>24/7 Support: Our customer service team is always here to help</li>
              </ul>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[24%]">
            <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-4">
              {/* Search Bar */}
              <div className="bg-white border rounded-lg p-3 sm:p-4">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e63946] text-sm text-gray-600"
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#e63946]">
                    <IconSearch size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>


              {/* Categories */}
              <div className="bg-white border rounded-lg p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">Categories</h3>
                <div className="w-12 sm:w-16 h-1 bg-[#e63946] mb-4 sm:mb-6"></div>
                
                <div className="space-y-2 sm:space-y-3">
                  {categories.map((category) => (
                    <Link 
                      key={category.id}
                      href={generateCategoryUrl(category)}
                      className="flex items-center justify-between py-1.5 sm:py-2 hover:text-[#e63946] transition group"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-sm sm:text-base text-gray-700 group-hover:text-[#e63946]">{category.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Advertisement */}
              <div className="bg-gradient-to-br from-red-50 to-yellow-50 rounded-lg overflow-hidden p-4 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Fresh Groceries</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">
                  Save up to<br />
                  40% OFF<br />
                  Daily
                </h3>
                <Link 
                  href="/products"
                  className="bg-[#e63946] text-white px-4 sm:px-6 py-2 rounded-md hover:bg-[#c1121f] transition flex items-center gap-2 text-xs sm:text-sm font-medium w-fit"
                >
                  Shop now
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
