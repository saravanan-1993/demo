"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  IconChevronDown,
  IconChevronRight,
  IconSearch,
  IconShoppingCart,
  IconUser,
  IconMenu2,
  IconX,
  IconHome,
  IconHeart,
  IconLogout,
  IconDashboard,
  IconPhone,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCategories, type Category } from "@/services/online-services/frontendCategoryService";
import { generateCategoryUrl, generateProductUrl } from "@/lib/slugify";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuthContext } from "@/components/providers/auth-provider";
import { useCurrency } from "@/hooks/useCurrency";
import { useRouter } from "next/navigation";
import { searchProducts, type Product } from "@/services/online-services/frontendProductService";
import { getWebSettings, type WebSettings } from "@/services/online-services/webSettingsService";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [webSettings, setWebSettings] = useState<WebSettings | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const webSettingsCacheRef = useRef<WebSettings | null>(null);
  const { totalItems, totalPrice } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user, isAuthenticated, logout } = useAuthContext();
  const currencySymbol = useCurrency();
  const router = useRouter();
  const [authKey, setAuthKey] = useState(0);

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Force re-render when auth state changes
  useEffect(() => {
    const handleAuthChange = () => {
      console.log('🔄 Header: Auth change detected, forcing re-render');
      console.log('🔍 Header: Current user:', user?.name, 'isAuthenticated:', isAuthenticated);
      setAuthKey(prev => prev + 1);
      // Force a small delay to ensure localStorage is fully updated
      setTimeout(() => {
        setAuthKey(prev => prev + 1);
      }, 50);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth-refresh', handleAuthChange);
      window.addEventListener('storage', handleAuthChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth-refresh', handleAuthChange);
        window.removeEventListener('storage', handleAuthChange);
      }
    };
  }, [user, isAuthenticated]);

  // Log when user or auth state changes
  useEffect(() => {
    console.log('👤 Header: User state changed:', user?.name, 'isAuthenticated:', isAuthenticated);
  }, [user, isAuthenticated]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      setSearchLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await searchProducts(searchQuery.trim());
          setSearchResults(response.data.slice(0, 8)); // Show max 8 results
          setShowSearchResults(true);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 300); // 300ms debounce
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
      setSearchLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Fetch categories and web settings on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch categories
        const categoriesResponse = await getCategories();
        setCategories(categoriesResponse.data);
        if (categoriesResponse.data.length > 0) {
          setActiveCategory(categoriesResponse.data[0]);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch web settings separately
  useEffect(() => {
    const fetchWebSettings = async () => {
      try {
        // Check cache first for web settings
        if (webSettingsCacheRef.current) {
          setWebSettings(webSettingsCacheRef.current);
        } else {
          // Fetch web settings (logo and favicon) only if not cached
          const settingsResponse = await getWebSettings();
          if (settingsResponse.success) {
            setWebSettings(settingsResponse.data);
            webSettingsCacheRef.current = settingsResponse.data; // Cache the settings
          }
        }
      } catch (err) {
        console.error("Error fetching web settings:", err);
      }
    };

    fetchWebSettings();
  }, []);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return "U";
    const names = user.name.trim().split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push("/signin");
  };

  // Handle search submit
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchResults(false);
      setMobileSearchOpen(false);
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Handle search result click
  const handleSearchResultClick = (product: Product) => {
    setShowSearchResults(false);
    setSearchQuery('');
    setMobileSearchOpen(false);
    router.push(generateProductUrl(product));
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Top Header Bar - Same Red as Category Bar */}
      <div className="bg-[#e63946]">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-center py-1.5 sm:py-2 text-white text-[10px] sm:text-xs md:text-sm relative">
            {/* Left Links - Hidden on mobile */}
            <div className="hidden sm:flex items-center gap-4 sm:gap-6 absolute left-3 sm:left-4">
              <Link href="/about" className="hover:underline hidden md:block">
                About Us
              </Link>
              <Link
                href="/contact"
                className="hover:underline flex items-center gap-1"
              >
                <IconPhone size={14} className="hidden md:block" />
                <span>Customer Support</span>
              </Link>
            </div>

            {/* Center - Promotional Text */}
            <p className="text-center">
              Get 10% off your first order.{" "}
              <Link href="/signup" className="underline font-medium">
                Subscribe
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Main Header - White Background */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4 lg:gap-6">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-gray-700 p-1 flex-shrink-0"
            >
              <IconMenu2 size={24} />
            </button>

            {/* Logo - Centered on mobile */}
            <Link href="/" className="flex-shrink-0 lg:flex-shrink mx-auto lg:mx-0">
              {webSettings?.logoUrl ? (
                <Image
                  src={webSettings.logoUrl}
                  alt="Logo"
                  width={180}
                  height={64}
                  className="h-10 sm:h-12 lg:h-14 w-auto object-contain"
                  priority
                />
              ) : (
                <div className="h-10 sm:h-12 lg:h-14 flex items-center">
                  <span className="text-[#e63946] font-bold text-xl sm:text-2xl lg:text-3xl">
                    LEATS
                  </span>
                </div>
              )}
            </Link>

            {/* Shop by Category - Desktop Only */}
            <div
              className="relative hidden lg:block"
              onMouseEnter={() => setShowMegaMenu(true)}
              onMouseLeave={() => setShowMegaMenu(false)}
            >
              <button className="bg-[#e63946] text-white px-4 py-2.5 rounded-md flex items-center gap-2 hover:bg-[#d32f3c] focus:outline-none font-medium transition-colors">
                <IconMenu2 size={20} />
                Shop by Category
                <IconChevronDown
                  size={18}
                  className={`transition-transform ${
                    showMegaMenu ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Mega Menu */}
              {showMegaMenu && activeCategory && (
                <div className="absolute top-full left-0 mt-0 bg-white rounded-lg shadow-2xl border border-gray-200 flex z-50 min-w-[700px]">
                  {/* Categories List - Left Side */}
                  <div className="w-64 bg-gray-50 border-r border-gray-200 py-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                          activeCategory.id === category.id
                            ? "bg-white text-[#e63946] border-l-4 border-[#e63946]"
                            : "hover:bg-white text-gray-700"
                        }`}
                        onMouseEnter={() => setActiveCategory(category)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">
                            {category.name}
                          </span>
                        </div>
                        <IconChevronRight size={16} className="text-gray-400" />
                      </div>
                    ))}
                  </div>

                  {/* Subcategories - Right Side */}
                  <div className="flex-1 p-6">
                    <div className="mb-4">
                      <Link
                        href={generateCategoryUrl(activeCategory)}
                        className="text-lg font-bold text-gray-800 hover:text-[#e63946] transition-colors"
                      >
                        {activeCategory.name}
                      </Link>
                    </div>

                    {activeCategory.subcategories &&
                    activeCategory.subcategories.length > 0 ? (
                      <>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                          {activeCategory.subcategories.map((sub) => (
                            <Link
                              key={sub.id}
                              href={`${generateCategoryUrl(activeCategory)}?sub=${sub.id}`}
                              className="text-sm text-gray-600 hover:text-[#e63946] hover:underline transition-colors py-1"
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <Link
                            href={generateCategoryUrl(activeCategory)}
                            className="inline-flex items-center gap-2 text-[#e63946] font-medium text-sm hover:underline"
                          >
                            View All {activeCategory.name}
                            <IconChevronRight size={16} />
                          </Link>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No subcategories available
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-xl lg:max-w-2xl relative" ref={searchRef}>
              <form onSubmit={handleSearchSubmit} className="w-full">
                <div className="flex items-center bg-white border border-gray-300 rounded-md overflow-hidden w-full focus-within:border-[#e63946] focus-within:ring-1 focus-within:ring-[#e63946] transition-all">
                  <div className="px-3">
                    <IconSearch size={20} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search for Products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowSearchResults(true);
                    }}
                    className="flex-1 px-2 py-2.5 focus:outline-none text-gray-700 w-full"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowSearchResults(false);
                      }}
                      className="px-2 text-gray-400 hover:text-gray-600"
                    >
                      <IconX size={18} />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-[#e63946] text-white px-4 py-2.5 hover:bg-[#d32f3c] transition-colors"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[500px] overflow-y-auto">
                  {searchLoading ? (
                    <div className="p-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#e63946]"></div>
                      <p className="mt-2 text-sm text-gray-500">Searching...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <>
                      <div className="p-3 border-b bg-gray-50">
                        <p className="text-sm font-medium text-gray-700">
                          Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="divide-y">
                        {searchResults.map((product) => {
                          const variant = product.variants[0];
                          const price = variant?.variantSellingPrice || product.defaultSellingPrice;
                          const mrp = variant?.variantMRP || product.defaultMRP;
                          const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
                          
                          return (
                            <button
                              key={product.id}
                              onClick={() => handleSearchResultClick(product)}
                              className="w-full p-3 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
                            >
                              <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                                {variant?.variantImages?.[0] ? (
                                  <Image
                                    src={variant.variantImages[0]}
                                    alt={product.shortDescription}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                    No Image
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500">{product.brand}</p>
                                <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                                  {variant?.displayName || product.shortDescription}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm font-bold text-gray-900">
                                    {currencySymbol}{price.toFixed(0)}
                                  </span>
                                  {discount > 0 && (
                                    <>
                                      <span className="text-xs text-gray-400 line-through">
                                        {currencySymbol}{mrp.toFixed(0)}
                                      </span>
                                      <span className="text-xs text-green-600 font-medium">
                                        {discount}% OFF
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {searchQuery.trim() && (
                        <div className="p-3 border-t bg-gray-50">
                          <button
                            onClick={() => handleSearchSubmit()}
                            className="w-full text-center text-sm text-[#e63946] font-medium hover:underline"
                          >
                            View all results for &ldquo;{searchQuery}&rdquo;
                          </button>
                        </div>
                      )}
                    </>
                  ) : searchQuery.trim().length >= 2 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500">No products found for &ldquo;{searchQuery}&rdquo;</p>
                      <p className="text-sm text-gray-400 mt-1">Try different keywords</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Mobile Search Button */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden text-gray-700 p-1 flex-shrink-0"
            >
              <IconSearch size={22} />
            </button>

            {/* Account - Desktop */}
            {isClient && isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden md:flex items-center gap-1 lg:gap-2 text-gray-700 hover:text-[#e63946] focus:outline-none">
                    {user.image && user.image.trim() !== "" ? (
                      <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full overflow-hidden border-2 border-[#e63946] bg-gray-100">
                        <Image
                          src={user.image}
                          alt={user.name || "User"}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-[#e63946] text-white flex items-center justify-center font-semibold text-xs lg:text-sm">
                        {getUserInitials()}
                      </div>
                    )}
                    <div className="hidden lg:block text-sm text-left">
                      <p className="text-xs text-gray-500">Hello</p>
                      <p className="font-medium">{user.name.split(" ")[0]}</p>
                    </div>
                    <IconChevronDown size={16} className="hidden lg:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {user.role === "admin" ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/dashboard"
                          className="cursor-pointer flex items-center gap-2"
                        >
                          <IconDashboard size={16} />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <button
                          onClick={handleLogout}
                          className="w-full cursor-pointer flex items-center gap-2"
                        >
                          <IconLogout size={16} />
                          Logout
                        </button>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/my-orders" className="cursor-pointer">
                          My Orders
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/wishlist" className="cursor-pointer">
                          My Wishlist
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <button
                          onClick={handleLogout}
                          className="w-full cursor-pointer flex items-center gap-2"
                        >
                          <IconLogout size={16} />
                          Logout
                        </button>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden md:flex items-center gap-1 lg:gap-2 text-gray-700 hover:text-[#e63946] focus:outline-none">
                    <IconUser size={22} />
                    <div className="hidden lg:block text-sm text-left">
                      <p className="text-xs text-gray-500">Sign In</p>
                      <p className="font-medium">My Account</p>
                    </div>
                    <IconChevronDown size={16} className="hidden lg:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/signin" className="cursor-pointer">
                      Sign In
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/signup" className="cursor-pointer">
                      Register
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/order-tracking" className="cursor-pointer">My Orders</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Wishlist - Hidden on mobile (available in mobile menu) */}
            <Link
              href="/wishlist"
              className="hidden md:flex items-center gap-1 lg:gap-2 text-gray-700 hover:text-[#e63946] transition-colors"
            >
              <div className="relative">
                <IconHeart size={22} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#e63946] text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {wishlistCount}
                  </span>
                )}
              </div>
            </Link>

            {/* Cart - Always visible */}
            <Link
              href="/cart"
              className="flex items-center gap-1 lg:gap-2 text-gray-700 hover:text-[#e63946] transition-colors flex-shrink-0"
            >
              <div className="relative">
                <IconShoppingCart size={24} />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#e63946] text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {totalItems}
                  </span>
                )}
              </div>
              <div className="hidden lg:block text-sm">
                <p className="text-xs text-gray-500">My Cart</p>
                <p className="font-medium">
                  {currencySymbol}
                  {totalPrice.toFixed(2)}
                </p>
              </div>
            </Link>
          </div>

          {/* Mobile Search Bar */}
          {mobileSearchOpen && (
            <div className="md:hidden mt-3 relative" ref={searchRef}>
              <form onSubmit={handleSearchSubmit}>
                <div className="flex items-center bg-white border border-gray-300 rounded-md overflow-hidden focus-within:border-[#e63946] focus-within:ring-1 focus-within:ring-[#e63946] transition-all">
                  <div className="px-3">
                    <IconSearch size={20} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search for Products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowSearchResults(true);
                    }}
                    className="flex-1 px-2 py-2 sm:py-2.5 focus:outline-none text-gray-700 text-sm"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowSearchResults(false);
                      }}
                      className="px-2 text-gray-400 hover:text-gray-600"
                    >
                      <IconX size={18} />
                    </button>
                  )}
                </div>
              </form>

              {/* Mobile Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
                  {searchLoading ? (
                    <div className="p-6 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#e63946]"></div>
                      <p className="mt-2 text-xs text-gray-500">Searching...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <>
                      <div className="p-2 border-b bg-gray-50">
                        <p className="text-xs font-medium text-gray-700">
                          {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="divide-y">
                        {searchResults.map((product) => {
                          const variant = product.variants[0];
                          const price = variant?.variantSellingPrice || product.defaultSellingPrice;
                          const mrp = variant?.variantMRP || product.defaultMRP;
                          const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
                          
                          return (
                            <button
                              key={product.id}
                              onClick={() => handleSearchResultClick(product)}
                              className="w-full p-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-left"
                            >
                              <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                                {variant?.variantImages?.[0] ? (
                                  <Image
                                    src={variant.variantImages[0]}
                                    alt={product.shortDescription}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">
                                    No Image
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-gray-500">{product.brand}</p>
                                <h4 className="text-xs font-medium text-gray-900 line-clamp-2">
                                  {variant?.displayName || product.shortDescription}
                                </h4>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-xs font-bold text-gray-900">
                                    {currencySymbol}{price.toFixed(0)}
                                  </span>
                                  {discount > 0 && (
                                    <span className="text-[10px] text-green-600 font-medium">
                                      {discount}% OFF
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {searchQuery.trim() && (
                        <div className="p-2 border-t bg-gray-50">
                          <button
                            onClick={() => handleSearchSubmit()}
                            className="w-full text-center text-xs text-[#e63946] font-medium hover:underline"
                          >
                            View all results
                          </button>
                        </div>
                      )}
                    </>
                  ) : searchQuery.trim().length >= 2 ? (
                    <div className="p-6 text-center">
                      <p className="text-sm text-gray-500">No products found</p>
                      <p className="text-xs text-gray-400 mt-1">Try different keywords</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Navigation Bar - Desktop - RED BACKGROUND with WHITE TEXT */}
      {!loading && categories.length > 0 && (
        <div className="hidden lg:block bg-[#e63946]">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-6 lg:gap-8 py-2 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={generateCategoryUrl(category)}
                  className="flex items-center gap-2 text-white hover:text-yellow-200 whitespace-nowrap text-sm font-medium py-1 transition-colors"
                >
                  <span>{category.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute left-0 top-0 h-full w-[80%] max-w-xs sm:max-w-sm bg-white overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Menu Header */}
            <div className="bg-[#e63946] p-3 sm:p-4 flex items-center justify-between">
              <Link
                href="/"
                className="flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                {webSettings?.logoUrl ? (
                  <Image
                    src={webSettings.logoUrl}
                    alt="Logo"
                    width={100}
                    height={48}
                    className="h-10 sm:h-12 w-auto object-contain bg-white rounded-md p-1 sm:p-1.5"
                  />
                ) : (
                  <div className="h-10 sm:h-12 flex items-center bg-white rounded-md px-3">
                    <span className="text-[#e63946] font-bold text-lg sm:text-xl">
                      LEATS
                    </span>
                  </div>
                )}
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-white p-1"
              >
                <IconX size={24} />
              </button>
            </div>

            {/* Mobile Menu Links */}
            <div className="p-3 sm:p-4 border-b">
              {isClient && isAuthenticated && user ? (
                <>
                  {/* User Profile Section */}
                  <div className="flex items-center gap-3 py-2 sm:py-3 mb-2">
                    {user.image && user.image.trim() !== "" ? (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-[#e63946] bg-gray-100">
                        <Image
                          src={user.image}
                          alt={user.name || "User"}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#e63946] text-white flex items-center justify-center font-semibold text-base sm:text-lg">
                        {getUserInitials()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{user.name}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  {user.role === "admin" ? (
                    <>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 py-2.5 sm:py-3 text-gray-700 hover:bg-gray-50 rounded-lg px-2 -mx-2 text-sm sm:text-base"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <IconDashboard size={20} />
                        <span>Dashboard</span>
                      </Link>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 py-2.5 sm:py-3 text-red-600 hover:bg-red-50 rounded-lg px-2 -mx-2 text-sm sm:text-base"
                      >
                        <IconLogout size={20} />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/my-orders"
                        className="flex items-center gap-3 py-2.5 sm:py-3 text-gray-700 hover:bg-gray-50 rounded-lg px-2 -mx-2 text-sm sm:text-base"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <IconHome size={20} />
                        <span>My Orders</span>
                      </Link>
                      <Link
                        href="/wishlist"
                        className="flex items-center gap-3 py-2.5 sm:py-3 text-gray-700 hover:bg-gray-50 rounded-lg px-2 -mx-2 text-sm sm:text-base"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="relative">
                          <IconHeart size={20} />
                          {wishlistCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-[#e63946] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
                              {wishlistCount}
                            </span>
                          )}
                        </div>
                        <span>Wishlist</span>
                      </Link>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 py-2.5 sm:py-3 text-red-600 hover:bg-red-50 rounded-lg px-2 -mx-2 text-sm sm:text-base"
                      >
                        <IconLogout size={20} />
                        <span>Logout</span>
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href="/signin"
                    className="flex items-center gap-3 py-2.5 sm:py-3 text-gray-700 hover:bg-gray-50 rounded-lg px-2 -mx-2 text-sm sm:text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <IconUser size={20} />
                    <span>Sign In / Register</span>
                  </Link>
                  <Link
                    href="/my-orders"
                    className="flex items-center gap-3 py-2.5 sm:py-3 text-gray-700 hover:bg-gray-50 rounded-lg px-2 -mx-2 text-sm sm:text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <IconHome size={20} />
                    <span>My Orders</span>
                  </Link>
                  <Link
                    href="/wishlist"
                    className="flex items-center gap-3 py-2.5 sm:py-3 text-gray-700 hover:bg-gray-50 rounded-lg px-2 -mx-2 text-sm sm:text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="relative">
                      <IconHeart size={20} />
                      {wishlistCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-[#e63946] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
                          {wishlistCount}
                        </span>
                      )}
                    </div>
                    <span>Wishlist</span>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Categories */}
            {!loading && categories.length > 0 && (
              <div className="p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase mb-2 sm:mb-3">
                  Shop by Category
                </h3>
                <div className="space-y-0.5 sm:space-y-1">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={generateCategoryUrl(category)}
                      className="flex items-center gap-3 py-2.5 sm:py-3 text-gray-700 hover:text-[#e63946] hover:bg-gray-50 rounded-lg px-2 -mx-2 text-sm sm:text-base"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="font-medium">{category.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Footer Links */}
            <div className="p-3 sm:p-4 border-t bg-gray-50">
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <Link
                  href="/about"
                  className="py-1.5 sm:py-2 text-gray-600 hover:text-[#e63946]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About Us
                </Link>
                <Link
                  href="/contact"
                  className="py-1.5 sm:py-2 text-gray-600 hover:text-[#e63946]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </Link>
                <Link
                  href="/faq"
                  className="py-1.5 sm:py-2 text-gray-600 hover:text-[#e63946]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  FAQs
                </Link>
                <Link
                  href="/shipping"
                  className="py-1.5 sm:py-2 text-gray-600 hover:text-[#e63946]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Shipping
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
