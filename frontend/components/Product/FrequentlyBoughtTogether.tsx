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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
        Frequently bought together
      </h2>

      {/* Horizontal Layout - Amazon Style */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Products Row */}
        <div className="flex-1">
          <div className="flex items-center gap-3 overflow-x-auto pb-4">
            {/* Main Product - Checkbox Disabled */}
            <div className="flex-shrink-0">
              <div className="flex flex-col items-center gap-2">
                <Checkbox checked disabled className="cursor-not-allowed opacity-50" />
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-50 rounded-md border overflow-hidden">
                  <Image
                    src={mainProduct.image}
                    alt={mainProduct.name}
                    width={112}
                    height={112}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <div className="text-center max-w-[120px]">
                  <p className="text-xs text-gray-500 mb-1">This item:</p>
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {mainProduct.name}
                  </p>
                  <p className="text-base font-bold text-gray-900 mt-1">
                    {currencySymbol}
                    {mainProduct.price.toFixed(0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Plus Icon */}
            <div className="flex-shrink-0 text-gray-400 text-2xl font-light">+</div>

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
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleAddon(addonKey)}
                      />
                      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-50 rounded-md border overflow-hidden">
                        <Image
                          src={addon.variant.variantImages?.[0] || "/placeholder.png"}
                          alt={addon.variant.displayName || addon.variant.variantName}
                          width={112}
                          height={112}
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                      <div className="text-center max-w-[120px]">
                        <p className="text-xs text-gray-500 mb-1">{addon.product.brand}</p>
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {addon.variant.displayName || addon.variant.variantName}
                        </p>
                        <div className="mt-1">
                          <p className="text-base font-bold text-gray-900">
                            {currencySymbol}
                            {addon.variant.variantSellingPrice.toFixed(0)}
                          </p>
                          {discount > 0 && (
                            <p className="text-xs text-green-600">({discount}% OFF)</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Plus Icon after each addon except the last one */}
                  {index < addons.length - 1 && (
                    <div className="flex-shrink-0 text-gray-400 text-2xl font-light">+</div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Price and Add to Cart Section */}
        <div className="lg:w-80 flex flex-col justify-center">
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="mb-3">
              <p className="text-sm text-gray-600 mb-1">
                Total price for {1 + selectedAddons.size} item(s):
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {currencySymbol}
                  {totalPrice.toFixed(0)}
                </span>
                {totalSavings > 0 && (
                  <>
                    <span className="text-base text-gray-400 line-through">
                      {currencySymbol}
                      {totalMRP.toFixed(0)}
                    </span>
                  </>
                )}
              </div>
              {totalSavings > 0 && (
                <p className="text-sm text-green-600 font-medium mt-1">
                  Save {currencySymbol}
                  {totalSavings.toFixed(0)} ({savingsPercentage}%)
                </p>
              )}
            </div>

            <Button
              onClick={handleAddAllToCart}
              disabled={isAdding}
              className="w-full bg-[#e63946] hover:bg-[#d32f3c] text-white py-3 rounded-md font-medium flex items-center justify-center gap-2"
            >
              <IconShoppingCart size={20} />
              {isAdding ? "Adding..." : "Add both to Cart"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
