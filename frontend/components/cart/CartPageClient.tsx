"use client";

import {
  IconMinus,
  IconPlus,
  IconX,
  IconShoppingCart,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import { generateProductSlug } from "@/lib/slugify";

export default function CartPageClient() {
  const {
    items,
    updateQuantity,
    removeFromCart,
    totalPrice,
    totalSavings,
    totalItems,
    isLoading,
    isInitialized,
  } = useCart();
  const currencySymbol = useCurrency();

  const deliveryFee = totalPrice >= 499 ? 0 : 40;
  const total = totalPrice + deliveryFee;

  // Check for stock issues
  const hasStockIssues = items.some(item => item.quantity > item.maxStock || item.maxStock === 0);
  const outOfStockItems = items.filter(item => item.maxStock === 0);
  const overStockItems = items.filter(item => item.quantity > item.maxStock && item.maxStock > 0);

  // Helper function to generate proper product URL for cart items
  const generateCartItemUrl = (item: {
    productId: string;
    inventoryProductId: string;
    brand: string;
    displayName?: string;
    variantName: string;
  }) => {
    const slug = generateProductSlug({
      brand: item.brand,
      shortDescription: item.displayName || item.variantName,
    });
    const variantParam = item.inventoryProductId ? `?variant=${item.inventoryProductId}` : '';
    return `/products/${slug}/${item.productId}${variantParam}`;
  };

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 mb-4 sm:mb-8">
            <Skeleton className="h-4 w-12 bg-gray-200" />
            <span className="text-gray-300">/</span>
            <Skeleton className="h-4 w-24 bg-gray-200" />
          </div>

          {/* Page Header Skeleton */}
          <div className="mb-4 sm:mb-8">
            <Skeleton className="h-8 w-48 mb-2 bg-gray-200" />
            <Skeleton className="h-4 w-64 bg-gray-200" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Cart Items Skeleton */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Table Header Skeleton - Desktop */}
                <div className="hidden sm:block bg-gray-50 px-6 py-4 border-b">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <Skeleton className="h-4 w-20 bg-gray-200" />
                    </div>
                    <div className="col-span-2">
                      <Skeleton className="h-4 w-16 mx-auto bg-gray-200" />
                    </div>
                    <div className="col-span-2">
                      <Skeleton className="h-4 w-16 mx-auto bg-gray-200" />
                    </div>
                    <div className="col-span-2">
                      <Skeleton className="h-4 w-16 mx-auto bg-gray-200" />
                    </div>
                  </div>
                </div>

                <div className="divide-y">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 sm:p-6">
                      <div className="flex gap-4">
                        <Skeleton className="w-[80px] h-[80px] rounded-lg flex-shrink-0 bg-gray-200" />
                        <div className="flex-1 w-full">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2 w-full">
                              <Skeleton className="h-4 w-1/3 bg-gray-200" />
                              <Skeleton className="h-5 w-3/4 bg-gray-200" />
                              <Skeleton className="h-3 w-1/4 bg-gray-200" />
                            </div>
                            <Skeleton className="h-6 w-6 rounded bg-gray-200" />
                          </div>
                          <div className="hidden sm:flex items-center justify-between mt-4">
                            <Skeleton className="h-5 w-20 bg-gray-200" />
                            <Skeleton className="h-8 w-24 rounded bg-gray-200" />
                            <Skeleton className="h-5 w-16 bg-gray-200" />
                          </div>
                          {/* Mobile skeleton parts */}
                          <div className="sm:hidden mt-3 flex justify-between items-center">
                            <Skeleton className="h-8 w-24 rounded bg-gray-200" />
                            <Skeleton className="h-5 w-16 bg-gray-200" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:sticky lg:top-24 space-y-4">
                <Skeleton className="h-6 w-32 mb-4 bg-gray-200" />
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24 bg-gray-200" />
                    <Skeleton className="h-4 w-16 bg-gray-200" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24 bg-gray-200" />
                    <Skeleton className="h-4 w-16 bg-gray-200" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24 bg-gray-200" />
                    <Skeleton className="h-4 w-16 bg-gray-200" />
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-16 bg-gray-200" />
                    <Skeleton className="h-6 w-24 bg-gray-200" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full rounded-md mt-4 bg-gray-200" />
                <Skeleton className="h-12 w-full rounded-md bg-gray-200" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4 sm:mb-8">
          <Link href="/" className="hover:text-[#e63946]">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-900">Shopping Cart</span>
        </nav>

        {/* Page Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            Shopping Cart
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            There are {totalItems} products in your cart
          </p>
        </div>

        {items.length === 0 ? (
          /* Empty Cart */
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <IconShoppingCart size={32} className="text-gray-400 sm:hidden" />
              <IconShoppingCart
                size={48}
                className="text-gray-400 hidden sm:block"
              />
            </div>
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">
              Your Cart is Empty
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-8">
              Looks like you have not added any items to your cart yet.
            </p>
            <Link
              href="/products"
              className="inline-block bg-[#e63946] text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-md hover:bg-[#c1121f] transition-colors text-sm sm:text-base"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Table Header - Desktop Only */}
                <div className="hidden sm:block bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b">
                  <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                    <div className="col-span-6">Product</div>
                    <div className="col-span-2 text-center">Price</div>
                    <div className="col-span-2 text-center">Quantity</div>
                    <div className="col-span-2 text-center">Total</div>
                  </div>
                </div>

                {/* Cart Items */}
                <div className="divide-y">
                  {items.map((item) => (
                    <div
                      key={`${item.productId}-${item.inventoryProductId}-${item.selectedCuttingStyle || 'none'}`}
                      className={`p-3 sm:p-6 ${item.maxStock === 0 ? 'opacity-60 bg-gray-50' : ''}`}
                    >
                      {/* Mobile Layout */}
                      <div className="sm:hidden">
                        <div className="flex gap-3">
                          <div className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                            <Image
                              src={item.variantImage}
                              alt={item.displayName}
                              width={80}
                              height={80}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <p className="text-xs text-gray-500">
                                  {item.brand}
                                </p>
                                <Link href={generateCartItemUrl(item)}>
                                  <h3 className="font-medium text-gray-900 text-sm line-clamp-2 hover:text-[#e63946]">
                                    {item.displayName || item.variantName}
                                  </h3>
                                </Link>
                                {item.selectedCuttingStyle && (
                                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                    <span>✂</span> {item.selectedCuttingStyle}
                                  </span>
                                )}
                                {item.maxStock === 0 && (
                                  <p className="text-xs text-red-600 mt-1 font-semibold bg-red-50 px-2 py-1 rounded">
                                    ❌ Out of Stock
                                  </p>
                                )}
                                {item.quantity > item.maxStock && item.maxStock > 0 && (
                                  <p className="text-xs text-red-600 mt-1 font-semibold bg-red-50 px-2 py-1 rounded">
                                    ⚠️ Only {item.maxStock} available
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() =>
                                  removeFromCart(
                                    item.productId,
                                    item.inventoryProductId,
                                    item.selectedCuttingStyle
                                  )
                                }
                                className={`p-1 flex-shrink-0 transition-colors ${
                                  item.maxStock === 0 
                                    ? 'text-red-500 hover:text-red-700 opacity-100 bg-red-50 rounded' 
                                    : 'text-gray-400 hover:text-red-500'
                                }`}
                              >
                                <IconX size={18} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center border border-gray-300 rounded">
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      item.productId,
                                      item.inventoryProductId,
                                      item.quantity - 1,
                                      item.selectedCuttingStyle
                                    )
                                  }
                                  disabled={item.maxStock === 0}
                                  className="p-1.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <IconMinus size={14} />
                                </button>
                                <span className="px-3 py-1 text-sm min-w-[32px] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      item.productId,
                                      item.inventoryProductId,
                                      item.quantity + 1,
                                      item.selectedCuttingStyle
                                    )
                                  }
                                  disabled={item.quantity >= item.maxStock || item.maxStock === 0}
                                  className="p-1.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <IconPlus size={14} />
                                </button>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-[#e63946]">
                                  {currencySymbol}
                                  {(
                                    item.variantSellingPrice * item.quantity
                                  ).toFixed(0)}
                                </span>
                                {item.variantMRP > item.variantSellingPrice && (
                                  <span className="block text-xs text-gray-400 line-through">
                                    {currencySymbol}
                                    {(item.variantMRP * item.quantity).toFixed(
                                      0
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:grid grid-cols-12 gap-4 items-center">
                        {/* Product Info */}
                        <div className="col-span-6 flex items-center gap-4">
                          <button
                            onClick={() =>
                              removeFromCart(
                                item.productId,
                                item.inventoryProductId,
                                item.selectedCuttingStyle
                              )
                            }
                            className={`transition-colors ${
                              item.maxStock === 0 
                                ? 'text-red-500 hover:text-red-700 opacity-100 bg-red-50 rounded p-2' 
                                : 'text-gray-400 hover:text-red-500'
                            }`}
                          >
                            <IconX size={20} />
                          </button>
                          <div className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                            <Image
                              src={item.variantImage}
                              alt={item.shortDescription}
                              width={80}
                              height={80}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">
                              {item.brand}
                            </p>
                            <Link href={generateCartItemUrl(item)}>
                              <h3 className="font-semibold text-gray-900 hover:text-[#e63946] transition-colors">
                                {item.displayName || item.variantName}
                              </h3>
                            </Link>
                            {item.selectedCuttingStyle && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                <span>✂</span> {item.selectedCuttingStyle}
                              </span>
                            )}
                            {item.maxStock === 0 && (
                              <p className="text-xs text-red-600 mt-1 font-semibold bg-red-50 px-2 py-1 rounded">
                                ❌ Out of Stock
                              </p>
                            )}
                            {item.quantity > item.maxStock && item.maxStock > 0 && (
                              <p className="text-xs text-red-600 mt-1 font-semibold bg-red-50 px-2 py-1 rounded">
                                ⚠️ Only {item.maxStock} available
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="col-span-2 text-center">
                          <span className="font-semibold text-gray-900">
                            {currencySymbol}
                            {item.variantSellingPrice.toFixed(0)}
                          </span>
                          {item.variantMRP > item.variantSellingPrice && (
                            <span className="block text-xs text-gray-400 line-through">
                              {currencySymbol}
                              {item.variantMRP.toFixed(0)}
                            </span>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="col-span-2 flex justify-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center border border-gray-300 rounded-md">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.inventoryProductId,
                                    item.quantity - 1,
                                    item.selectedCuttingStyle
                                  )
                                }
                                disabled={item.maxStock === 0}
                                className="p-2 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <IconMinus size={16} />
                              </button>
                              <span className="px-4 py-2 min-w-[40px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.inventoryProductId,
                                    item.quantity + 1,
                                    item.selectedCuttingStyle
                                  )
                                }
                                disabled={item.quantity >= item.maxStock || item.maxStock === 0}
                                className="p-2 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <IconPlus size={16} />
                              </button>
                            </div>
                            {item.maxStock === 0 && (
                              <span className="text-xs text-red-600 font-medium">
                                Out of stock
                              </span>
                            )}
                            {item.quantity >= item.maxStock && item.maxStock > 0 && (
                              <span className="text-xs text-orange-600">
                                Max stock
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Total */}
                        <div className="col-span-2 text-center">
                          <span className="font-semibold text-[#e63946]">
                            {currencySymbol}
                            {(item.variantSellingPrice * item.quantity).toFixed(
                              0
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart Actions */}
                <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
                  <Link
                    href="/products"
                    className="text-[#e63946] hover:underline font-medium text-sm sm:text-base"
                  >
                    ← Continue Shopping
                  </Link>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              {/* Stock Issues Warning */}
              {hasStockIssues && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="text-red-500 mt-0.5">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-800 mb-2">
                        Stock Issues Found
                      </h4>
                      <div className="text-xs text-red-700 space-y-1">
                        {outOfStockItems.length > 0 && (
                          <p>• {outOfStockItems.length} item(s) are out of stock</p>
                        )}
                        {overStockItems.length > 0 && (
                          <p>• {overStockItems.length} item(s) exceed available stock</p>
                        )}
                        <p className="font-medium mt-2">
                          Please remove out-of-stock items or adjust quantities before checkout.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:sticky lg:top-24">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                  Order Summary
                </h3>

                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-gray-600">
                      Subtotal ({totalItems} items)
                    </span>
                    <span className="font-semibold">
                      {currencySymbol}
                      {totalPrice.toFixed(2)}
                    </span>
                  </div>
                  {/* {totalSavings > 0 && (
                    <div className="flex justify-between text-green-600 text-sm sm:text-base">
                      <span>Discount</span>
                      <span className="font-semibold">
                        -{currencySymbol}
                        {totalSavings.toFixed(2)}
                      </span>
                    </div>
                  )} */}
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="font-semibold">
                      {deliveryFee === 0 ? (
                        <span className="text-green-600">FREE</span>
                      ) : (
                        `${currencySymbol}${deliveryFee}`
                      )}
                    </span>
                  </div>
                  <div className="border-t pt-3 sm:pt-4">
                    <div className="flex justify-between">
                      <span className="text-base sm:text-lg font-semibold text-gray-900">
                        Total
                      </span>
                      <span className="text-base sm:text-lg font-bold text-[#e63946]">
                        {currencySymbol}
                        {total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shipping Notice */}
                {deliveryFee > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 sm:p-4 mb-4 sm:mb-6">
                    <p className="text-xs sm:text-sm text-yellow-800">
                      Add {currencySymbol}
                      {(499 - totalPrice).toFixed(2)} more to get free delivery!
                    </p>
                  </div>
                )}

                {/* Savings Badge */}
                {totalSavings > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 sm:p-4 mb-4 sm:mb-6">
                    <p className="text-xs sm:text-sm text-green-800 font-medium">
                      🎉 You are saving {currencySymbol}
                      {totalSavings.toFixed(2)} on this order!
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 mb-3 sm:mb-4">
                  {hasStockIssues ? (
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-500 py-2.5 sm:py-3 rounded-md font-semibold text-sm sm:text-base shadow-sm flex items-center justify-center cursor-not-allowed"
                    >
                      Cannot Proceed - Stock Issues
                    </button>
                  ) : (
                    <Link
                      href="/checkout"
                      className="w-full bg-[#e63946] text-white py-2.5 sm:py-3 rounded-md hover:bg-[#c1121f] transition-colors font-semibold text-sm sm:text-base shadow-sm flex items-center justify-center"
                    >
                      Proceed to Checkout
                    </Link>
                  )}
                  <Link
                    href="/products"
                    className="w-full border-2 border-gray-300 text-gray-700 py-2.5 sm:py-3 rounded-md hover:border-gray-400 hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base flex items-center justify-center"
                  >
                    Continue Shopping
                  </Link>
                </div>

                {/* Payment Methods */}
                <div className="mt-4 sm:mt-6 text-center">
                  <p className="text-xs text-gray-500 mb-2">We Accept</p>
                  <div className="flex justify-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                      VISA
                    </span>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                      Mastercard
                    </span>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                      UPI
                    </span>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                      COD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
