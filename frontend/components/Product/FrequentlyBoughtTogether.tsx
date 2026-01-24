"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { IconShoppingCart } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import type { FrequentlyBoughtTogetherAddon } from "@/services/online-services/frontendProductService";

interface FrequentlyBoughtTogetherProps {
  mainProduct: {
    id: string;
    name: string;
    price: number;
    mrp: number;
    image: string;
    inventoryProductId: string;
    variantIndex: number;
  };
  addons: FrequentlyBoughtTogetherAddon[];
  onAddToCart: (items: Array<{ inventoryProductId: string; quantity: number }>) => Promise<void>;
}

export default function FrequentlyBoughtTogether({
  mainProduct,
  addons,
  onAddToCart,
}: FrequentlyBoughtTogetherProps) {
  const currencySymbol = useCurrency();
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  // Initialize with default selected add-ons
  useEffect(() => {
    const defaultSelected = new Set<string>();
    addons.forEach((addon) => {
      if (addon.isDefaultSelected) {
        defaultSelected.add(`${addon.productId}-${addon.variantIndex}`);
      }
    });
    setSelectedAddons(defaultSelected);
  }, [addons]);

  if (!addons || addons.length === 0) {
    return null;
  }

  const toggleAddon = (addonKey: string) => {
    setSelectedAddons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(addonKey)) {
        newSet.delete(addonKey);
      } else {
        newSet.add(addonKey);
      }
      return newSet;
    });
  };

  const calculateTotal = () => {
    let total = mainProduct.price;
    addons.forEach((addon) => {
      const addonKey = `${addon.productId}-${addon.variantIndex}`;
      if (selectedAddons.has(addonKey)) {
        total += addon.variant.variantSellingPrice;
      }
    });
    return total;
  };

  const calculateTotalMRP = () => {
    let total = mainProduct.mrp;
    addons.forEach((addon) => {
      const addonKey = `${addon.productId}-${addon.variantIndex}`;
      if (selectedAddons.has(addonKey)) {
        total += addon.variant.variantMRP;
      }
    });
    return total;
  };

  const handleAddAllToCart = async () => {
    try {
      setIsAdding(true);

      const itemsToAdd = [
        {
          inventoryProductId: mainProduct.inventoryProductId,
          quantity: 1,
        },
      ];

      // Add selected add-ons
      addons.forEach((addon) => {
        const addonKey = `${addon.productId}-${addon.variantIndex}`;
        if (selectedAddons.has(addonKey)) {
          itemsToAdd.push({
            inventoryProductId: addon.variant.inventoryProductId || "",
            quantity: 1,
          });
        }
      });

      await onAddToCart(itemsToAdd);
      
      toast.success(`${itemsToAdd.length} item(s) added to cart`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add items to cart");
    } finally {
      setIsAdding(false);
    }
  };

  const totalPrice = calculateTotal();
  const totalMRP = calculateTotalMRP();
  const totalSavings = totalMRP - totalPrice;
  const savingsPercentage = totalMRP > 0 ? Math.round((totalSavings / totalMRP) * 100) : 0;

  const selectedCount = 1 + selectedAddons.size;

  return (
    <div className="border-t pt-4 sm:pt-6">
      <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4">
        Frequently bought together
      </h3>

      {/* Amazon-style Layout: Products on left, Price box on right */}
      <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
        {/* Left Side: Products Row - Scrollable when more than 4 items */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-start gap-2 sm:gap-3 overflow-x-auto pb-2 
            [&::-webkit-scrollbar]:h-1.5
            [&::-webkit-scrollbar-track]:bg-gray-100
            [&::-webkit-scrollbar-track]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-gray-300
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
            {/* Main Product - Always Selected */}
            <div className="flex-shrink-0">
              <div className="flex flex-col items-center gap-2">
                {/* Image with checkbox inside */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded border overflow-hidden">
                  <Image
                    src={mainProduct.image}
                    alt={mainProduct.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-contain p-1.5"
                  />
                  {/* Checkbox in top-right corner */}
                  <div className="absolute top-1 right-1">
                    <Checkbox checked disabled className="cursor-not-allowed opacity-50 h-4 w-4 bg-white" />
                  </div>
                </div>
                {/* Product info below image */}
                <div className="text-center max-w-[80px] sm:max-w-[96px]">
                  <p className="text-[10px] sm:text-xs text-gray-700 line-clamp-2 mb-1">
                    {mainProduct.name}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">
                    {currencySymbol}{mainProduct.price.toFixed(0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Plus Icon */}
            <div className="flex-shrink-0 text-gray-300 text-xl sm:text-2xl font-light self-center mt-8">+</div>

            {/* Add-on Products */}
            {addons.map((addon, index) => {
              const addonKey = `${addon.productId}-${addon.variantIndex}`;
              const isSelected = selectedAddons.has(addonKey);
              const discount =
                addon.variant.variantMRP > addon.variant.variantSellingPrice
                  ? Math.round(
                      ((addon.variant.variantMRP - addon.variant.variantSellingPrice) /
                        addon.variant.variantMRP) *
                        100
                    )
                  : 0;

              return (
                <React.Fragment key={addonKey}>
                  <div className="flex-shrink-0">
                    <div className="flex flex-col items-center gap-2">
                      {/* Image with checkbox inside */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded border overflow-hidden cursor-pointer hover:border-gray-400 transition-colors">
                        <Image
                          src={addon.variant.variantImages?.[0] || "/placeholder.png"}
                          alt={addon.variant.displayName || addon.variant.variantName}
                          width={96}
                          height={96}
                          className="w-full h-full object-contain p-1.5"
                        />
                        {/* Checkbox in top-right corner */}
                        <div className="absolute top-1 right-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleAddon(addonKey)}
                            className="h-4 w-4 bg-white"
                          />
                        </div>
                      </div>
                      {/* Product info below image */}
                      <div className="text-center max-w-[80px] sm:max-w-[96px]">
                        <p className="text-[10px] sm:text-xs text-gray-700 line-clamp-2 mb-1">
                          {addon.variant.displayName || addon.variant.variantName}
                        </p>
                        <p className="text-xs sm:text-sm font-semibold text-gray-900">
                          {currencySymbol}{addon.variant.variantSellingPrice.toFixed(0)}
                        </p>
                        {discount > 0 && (
                          <p className="text-[10px] sm:text-xs text-green-600">({discount}% off)</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Plus Icon after each addon except the last one */}
                  {index < addons.length - 1 && (
                    <div className="flex-shrink-0 text-gray-300 text-xl sm:text-2xl font-light self-center mt-8">+</div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Right Side: Price Box (Amazon-style) - Smaller */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="border rounded p-3 bg-gray-50">
            <div className="space-y-2.5">
              {/* Total Price */}
              <div>
                <p className="text-[11px] text-gray-600 mb-1">
                  Total price for {selectedCount} item{selectedCount > 1 ? 's' : ''}:
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-gray-900">
                    {currencySymbol}{totalPrice.toFixed(0)}
                  </span>
                  {totalSavings > 0 && (
                    <span className="text-xs text-gray-400 line-through">
                      {currencySymbol}{totalMRP.toFixed(0)}
                    </span>
                  )}
                </div>
                {totalSavings > 0 && (
                  <p className="text-[11px] text-green-600 font-medium mt-0.5">
                    Save {currencySymbol}{totalSavings.toFixed(0)} ({savingsPercentage}%)
                  </p>
                )}
              </div>

              {/* Add to Cart Button - Smaller */}
              <Button
                onClick={handleAddAllToCart}
                disabled={isAdding}
                className="w-full bg-[#e63946] hover:bg-[#d32f3c] text-white py-2 px-3 rounded font-medium flex items-center justify-center gap-1.5 text-xs"
              >
                <IconShoppingCart size={16} />
                {isAdding ? "Adding..." : `Add all ${selectedCount} to Cart`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
