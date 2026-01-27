"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Send, Package, TrendingUp } from "lucide-react";
import useDebounce from "@/hooks/use-debounce";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/hooks/useCurrency";

interface Product {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  category?: {
    name: string;
  };
  stockStatus: string;
  featured?: boolean;
  thumbnail?: string;
  images?: string[];
}

interface Action {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  short?: string;
  end?: string;
  productData?: Product;
  image?: string;
  price?: number;
}

interface CategoryData {
  id: string;
  categoryName: string;
  subcategoryName: string;
  categoryImage?: string;
  subcategoryImage?: string;
}

interface SearchResult {
  actions: Action[];
  categories?: CategoryData[];
  suggestions?: {
    keywords?: string[];
    categories?: string[];
    priceRanges?: Array<{
      label: string;
      min: number;
      max: number;
      count: number;
    }>;
    relatedTerms?: string[];
    popularProducts?: Array<{ id: string; name: string }>;
  };
  recentSearches?: Array<{
    query: string;
    timestamp: string;
    resultsCount?: number;
    products?: Array<{
      id: string;
      name: string;
      basePrice: number;
      thumbnail?: string;
    }>;
  }>;
  trending?: Array<{ id: string; name: string }>;
  mlRecommendations?: Array<unknown>;
  performance?: {
    searchTime: number;
    resultsFound: number;
    totalMatches: number;
    cacheHit?: boolean;
  };
  searchType?: string;
  message?: string;
  priceFilter?: {
    min?: string;
    max?: string;
    detected: boolean;
  };
}

const ANIMATION_VARIANTS = {
  container: {
    hidden: { opacity: 0, height: 0 },
    show: {
      opacity: 1,
      height: "auto",
      transition: {
        height: { duration: 0.4 },
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: {
        height: { duration: 0.3 },
        opacity: { duration: 0.2 },
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.2 },
    },
  },
} as const;

function ActionSearchBar({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const currencySymbol = useCurrency();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };
  const [isFocused, setIsFocused] = useState(defaultOpen);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 150); // Faster response - 150ms
  const isNavigatingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch products from API using intelligent search
  const searchProducts = useCallback(
    async (searchQuery: string) => {
      setIsLoading(true);
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_PRODUCT_API_URL || "http://localhost:4001";

        // Get user ID from localStorage or use anonymous
        const userId =
          typeof window !== "undefined"
            ? localStorage.getItem("userId") || "anonymous"
            : "anonymous";

        // Detect price filter from query (e.g., "under 500", "below 1000")
        const priceMatch = searchQuery.match(
          /(?:under|below|less than|<)\s*(\d+)/i
        );
        const detectedMaxPrice = priceMatch
          ? parseInt(priceMatch[1])
          : undefined;

        // Build search params - optimized for speed
        const params = new URLSearchParams({
          q: searchQuery,
          limit: "12", // Reduced for faster response
          useAI: "false", // Disable AI for instant results
          sortBy: "relevance",
          userId: userId,
        });

        // Add price filter if detected
        if (detectedMaxPrice) {
          params.set("priceMax", detectedMaxPrice.toString());
        }

        const response = await fetch(
          `${baseUrl}/api/dashboard/products/search?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await response.json();

        if (data.success) {
          // Handle different search types
          if (
            data.searchType === "recommendations" ||
            data.searchType === "no_results"
          ) {
            // Show recommendations or empty state
            const productActions: Action[] = (data.data || []).map(
              (product: Product) => ({
                id: product.id,
                label: product.name,
                icon: product.featured ? (
                  <TrendingUp className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Package className="h-4 w-4 text-blue-500" />
                ),
                description: product.category?.name || "Product",
                short: formatCurrency(product.basePrice),
                productData: product,
                image: product.thumbnail || product.images?.[0],
                price: product.basePrice,
              })
            );

            setResult({
              actions: productActions,
              suggestions: data.suggestions,
              recentSearches: data.recentSearches,
              trending: data.trending,
              searchType: data.searchType,
              message: data.message,
              priceFilter: data.priceFilter,
            });
          } else {
            // Normal search results
            const productActions: Action[] = data.data.map(
              (product: Product) => ({
                id: product.id,
                label: product.name,
                icon: product.featured ? (
                  <TrendingUp className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Package className="h-4 w-4 text-blue-500" />
                ),
                description: product.category?.name || "Product",
                short: formatCurrency(product.basePrice),
                productData: product,
                image: product.thumbnail || product.images?.[0],
                price: product.basePrice,
              })
            );

            setResult({
              actions: productActions,
              suggestions: data.suggestions,
              recentSearches: data.recentSearches,
              trending: data.trending,
              mlRecommendations: data.mlRecommendations,
              performance: data.performance,
              priceFilter: data.priceFilter,
            });
          }
        } else {
          setResult({ actions: [] });
        }
      } catch (error) {
        console.error("Error searching products:", error);
        setResult({ actions: [] });
      } finally {
        setIsLoading(false);
      }
    },
    [formatCurrency]
  );

  // Fetch categories and subcategories
  const fetchCategoriesAndSubcategories = useCallback(async () => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_PRODUCT_API_URL || "http://localhost:4001";

      const response = await fetch(
        `${baseUrl}/api/dashboard/categories/unique`,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
    return [];
  }, []);

  useEffect(() => {
    if (!isFocused) {
      setResult(null);
      setActiveIndex(-1);
      return;
    }

    // If query is empty, show categories instead of products
    if (debouncedQuery.trim().length === 0) {
      fetchCategoriesAndSubcategories().then((categories) => {
        setResult({
          actions: [],
          categories: categories,
        });
      });
    } else {
      // Only search products when user types
      searchProducts(debouncedQuery);
    }
    setActiveIndex(-1);
  }, [
    debouncedQuery,
    isFocused,
    searchProducts,
    fetchCategoriesAndSubcategories,
  ]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setActiveIndex(-1);
    },
    []
  );

  const handleActionClick = useCallback(
    (action: Action) => {
      if (action.productData) {
        // Navigate to product detail page with proper slug
        const slug = action.productData.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        router.push(`/products/${slug}-${action.productData.id}`);
      }
      setSelectedAction(action);
      setIsFocused(false);
      setQuery("");
    },
    [router]
  );

  // Handle "View All Results" - redirect to products page with filters
  const handleViewAllResults = useCallback(() => {
    const searchQuery = query.trim();
    if (!searchQuery || isNavigatingRef.current) return;

    console.log("🔍 Redirecting to products page with query:", searchQuery);
    isNavigatingRef.current = true;

    // Build URL with search query and filters
    const params = new URLSearchParams();
    params.set("search", searchQuery);

    // Add price filter if detected
    const priceMatch = searchQuery.match(
      /(?:under|below|less than|<)\s*(\d+)/i
    );
    if (priceMatch) {
      params.set("priceMax", priceMatch[1]);
      console.log("💰 Price filter detected:", priceMatch[1]);
    }

    // Navigate to products page with filters
    const targetUrl = `/products?${params.toString()}`;
    console.log("🎯 Navigating to:", targetUrl);

    // Close dropdown immediately
    setIsFocused(false);
    setQuery("");

    // Navigate
    router.push(targetUrl);

    // Reset navigation flag after a delay
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);
  }, [query, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      console.log(
        "🔑 Key pressed:",
        e.key,
        "Query:",
        query,
        "Active Index:",
        activeIndex
      );

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (result?.actions.length) {
            setActiveIndex((prev) =>
              prev < result.actions.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (result?.actions.length) {
            setActiveIndex((prev) =>
              prev > 0 ? prev - 1 : result.actions.length - 1
            );
          }
          break;
        case "Enter":
          e.preventDefault();
          e.stopPropagation();

          console.log("✅ Enter pressed - Processing...");

          if (
            result?.actions.length &&
            activeIndex >= 0 &&
            result.actions[activeIndex]
          ) {
            // If an item is selected, navigate to that product
            console.log(
              "📦 Navigating to product:",
              result.actions[activeIndex].label
            );
            handleActionClick(result.actions[activeIndex]);
          } else if (query.trim()) {
            // If no item selected but there's a query, view all results
            console.log("🔍 Viewing all results for:", query);
            handleViewAllResults();
          } else {
            console.log("⚠️ No query to search");
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsFocused(false);
          setActiveIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [
      result?.actions,
      activeIndex,
      handleActionClick,
      query,
      handleViewAllResults,
    ]
  );

  const handleFocus = useCallback(() => {
    setSelectedAction(null);
    setIsFocused(true);
    setActiveIndex(-1);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Don't close if navigating
    if (isNavigatingRef.current) {
      return;
    }

    // Don't close if clicking inside the results dropdown
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('[role="listbox"]')) {
      return;
    }

    setTimeout(() => {
      if (!isNavigatingRef.current) {
        setIsFocused(false);
        setActiveIndex(-1);
      }
    }, 200);
  }, []);

  return (
    <>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="w-full max-w-xl mx-auto">
        <div className="relative w-full">
          <div className="w-full">
            <div className="relative w-full">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search products... (Press Enter to search)"
                value={query}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-expanded={isFocused && !!result}
                aria-autocomplete="list"
                aria-activedescendant={
                  activeIndex >= 0
                    ? `action-${result?.actions[activeIndex]?.id}`
                    : undefined
                }
                id="search"
                autoComplete="off"
                className="pl-3 pr-9 py-2 h-10 text-sm rounded-lg focus-visible:ring-offset-0 w-full border-gray-200 dark:border-gray-800 focus:border-primary"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
                <AnimatePresence mode="popLayout">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 dark:border-gray-500" />
                    </motion.div>
                  ) : query.length > 0 ? (
                    <motion.div
                      key="send"
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Send className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="search"
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="absolute w-full mt-1 z-50">
            <AnimatePresence>
              {isFocused && result && !selectedAction && (
                <motion.div
                  className="w-full border rounded-md shadow-xl overflow-hidden dark:border-gray-800 bg-white dark:bg-black"
                  variants={ANIMATION_VARIANTS.container}
                  role="listbox"
                  aria-label="Search results"
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  onMouseDown={(e) => {
                    // Prevent blur when clicking inside dropdown
                    e.preventDefault();
                  }}
                >
                  {result.actions.length === 0 ? (
                    <div className="px-4 py-6 text-gray-500 dark:text-gray-400">
                      {query.trim().length === 0 ? (
                        <div className="space-y-4">
                          {/* Categories Section */}
                          {result.categories &&
                            result.categories.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                  Browse by Category
                                </p>
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                                  {/* Get unique categories */}
                                  {Array.from(
                                    new Map(
                                      result.categories.map((item) => [
                                        item.categoryName,
                                        item,
                                      ])
                                    ).values()
                                  )
                                    .filter(
                                      (cat) =>
                                        cat.categoryImage &&
                                        !cat.subcategoryName
                                    )
                                    .slice(0, 10)
                                    .map((category) => (
                                      <button
                                        key={category.id}
                                        onClick={() =>
                                          router.push(
                                            `/category/${encodeURIComponent(
                                              category.categoryName
                                            )}`
                                          )
                                        }
                                        className="flex flex-col items-center group flex-shrink-0 min-w-[65px]"
                                      >
                                        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200">
                                          <Image
                                            src={category.categoryImage || ''}
                                            alt={category.categoryName}
                                            fill
                                            sizes="56px"
                                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                                            priority={false}
                                            quality={75}
                                            onError={(e) => {
                                              e.currentTarget.style.display = "none";
                                            }}
                                          />
                                        </div>
                                        <p className="mt-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight max-w-[65px] break-words group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                          {category.categoryName}
                                        </p>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}

                          <div className="text-xs text-gray-400 space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="font-medium text-gray-600 dark:text-gray-300">
                              💡 Start typing to search products
                            </p>
                          </div>

                          {result.recentSearches &&
                            result.recentSearches.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-medium mb-3 text-gray-700 dark:text-gray-300">
                                  Recent Searches
                                </p>
                                <div className="space-y-2">
                                  {result.recentSearches
                                    .slice(0, 5)
                                    .map((search, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => setQuery(search.query)}
                                        className="w-full text-left p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                                      >
                                        <div className="flex items-center gap-2">
                                          {/* Product Images Preview */}
                                          {search.products &&
                                          search.products.length > 0 ? (
                                            <div className="flex -space-x-2">
                                              {search.products
                                                .slice(0, 3)
                                                .map((product, pIdx) => (
                                                  <div
                                                    key={pIdx}
                                                    className="relative w-8 h-8 rounded-md overflow-hidden bg-white dark:bg-gray-900 border-2 border-gray-50 dark:border-gray-800 shadow-sm"
                                                  >
                                                    {product.thumbnail && (
                                                      <Image
                                                        src={product.thumbnail}
                                                        alt={product.name}
                                                        fill
                                                        sizes="32px"
                                                        className="object-cover"
                                                        priority={false}
                                                        quality={75}
                                                        onError={(e) => {
                                                          e.currentTarget.style.display = "none";
                                                        }}
                                                      />
                                                    )}
                                                  </div>
                                                ))}
                                            </div>
                                          ) : (
                                            <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                              <Search className="w-4 h-4 text-gray-400" />
                                            </div>
                                          )}

                                          {/* Search Query */}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                              {search.query}
                                            </p>
                                            {search.resultsCount !==
                                              undefined && (
                                              <p className="text-[10px] text-gray-400">
                                                {search.resultsCount} results
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}
                          {result.trending && result.trending.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs font-medium mb-2 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Trending Products
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {result.trending.slice(0, 5).map((product) => (
                                  <button
                                    key={product.id}
                                    onClick={() =>
                                      router.push(`/products/${product.id}`)
                                    }
                                    className="text-xs px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                                  >
                                    {product.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm font-medium">
                            {result.message ||
                              `No products found for "${query}"`}
                          </p>

                          {/* Press Enter to search all products */}
                          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">
                              🔍 Press{" "}
                              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded font-mono">
                                Enter
                              </kbd>{" "}
                              to search all products for &quot;{query}&quot;
                            </p>
                          </div>

                          {/* Smart Recommendations for Price Queries */}
                          {query.match(
                            /(?:under|below|less than|<)\s*(\d+)/i
                          ) && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">
                                💡 Try searching with categories:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  "mobiles",
                                  "laptops",
                                  "headphones",
                                  "watches",
                                  "shoes",
                                  "books",
                                ].map((category) => (
                                  <button
                                    key={category}
                                    onClick={() =>
                                      setQuery(`${query} ${category}`)
                                    }
                                    className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                                  >
                                    {query} {category}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {result.suggestions?.keywords &&
                            result.suggestions.keywords.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-medium mb-2">
                                  Suggested Keywords
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {result.suggestions.keywords.map(
                                    (keyword, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => setQuery(keyword)}
                                        className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                      >
                                        {keyword}
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          {result.suggestions?.categories &&
                            result.suggestions.categories.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-medium mb-2">
                                  Try These Categories
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {result.suggestions.categories.map(
                                    (category, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => setQuery(category)}
                                        className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                      >
                                        {category}
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <motion.ul role="none">
                        {result.actions.map((action) => (
                          <motion.li
                            key={action.id}
                            id={`action-${action.id}`}
                            className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-zinc-900 cursor-pointer transition-colors ${
                              activeIndex === result.actions.indexOf(action)
                                ? "bg-gray-50 dark:bg-zinc-800"
                                : ""
                            }`}
                            variants={ANIMATION_VARIANTS.item}
                            layout
                            onClick={() => handleActionClick(action)}
                            role="option"
                            aria-selected={
                              activeIndex === result.actions.indexOf(action)
                            }
                          >
                            {/* Product Image */}
                            {action.image && (
                              <div className="relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                                <Image
                                  src={action.image}
                                  alt={action.label}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                  priority={false}
                                  quality={75}
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              </div>
                            )}

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-gray-500 flex-shrink-0"
                                  aria-hidden="true"
                                >
                                  {action.icon}
                                </span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {action.label}
                                </span>
                              </div>
                              {action.description && (
                                <span className="text-xs text-gray-400 block mt-0.5">
                                  {action.description}
                                </span>
                              )}
                            </div>

                            {/* Price */}
                            <div className="flex-shrink-0">
                              {action.short && (
                                <span
                                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded whitespace-nowrap"
                                  aria-label={`Price: ${action.short}`}
                                >
                                  {action.short}
                                </span>
                              )}
                            </div>
                          </motion.li>
                        ))}
                      </motion.ul>
                      <div className="mt-2 px-3 py-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-600 font-medium">
                              {result.actions.length}{" "}
                              {result.actions.length === 1
                                ? "Product"
                                : "Products"}{" "}
                              Found
                            </span>
                            {result.performance && (
                              <span className="text-gray-400">
                                {result.performance.searchTime}ms
                                {result.performance.cacheHit && " (cached)"}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={handleViewAllResults}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                          >
                            View All →
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}

export default ActionSearchBar;
