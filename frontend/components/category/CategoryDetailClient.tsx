'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DynamicProductCard from '@/components/Home/DynamicProductCard';
import { getProducts, type Product } from '@/services/online-services/frontendProductService';
import type { Category, Subcategory } from '@/services/online-services/frontendCategoryService';
import { getSubcategoryById } from '@/services/online-services/frontendCategoryService';
import { badgeService } from '@/services/online-services/badgeService';
import { generateCategoryUrl } from '@/lib/slugify';
import {
  IconChevronRight,
  IconChevronLeft,
  IconFilter,
  IconX,
  IconAdjustments,
} from '@tabler/icons-react';
import ProductFilters, { STATIC_BADGE_OPTIONS, type BadgeOption } from '@/components/products/ProductFilters';
import SortDropdown from '@/components/products/SortDropdown';

interface CategoryDetailClientProps {
  categoryId?: string;
  subcategoryId?: string;
  initialCategory?: Category;
  categories: Category[];
  initialProducts: Product[];
  initialPagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  availableBrands: string[];
}

// Sort options
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', sortBy: 'createdAt', sortOrder: 'desc' },
  { value: 'price-low', label: 'Price: Low to High', sortBy: 'defaultSellingPrice', sortOrder: 'asc' },
  { value: 'price-high', label: 'Price: High to Low', sortBy: 'defaultSellingPrice', sortOrder: 'desc' },
  { value: 'discount', label: 'Discount', sortBy: 'defaultDiscountValue', sortOrder: 'desc' },
];

export default function CategoryDetailClient({ 
  subcategoryId,
  initialCategory,
  categories,
  initialProducts,
  initialPagination,
  availableBrands,
}: CategoryDetailClientProps) {
  // Pagination & Sort
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSort, setSelectedSort] = useState('newest');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filters
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min?: number; max?: number } | null>(null);
  const [customMinPrice, setCustomMinPrice] = useState('');
  const [customMaxPrice, setCustomMaxPrice] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('all');

  // UI State
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Data - Initialize with server data
  const [category, setCategory] = useState<Category | null>(initialCategory || null);
  const [subcategory, setSubcategory] = useState<
    (Subcategory & { categoryId?: string; categoryName?: string }) | null
  >(null);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [badgeOptions, setBadgeOptions] = useState<BadgeOption[]>(STATIC_BADGE_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(initialPagination?.totalPages || 1);
  const [totalCount, setTotalCount] = useState(initialPagination?.totalCount || 0);

  const itemsPerPage = 15;

  // Count active filters
  const activeFilterCount =
    selectedBrands.length + 
    (selectedPriceRange ? 1 : 0) +
    (selectedBadge !== 'all' ? 1 : 0);

  // Fetch subcategory data if subcategoryId is provided
  useEffect(() => {
    if (!subcategoryId) return;
    
    const fetchSubcategory = async () => {
      try {
        const subcategoryRes = await getSubcategoryById(subcategoryId);
        setSubcategory(subcategoryRes.data);
        const parentCategory = categories.find(
          (cat) => cat.id === subcategoryRes.data.categoryId || cat.name === subcategoryRes.data.categoryName
        );
        if (parentCategory) {
          setCategory(parentCategory);
        }
      } catch (err) {
        console.error('Error fetching subcategory:', err);
      }
    };
    
    fetchSubcategory();
  }, [subcategoryId, categories]);

  // Fetch badges on mount (static + custom)
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const response = await badgeService.getAllBadges();
        if (response.success && response.data.all) {
          // Build badge options: "All Products" + all badges from API
          const allBadgeOptions: BadgeOption[] = [
            { value: 'all', label: 'All Products' },
            ...response.data.all.map(badge => ({
              value: badge.name,
              label: badge.name,
            })),
          ];
          setBadgeOptions(allBadgeOptions);
        }
      } catch (err) {
        console.error('Error fetching badges:', err);
        // Fall back to static options on error
        setBadgeOptions(STATIC_BADGE_OPTIONS);
      }
    };
    fetchBadges();
  }, []);

  // Fetch products when filters change
  const fetchProducts = useCallback(async () => {
    if (!category && !subcategory) return;

    try {
      setLoading(true);

      // Determine price filter
      let minPrice: number | undefined;
      let maxPrice: number | undefined;

      if (selectedPriceRange) {
        minPrice = selectedPriceRange.min;
        maxPrice = selectedPriceRange.max;
      }

      const response = await getProducts({
        page: currentPage,
        limit: itemsPerPage,
        category: category?.name,
        subCategory: subcategory?.name,
        brand: selectedBrands.length === 1 ? selectedBrands[0] : undefined,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder,
        badge: selectedBadge !== 'all' ? selectedBadge : undefined,
        includeVariantPriceFilter: 'true', // Enable variant-level price filtering
      });

      // If multiple brands selected, filter client-side (backend supports single brand)
      let filteredProducts = response.data;
      if (selectedBrands.length > 1) {
        filteredProducts = response.data.filter((p) => selectedBrands.includes(p.brand));
      }

      setProducts(filteredProducts);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(selectedBrands.length > 1 ? filteredProducts.length : response.pagination.totalCount);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [
    category,
    subcategory,
    currentPage,
    sortBy,
    sortOrder,
    selectedBrands,
    selectedPriceRange,
    selectedBadge,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle sort change
  const handleSortChange = (value: string) => {
    const option = SORT_OPTIONS.find((o) => o.value === value);
    if (option) {
      setSelectedSort(value);
      setSortBy(option.sortBy);
      setSortOrder(option.sortOrder);
      setCurrentPage(1);
    }
  };

  // Handle brand toggle
  const handleBrandToggle = (brand: string) => {
    setSelectedBrands((prev) => (prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]));
    setCurrentPage(1);
  };

  // Handle price range selection
  const handlePriceRangeSelect = (range: { min?: number; max?: number } | null) => {
    setSelectedPriceRange(range);
    if (range !== null) {
      setCustomMinPrice('');
      setCustomMaxPrice('');
    }
    setCurrentPage(1);
  };

  // Handle custom price apply
  const handleCustomPriceApply = () => {
    if (customMinPrice || customMaxPrice) {
      setSelectedPriceRange({
        min: customMinPrice ? parseFloat(customMinPrice) : undefined,
        max: customMaxPrice ? parseFloat(customMaxPrice) : undefined,
      });
      setCurrentPage(1);
      // fetchProducts() is called by useEffect when selectedPriceRange changes or on initial load.
      // We don't need to call it manually here if we are updating state that triggers effect.
      // However, check if 'fetchProducts' is in dependency array of useEffect. Yes it is.
      // So setting selectedPriceRange triggers it.
    }
  };

  // Handle badge selection
  const handleBadgeSelect = (badge: string) => {
    setSelectedBadge(badge);
    setCurrentPage(1);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedBrands([]);
    setSelectedPriceRange(null);
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setSelectedBadge('all');
    setCurrentPage(1);
  };

  if (!category && !subcategory && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800 mb-4">Category Not Found</h1>
          <Link href="/" className="text-[#e63946] hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const displayName = subcategory?.name || category?.name || 'Loading...';
  const displayDescription = subcategory?.metaDescription || category?.metaDescription;

  // Filter Sidebar Content (shared between desktop and mobile)
  const FilterContent = () => (
    <ProductFilters
      categories={categories}
      selectedCategory={category}
      selectedSubcategory={subcategory}
      categoryMode="link"
      // onSelectCategory/Subcategory logic not needed for link mode
      availableBrands={availableBrands}
      selectedBrands={selectedBrands}
      onBrandToggle={handleBrandToggle}
      selectedPriceRange={selectedPriceRange}
      onPriceRangeSelect={handlePriceRangeSelect}
      customMinPrice={customMinPrice}
      customMaxPrice={customMaxPrice}
      setCustomMinPrice={setCustomMinPrice}
      setCustomMaxPrice={setCustomMaxPrice}
      onCustomPriceApply={handleCustomPriceApply}
      selectedBadge={selectedBadge}
      onBadgeSelect={handleBadgeSelect}
      badgeOptions={badgeOptions}
      activeFilterCount={activeFilterCount}
      onClearAll={clearAllFilters}
    />
  );


  return (
    <main className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Link href="/" className="text-gray-500 hover:text-[#e63946]">
              Home
            </Link>
            <IconChevronRight size={14} className="text-gray-400" />
            {subcategory && category ? (
              <>
                <Link href={generateCategoryUrl(category)} className="text-gray-500 hover:text-[#e63946]">
                  {category.name}
                </Link>
                <IconChevronRight size={14} className="text-gray-400" />
                <span className="text-gray-800 font-medium">{subcategory.name}</span>
              </>
            ) : (
              <span className="text-gray-800 font-medium">{category?.name || 'Loading...'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Category Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800">{displayName}</h1>
          {displayDescription && <p className="text-xs sm:text-base text-gray-500 mt-1">{displayDescription}</p>}
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex gap-4 sm:gap-6">
          {/* Sidebar - Desktop */}
          <div className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-lg p-4 sticky top-24">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                <IconAdjustments size={20} className="text-gray-600" />
                <h3 className="font-semibold text-gray-800">Filters</h3>
              </div>
              <FilterContent />
            </div>
          </div>

          {/* Products */}
          <div className="flex-1">
            {/* Sort Bar */}
            <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 flex items-center justify-between gap-2">
              <p className="text-gray-600 text-xs sm:text-sm">
                <span className="hidden sm:inline">{totalCount} products found</span>
                <span className="sm:hidden">{totalCount} items</span>
              </p>
              <div className="flex items-center gap-2">
                {/* Mobile Filter Button */}
                <button
                  onClick={() => setShowMobileFilter(true)}
                  className="lg:hidden flex items-center gap-1 px-3 py-1.5 border rounded text-sm relative"
                >
                  <IconFilter size={16} />
                  <span>Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#e63946] text-white text-xs rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Sort Dropdown */}
                <SortDropdown
                  options={SORT_OPTIONS}
                  value={selectedSort}
                  onChange={handleSortChange}
                />
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
                {[...Array(itemsPerPage)].map((_, i) => (
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
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
                {products.map((product) => (
                  <DynamicProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg p-8 sm:p-12 text-center">
                <p className="text-gray-500 mb-4">No products found matching your filters.</p>
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters} className="text-[#e63946] hover:underline text-sm">
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 sm:p-2 rounded border disabled:opacity-50 hover:bg-gray-100"
                >
                  <IconChevronLeft size={18} className="sm:w-5 sm:h-5" />
                </button>
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded text-sm ${
                        currentPage === pageNum ? 'bg-[#e63946] text-white' : 'border hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 sm:p-2 rounded border disabled:opacity-50 hover:bg-gray-100"
                >
                  <IconChevronRight size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      {showMobileFilter && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setShowMobileFilter(false)}>
          <div
            className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <IconAdjustments size={20} className="text-gray-600" />
                <h3 className="font-semibold text-gray-800">Filters</h3>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 bg-[#e63946] text-white text-xs rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button onClick={() => setShowMobileFilter(false)} className="p-1">
                <IconX size={24} />
              </button>
            </div>
            <div className="p-4">
              <FilterContent />
            </div>
            {/* Apply Button - Fixed at bottom */}
            <div className="sticky bottom-0 p-4 bg-white border-t">
              <button
                onClick={() => setShowMobileFilter(false)}
                className="w-full py-3 bg-[#e63946] text-white rounded-lg font-medium hover:bg-[#d62839]"
              >
                Apply Filters ({totalCount} products)
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
