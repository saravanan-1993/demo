"use client";

import React from "react";
import Image from "next/image";
import { Product } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Heart } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";

interface PosProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

export const PosProductCard: React.FC<PosProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product as any);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all">
      {/* Product Image */}
      <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden relative">
        {product.image && product.image.trim() !== '' ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            priority={false}
            quality={75}
          />
        ) : (
          <svg
            className="w-16 h-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        )}
        {/* Wishlist Icon */}
        <button
          onClick={handleWishlistToggle}
          className="absolute top-2 left-2 z-10 p-1.5 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
          aria-label="Add to wishlist"
        >
          <Heart
            size={18}
            className={`transition-colors ${
              isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600 hover:text-red-500'
            }`}
          />
        </button>

        {!product.isActive && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm">
              Inactive
            </Badge>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
              {product.description}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            SKU: {product.sku}
          </p>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-primary">
            ${product.price.toFixed(2)}
          </span>
          <Badge
            variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"}
            className="text-xs"
          >
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </Badge>
        </div>

        {/* Active/Inactive Toggle */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {product.isActive ? "Active" : "Inactive"}
          </span>
          <Switch
            checked={product.isActive}
            onCheckedChange={(checked) => onToggleStatus(product.id, checked)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(product)}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(product.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
