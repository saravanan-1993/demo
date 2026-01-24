"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  IconChevronDown,
  IconPlus,
  IconMinus,
  IconHeart,
  IconCheck,
} from "@tabler/icons-react";
import type { Product } from "@/services/online-services/frontendProductService";
import { generateProductUrl } from "@/lib/slugify";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { useWishlist } from "@/context/WishlistContext";
import { useCurrency } from "@/hooks/useCurrency";

interface DynamicProductCardProps {
  product: Product;
}

export default function DynamicProductCard({
  product,
}: DynamicProductCardProps) {
  // Filter only active variants
  const activeVariants = product.variants.filter(v => v.variantStatus === "active");
  
  // Find the default variant index from active variants, fallback to 0
  const defaultVariantIndex = activeVariants.findIndex(v => v.isDefault);
  const [selectedVariant, setSelectedVariant] = useState(defaultVariantIndex >= 0 ? defaultVariantIndex : 0);
  const [showVariants, setShowVariants] = useState(false);
  const [selectedCuttingStyle, setSelectedCuttingStyle] = useState("");
  const [showCuttingStyles, setShowCuttingStyles] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cuttingStyleRef = useRef<HTMLDivElement>(null);
  const initialScrollY = useRef<number>(0);
  const { addToCart, updateQuantity, getItemQuantity } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);
  const currencySymbol = useCurrency();

  // Get cutting styles from product (dynamic from backend)
  const cuttingStyles = product.cuttingStyles || [];
  const hasCuttingStyles = cuttingStyles.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowVariants(false);
      }
      if (
        cuttingStyleRef.current &&
        !cuttingStyleRef.current.contains(event.target as Node)
      ) {
        setShowCuttingStyles(false);
      }
    };

    if (showVariants || showCuttingStyles) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showVariants, showCuttingStyles]);

  // Close dropdowns on scroll - close when scrolled significantly (100px)
  useEffect(() => {
    if (!showVariants && !showCuttingStyles) return;
    
    initialScrollY.current = window.scrollY;
    
    const handleScroll = () => {
      const scrollDiff = Math.abs(window.scrollY - initialScrollY.current);
      if (scrollDiff > 100) {
        setShowVariants(false);
        setShowCuttingStyles(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showVariants, showCuttingStyles]);

  const currentVariant = activeVariants[selectedVariant];
  const inventoryProductId = currentVariant?.inventoryProductId || "";
  // Get quantity for this specific variant + cutting style combination
  const quantity = getItemQuantity(product.id, inventoryProductId, selectedCuttingStyle || undefined);
  const productUrl = generateProductUrl(product);

  // Get image from variant or use placeholder
  const productImage =
    currentVariant?.variantImages?.[0] || "/placeholder-product.png";

  // Calculate discount
  const price =
    currentVariant?.variantSellingPrice || product.defaultSellingPrice;
  const mrp = currentVariant?.variantMRP || product.defaultMRP;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const availableStock = currentVariant?.variantStockQuantity || 0;
  const isOutOfStock =
    availableStock <= 0 ||
    currentVariant?.variantStockStatus === "out-of-stock";
  const isLowStock =
    availableStock > 0 &&
    availableStock <= (currentVariant?.variantLowStockAlert || 5);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) {
      toast.error("This item is currently out of stock");
      return;
    }

    // If product has cutting styles, require selection before adding to cart
    if (hasCuttingStyles && !selectedCuttingStyle) {
      toast.warning("Please select a cutting style");
      setShowCuttingStyles(true);
      return;
    }

    // ✅ FIX: Find the actual index in the original product.variants array
    // selectedVariant is the index in activeVariants, but we need the index in product.variants
    const actualVariantIndex = product.variants.findIndex(
      v => v.inventoryProductId === currentVariant?.inventoryProductId
    );

    if (actualVariantIndex === -1) {
      toast.error("Variant not found");
      return;
    }

    await addToCart(
      product,
      actualVariantIndex, // ✅ Use actual index from product.variants
      selectedCuttingStyle || undefined
    );
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (quantity >= availableStock) {
      toast.warning(`Only ${availableStock} items available in stock`);
      return;
    }

    updateQuantity(product.id, inventoryProductId, quantity + 1, selectedCuttingStyle || undefined);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, inventoryProductId, quantity - 1, selectedCuttingStyle || undefined);
    if (quantity === 1) {
      toast.info("Item removed from cart");
    }
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow group relative overflow-visible flex flex-col"
      style={{ minHeight: '420px' }}
    >
      {/* Wishlist Icon */}
      <button
        onClick={handleWishlistToggle}
        className="absolute top-2 left-2 sm:top-2 sm:left-2 z-20 p-2 sm:p-1.5 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
        aria-label="Add to wishlist"
      >
        <IconHeart
          size={18}
          className={`sm:w-5 sm:h-5 transition-colors ${
            isWishlisted
              ? "fill-red-500 text-red-500"
              : "text-gray-600 hover:text-red-500"
          }`}
        />
      </button>

      {/* Discount Badge - Overlay on Image (Top Right) */}
      {discount > 0 && (
        <span className="absolute top-2 right-2 sm:top-2 sm:right-2 bg-green-600 text-white text-xs sm:text-xs font-bold px-2 sm:px-2 py-1 rounded z-10">
          {discount}% OFF
        </span>
      )}

      {/* Product Image */}
      <Link
        href={productUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-t-lg flex-shrink-0 bg-white"
      >
        <div className="relative aspect-square w-full flex items-center justify-center">
          {productImage ? (
            <Image
              src={productImage}
              alt={product.shortDescription}
              width={300}
              height={300}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              className="w-full h-full object-contain p-4"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No Image
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-3 sm:p-3 flex flex-col flex-1">
        {/* Brand */}
        <p className="text-xs sm:text-xs text-gray-500 mb-1">
          {product.brand}
        </p>

        {/* Product Display Name (from variant) */}
        <Link href={productUrl} target="_blank" rel="noopener noreferrer">
          <h3 className="text-sm sm:text-sm font-medium text-gray-800 mb-2 sm:mb-1.5 line-clamp-2 min-h-[40px] sm:min-h-[40px] hover:text-[#e63946] transition-colors">
            {currentVariant?.displayName ||
              product.shortDescription ||
              currentVariant?.variantName}
          </h3>
        </Link>

        {/* Variant Selector - Reduced height */}
        <div ref={dropdownRef} className="relative mb-2 sm:mb-2 h-9 sm:h-8">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (activeVariants.length > 1) {
                setShowVariants(!showVariants);
              }
            }}
            disabled={activeVariants.length === 1}
            className={`w-full h-full flex items-center justify-between px-3 sm:px-3 rounded text-sm sm:text-sm text-gray-700 transition-colors ${
              activeVariants.length === 1
                ? "bg-gray-100 cursor-default"
                : "bg-white border border-gray-300 hover:border-gray-400 cursor-pointer"
            }`}
          >
            <span className="truncate pr-2 sm:pr-2">
              {currentVariant?.displayName || currentVariant?.variantName || "Select Variant"}
            </span>
            {activeVariants.length > 1 && (
              <IconChevronDown
                size={14}
                className={`flex-shrink-0 transition-transform sm:w-3.5 sm:h-3.5 ${
                  showVariants ? "rotate-180" : ""
                }`}
              />
            )}
          </button>

          {/* Variants Dropdown - Reduced item height */}
          {showVariants && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
              {activeVariants.map((variant, index) => {
                const variantDiscount =
                  variant.variantMRP > variant.variantSellingPrice
                    ? Math.round(
                        ((variant.variantMRP - variant.variantSellingPrice) /
                          variant.variantMRP) *
                          100
                      )
                    : 0;
                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedVariant(index);
                      setShowVariants(false);
                    }}
                    className={`w-full px-3 sm:px-3 py-2 sm:py-1.5 text-left hover:bg-gray-50 flex items-center justify-between gap-2 ${
                      selectedVariant === index ? "bg-green-50" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-sm text-gray-700 truncate">
                        {variant.displayName || variant.variantName}
                      </p>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {variantDiscount > 0 && (
                          <span className="text-xs sm:text-xs text-green-600 font-medium whitespace-nowrap">
                            {variantDiscount}% OFF
                          </span>
                        )}
                        <span className="text-sm sm:text-sm font-semibold whitespace-nowrap">
                          {currencySymbol}
                          {variant.variantSellingPrice}
                        </span>
                        {variantDiscount > 0 && (
                          <span className="text-xs sm:text-xs text-gray-400 line-through whitespace-nowrap">
                            {currencySymbol}
                            {variant.variantMRP}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedVariant === index && (
                      <span className="text-[#e63946] flex-shrink-0">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 sm:gap-2 mb-2 sm:mb-2">
          <span className="text-lg sm:text-lg font-bold text-gray-900">
            {currencySymbol}
            {price.toFixed(0)}
          </span>
          {discount > 0 && (
            <span className="text-sm sm:text-sm text-gray-400 line-through">
              {currencySymbol}
              {mrp.toFixed(0)}
            </span>
          )}
        </div>

        {/* Cutting Style Selector - Only show if product has cutting styles */}
        {hasCuttingStyles && (
          <div ref={cuttingStyleRef} className="relative mb-2 sm:mb-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCuttingStyles(!showCuttingStyles);
              }}
              className="inline-flex items-center gap-1 sm:gap-1 text-xs sm:text-xs bg-green-100 text-green-700 px-2.5 sm:px-2 py-1.5 rounded font-medium hover:bg-green-200 transition-colors"
            >
              <span className="font-medium">
                {selectedCuttingStyle || "Cutting Style"}
              </span>
              <IconChevronDown
                size={12}
                className={`sm:w-3 sm:h-3 transition-transform ${
                  showCuttingStyles ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Cutting Styles Dropdown */}
            {showCuttingStyles && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] max-h-40 overflow-y-auto">
                <div className="px-3 py-2 bg-gray-50 border-b text-xs sm:text-xs text-gray-500 font-medium">
                  Choose cutting style
                </div>
                {cuttingStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedCuttingStyle(style.name);
                      setShowCuttingStyles(false);
                    }}
                    className={`w-full px-3 sm:px-3 py-2 sm:py-2 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-0 ${
                      selectedCuttingStyle === style.name ? "bg-green-50" : ""
                    }`}
                  >
                    <span className="text-sm sm:text-sm text-gray-700">
                      {style.name}
                    </span>
                    {selectedCuttingStyle === style.name && (
                      <IconCheck
                        size={16}
                        className="text-green-600 sm:w-4 sm:h-4"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stock Status - Always reserve space for consistency */}
        <div className="mb-2 h-5 flex items-center">
          {isLowStock && quantity === 0 && (
            <span className="text-xs sm:text-xs text-orange-600 font-medium">
              Only {availableStock} left in stock
            </span>
          )}
          {quantity >= availableStock && quantity > 0 && (
            <p className="text-xs sm:text-xs text-orange-600 font-medium text-center w-full">
              Max stock reached
            </p>
          )}
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-1"></div>

        {/* Add to Cart Button - Always at bottom */}
        <div className="flex items-center gap-2">
          {quantity === 0 ? (
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="flex-1 py-2.5 sm:py-2 px-4 sm:px-4 bg-[#e63946] text-white rounded font-medium hover:bg-[#d62839] transition-all duration-200 active:scale-95 text-sm sm:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </button>
          ) : (
            <div className="flex-1">
              <div className="flex items-center justify-between border-2 border-[#e63946] rounded overflow-hidden">
                <button
                  onClick={handleDecrement}
                  className="px-3 sm:px-3 py-2 sm:py-2 text-[#e63946] hover:bg-[#e63946] hover:text-white transition-all duration-200 active:scale-95"
                >
                  <IconMinus size={16} className="sm:w-4 sm:h-4" />
                </button>
                <span className="font-medium text-[#e63946] text-sm sm:text-sm">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  disabled={quantity >= availableStock}
                  className="px-3 sm:px-3 py-2 sm:py-2 text-[#e63946] hover:bg-[#e63946] hover:text-white transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconPlus size={16} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
