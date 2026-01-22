"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  IconChevronDown,
  IconPlus,
  IconMinus,
  IconHeart,
  IconCheck,
} from "@tabler/icons-react";
import { Product } from "@/MockData/ProductData";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCurrency } from "@/hooks/useCurrency";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  // Filter only active variants
  const activeVariants = product.variants.filter(v => v.variantStatus === "active");
  
  // Find the default variant index from active variants, fallback to 0
  const defaultVariantIndex = activeVariants.findIndex(v => v.isDefault);
  const [selectedVariant, setSelectedVariant] = useState(defaultVariantIndex >= 0 ? defaultVariantIndex : 0);
  const [showVariants, setShowVariants] = useState(false);
  const { addToCart, updateQuantity, getItemQuantity } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const currencySymbol = useCurrency();
  const isWishlisted = isInWishlist(product.id);

  const currentVariant = activeVariants[selectedVariant];
  const quantity = getItemQuantity(product.id, selectedVariant);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product, selectedVariant);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, selectedVariant, quantity + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, selectedVariant, quantity - 1);
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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group relative h-full flex flex-col">
      {/* Wishlist Icon */}
      <button
        onClick={handleWishlistToggle}
        className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10 p-1 sm:p-1.5 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
        aria-label="Add to wishlist"
      >
        <IconHeart
          size={16}
          className={`sm:w-5 sm:h-5 transition-colors ${
            isWishlisted
              ? "fill-red-500 text-red-500"
              : "text-gray-600 hover:text-red-500"
          }`}
        />
      </button>

      {/* Badge */}
      {product.badge && (
        <span
          className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 ${product.badgeColor} text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full z-10 flex items-center gap-0.5 sm:gap-1`}
        >
          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></span>
          {product.badge}
        </span>
      )}

      {/* Product Image */}
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-square bg-gray-50 p-2 sm:p-4">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-1 sm:p-2"
          />
        </div>
      </Link>

      {/* Product Info - Flex grow to fill space */}
      <div className="p-2 sm:p-3 flex flex-col flex-grow">
        {/* Brand */}
        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">
          {product.brand}
        </p>

        {/* Product Name - Fixed height */}
        <Link href={`/products/${product.id}`}>
          <h3 className="text-xs sm:text-sm font-medium text-gray-800 mb-1.5 sm:mb-2 line-clamp-2 h-8 sm:h-10 hover:text-[#e63946] transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Weight Selector - Fixed height */}
        <div className="relative mb-2 sm:mb-3 h-8 sm:h-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (activeVariants.length > 1) {
                setShowVariants(!showVariants);
              }
            }}
            disabled={activeVariants.length === 1}
            className={`w-full h-full flex items-center justify-between px-2 sm:px-3 rounded text-xs sm:text-sm text-gray-700 transition-colors ${
              activeVariants.length === 1
                ? "bg-gray-100 cursor-default"
                : "bg-white border border-gray-300 hover:border-gray-400 cursor-pointer"
            }`}
          >
            <span className="truncate pr-1 sm:pr-2">
              {currentVariant.weight}
            </span>
            {activeVariants.length > 1 && (
              <IconChevronDown
                size={14}
                className={`flex-shrink-0 transition-transform sm:w-4 sm:h-4 ${
                  showVariants ? "rotate-180" : ""
                }`}
              />
            )}
          </button>

          {/* Variants Dropdown */}
          {showVariants && (
            <div className="absolute top-full left-0 mt-1 w-[280px] sm:w-[320px] bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              {activeVariants.slice(0, 5).map((variant, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedVariant(index);
                    setShowVariants(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-0 ${
                    selectedVariant === index ? "bg-green-50" : ""
                  }`}
                >
                  <div className="flex-shrink-0 min-w-0 mr-3">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {variant.weight}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                    <div className="flex flex-col items-end w-[90px]">
                      {variant.discount > 0 ? (
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 rounded mb-0.5 whitespace-nowrap">
                          {variant.discount}% OFF
                        </span>
                      ) : (
                        <div className="h-[17px] mb-0.5" />
                      )}
                      <div className="flex items-center gap-1.5 font-bold justify-end">
                        <span className="text-sm text-gray-900 whitespace-nowrap">
                          {currencySymbol}
                          {variant.price}
                        </span>
                        {variant.discount > 0 && (
                          <span className="text-xs text-gray-400 line-through whitespace-nowrap">
                            {currencySymbol}
                            {variant.mrp}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-5 flex items-center justify-center flex-shrink-0">
                      {selectedVariant === index && (
                        <IconCheck size={18} className="text-green-600" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {activeVariants.length > 5 && (
                <Link
                  href={`/products/${product.id}`}
                  onClick={() => setShowVariants(false)}
                  className="block w-full text-center py-2 px-3 text-sm font-semibold text-[#e63946] hover:bg-red-50 transition-colors border-t border-gray-100"
                >
                  Show More (+{activeVariants.length - 5})
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Price - Fixed height */}
        <div className="flex items-center gap-1 sm:gap-2 h-6 sm:h-7 mb-1 sm:mb-2">
          <span className="text-sm sm:text-lg font-bold text-gray-900">
            {currencySymbol}
            {currentVariant.price}
          </span>
          {currentVariant.discount > 0 && (
            <span className="text-xs sm:text-sm text-gray-400 line-through">
              {currencySymbol}
              {currentVariant.mrp}
            </span>
          )}
        </div>

        {/* Discount Tag - Fixed height with placeholder */}
        <div className="h-5 sm:h-7 mb-2 sm:mb-3">
          {currentVariant.discount > 0 && (
            <span className="inline-flex items-center gap-0.5 sm:gap-1 bg-green-100 text-green-700 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
              <span className="font-medium">Har Din Sasta!</span>
              <IconChevronDown size={10} className="sm:w-3 sm:h-3" />
            </span>
          )}
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-grow"></div>

        {/* Add to Cart Button - Always at bottom */}
        <div className="flex items-center gap-2 mt-auto">
          {quantity === 0 ? (
            <button
              onClick={handleAddToCart}
              className="flex-1 py-1.5 sm:py-2 px-2 sm:px-4 bg-[#e63946] text-white rounded font-medium hover:bg-[#d62839] transition-all duration-200 active:scale-95 text-xs sm:text-sm"
            >
              Add to Cart
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-between border-2 border-[#e63946] rounded overflow-hidden">
              <button
                onClick={handleDecrement}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-[#e63946] hover:bg-[#e63946] hover:text-white transition-all duration-200 active:scale-95"
              >
                <IconMinus size={14} className="sm:w-4 sm:h-4" />
              </button>
              <span className="font-medium text-[#e63946] text-xs sm:text-sm">
                {quantity}
              </span>
              <button
                onClick={handleIncrement}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-[#e63946] hover:bg-[#e63946] hover:text-white transition-all duration-200 active:scale-95"
              >
                <IconPlus size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
