"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Product } from "./pos-interface";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";
import { authService } from "@/services/authService";

interface ProductCatalogProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddToCart: (product: Product) => void;
}

interface OfflineProduct {
  id: string;
  itemName: string;
  purchasePrice: number;
  sellingPrice?: number;
  mrp?: number;
  quantity: number;
  category: string;
  itemCode?: string;
  barcode?: string;
  brand?: string;
  batchNo?: string;
  mfgDate?: string;
  expiryDate?: string;
  itemImage?: string;
  display: string;
  displayPrice?: number;
  originalPrice?: number;
  discountAmount?: number;
  discountType?: string;
  discountValue?: number;
  gstPercentage?: number;
}

export const ProductCatalog = React.forwardRef<
  { refreshProducts: () => Promise<void> },
  ProductCatalogProps
>(({ searchQuery, onSearchChange, onAddToCart }, ref) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState<string>("₹");
  const [currency, setCurrency] = useState<string>("INR");

  // Fetch admin currency on mount
  useEffect(() => {
    const fetchAdminCurrency = async () => {
      try {
        const adminData = await authService.getCurrentAdmin();
        const adminCurrency = adminData.currency || "INR";
        const symbol = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: adminCurrency,
        })
          .formatToParts(0)
          .find((part) => part.type === "currency")?.value || "₹";
        
        setCurrency(adminCurrency);
        setCurrencySymbol(symbol);
      } catch (error) {
        console.error("Error fetching admin currency:", error);
      }
    };
    fetchAdminCurrency();
  }, []);

  // Fetch products from offline service
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [selectedCategory]);

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  // Expose refreshProducts method to parent via ref
  React.useImperativeHandle(ref, () => ({
    refreshProducts: async () => {
      await fetchProducts(true); // Silent refresh - no loading spinner
    },
  }));

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get(
        "/api/inventory/categories?isActive=true"
      );
      if (response.data.success) {
        const categoryNames = response.data.data.map(
          (cat: { name: string }) => cat.name
        );
        setCategories(["all", ...categoryNames]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories(["all"]);
    }
  };

  const fetchProducts = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const params: any = {};
      if (selectedCategory !== "all") {
        params.category = selectedCategory;
      }

      const response = await axiosInstance.get("/api/pos/products", {
        params,
      });

      if (response.data.success) {
        // Transform offline products to POS product format
        // Only include products with display = "active"
        const transformedProducts: Product[] = response.data.data
          .filter((p: OfflineProduct) => p.display === "active")
          .map((p: OfflineProduct) => ({
            id: p.id,
            name: p.itemName,
            price: p.displayPrice || p.sellingPrice || p.purchasePrice, // Use displayPrice (after discount)
            stock: p.quantity,
            category: p.category,
            sku: p.itemCode || "",
            barcode: p.barcode,
            brand: p.brand,
            batchNo: p.batchNo,
            mfgDate: p.mfgDate,
            expiryDate: p.expiryDate,
            mrp: p.mrp,
            sellingPrice: p.sellingPrice,
            originalPrice: p.originalPrice, // Price before discount
            discountAmount: p.discountAmount,
            image: p.itemImage, // Backend now returns full URL
            gstPercentage: p.gstPercentage || 0,
          }));
        setProducts(transformedProducts);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      if (!silent) {
        toast.error("Failed to load products", {
          description: "Unable to fetch product catalog. Please try again.",
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            type="text"
            placeholder="Search by name, SKU, barcode, or brand..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === category
                ? "bg-primary text-primary-foreground"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-700 dark:text-gray-300">
            Loading products...
          </span>
        </div>
      )}

      {/* Products Grid */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              disabled={product.stock <= 0}
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all hover:shadow-lg ${
                product.stock <= 0
                  ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700"
                  : "border-gray-200 dark:border-gray-700 hover:border-primary cursor-pointer"
              }`}
            >
              {/* Product Image */}
              <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                {product.image && product.image.trim() !== '' ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                    priority={false}
                    quality={75}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                )}
                    
              
              </div>

              {/* Product Info */}
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                  {product.name}
                </h3>
                {product.brand && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Brand: {product.brand}
                  </p>
                )}
                <div className="flex flex-col gap-1 mb-2">
                  {product.sku && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      SKU: {product.sku}
                    </p>
                  )}
                  {product.batchNo && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Batch: {product.batchNo}
                    </p>
                  )}
                  {product.expiryDate && (
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      Exp: {new Date(product.expiryDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 mb-2">
                  {product.originalPrice && product.originalPrice !== product.price && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
                        {formatCurrency(product.originalPrice)}
                      </span>
                      {product.discountAmount && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                          Save {formatCurrency(product.discountAmount)}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(product.price)}
                  </span>
                </div>
                <Badge
                  variant={product.stock > 10 ? "default" : "destructive"}
                  className="text-xs"
                >
                  {product.stock > 0
                    ? `${product.stock} in stock`
                    : "Out of stock"}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No products found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
});

ProductCatalog.displayName = "ProductCatalog";
