import axiosInstance from "@/lib/axios";

export interface ProductVariant {
  variantName: string;
  displayName?: string; // Display name for the variant
  variantSKU: string;
  inventoryProductId?: string | null; // Reference to inventory product ID
  variantMRP: number;
  variantSellingPrice: number;
  variantPurchasePrice: number;
  variantStockQuantity: number;
  variantLowStockAlert: number;
  variantStockStatus: string;
  variantStatus?: string; // Variant status: "active" or "inactive"
  variantImages: string[];
  detailedDescription?: string; // Detailed description for the variant
  isDefault?: boolean; // Whether this variant is the default/main variant
  // Additional variant attributes
  variantHSN?: string;
  variantBarcode?: string;
  variantColour?: string;
  variantSize?: string;
  variantMaterial?: string;
  variantWeight?: number;
  variantLength?: number;
  variantWidth?: number;
  variantHeight?: number;
  variantGST?: number;
  discountType?: string;
  variantDiscount?: number;
  customAttributes?: { key: string; value: string }[];
}

export interface CuttingStyle {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  category: string;
  subCategory: string;
  brand: string;
  shortDescription: string;
  enableVariants: boolean;
  variants: ProductVariant[];
  cuttingStyles?: CuttingStyle[]; // Dynamic cutting styles from backend
  hsnCode: string;
  gstPercentage: number;
  defaultMRP: number;
  defaultSellingPrice: number;
  defaultPurchasePrice: number;
  discountType: string;
  defaultDiscountValue: number;
  isCODAvailable: boolean;
  shippingCharge: number;
  freeShipping: boolean;
  totalStockQuantity: number;
  stockStatus: string;
  showOnHomepage: boolean;
  homepageBadge: string;
  showInProductsPage: boolean;
  productsPageBadge: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  expiryDate?: string;
  mfgDate?: string;
  batchNo?: string;
  safetyInformation?: string;
  returnPolicyApplicable: boolean;
  returnWindowDays: number;
  warrantyDetails?: string;
  countryOfOrigin: string;
  frequentlyBoughtTogether?: FrequentlyBoughtTogetherItem[]; // Add-ons
  createdAt: string;
  updatedAt: string;
}

export interface FrequentlyBoughtTogetherItem {
  productId: string;
  variantIndex: number;
  isDefaultSelected: boolean;
}

export interface FrequentlyBoughtTogetherAddon {
  productId: string;
  variantIndex: number;
  isDefaultSelected: boolean;
  product: {
    id: string;
    shortDescription: string;
    brand: string;
    category: string;
    subCategory: string;
    stockStatus: string;
  };
  variant: ProductVariant;
}

export interface ProductsResponse {
  success: boolean;
  data: Product[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ProductResponse {
  success: boolean;
  data: Product;
}

/**
 * Get all products with filters
 */
export const getProducts = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subCategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: string;
  badge?: string;
  includeVariantPriceFilter?: string; // Enable variant-level price filtering
}): Promise<ProductsResponse> => {
  const response = await axiosInstance.get("/api/online/frontend/products", { params });
  return response.data;
};

/**
 * Get single product by ID
 */
export const getProductById = async (id: string): Promise<ProductResponse> => {
  const response = await axiosInstance.get(`/api/online/frontend/products/${id}`);
  return response.data;
};

/**
 * Search products by query
 */
export const searchProducts = async (query: string, limit: number = 10): Promise<ProductsResponse> => {
  const response = await axiosInstance.get("/api/online/frontend/products", {
    params: {
      search: query,
      limit,
      page: 1
    }
  });
  return response.data;
};

/**
 * Get homepage products by badge (for Best Sellers, Trending, etc.)
 */
export const getHomepageProducts = async (params?: {
  badge?: string;
  category?: string;
  limit?: number;
}): Promise<{ success: boolean; data: Product[]; count: number }> => {
  const response = await axiosInstance.get("/api/online/frontend/homepage-products", { params });
  return response.data;
};

/**
 * Get frequently bought together products for a specific product
 */
export const getFrequentlyBoughtTogether = async (
  productId: string
): Promise<{ success: boolean; data: FrequentlyBoughtTogetherAddon[] }> => {
  const response = await axiosInstance.get(
    `/api/online/frontend/products/${productId}/frequently-bought-together`
  );
  return response.data;
};
