// Product-related TypeScript interfaces and types

// ============================================================================
// Core Product Types
// ============================================================================

/**
 * Product variant data structure with comprehensive fields
 */
export interface ProductVariantData {
  variantName: string;
  displayName: string; // NEW: Display name for frontend
  dropdownName: string; // NEW: Short name for dropdown (e.g., "250Gms", "500Gms", "1Kg")
  variantSKU: string;
  inventoryProductId: string | null; // Reference to inventory product ID
  variantHSN: string;
  variantBarcode: string;
  variantColour: string;
  variantSize: string;
  variantMaterial: string;
  customAttributes: { key: string; value: string }[];
  variantGST: number;
  discountType: 'percent' | 'flat'; // NEW: Discount type
  variantDiscount: number; // NEW: Discount value
  variantMRP: number; // Auto-calculated or manual
  variantSellingPrice: number; // Auto-calculated or manual
  variantPurchasePrice: number;
  variantStockQuantity: number;
  variantLowStockAlert: number; // Low stock threshold for this variant
  variantStockStatus: 'in-stock' | 'low-stock' | 'out-of-stock'; // Calculated status
  variantWeight: number;
  variantLength?: number;
  variantWidth?: number;
  variantHeight?: number;
  detailedDescription: string;
  variantStatus: 'active' | 'inactive';
  variantImages: (File | string)[];
  isDefault: boolean;
}

/**
 * Product specification data structure
 */
export interface SpecificationData {
  key: string;
  value: string;
}

/**
 * Product form data structure for API submission
 */
export interface ProductFormData {
  // Tab 1: Basic Product Details
  category: string;
  subCategory: string;
  brand: string;
  shortDescription: string;
  cuttingStyles: string[]; // Array of cutting style IDs

  // Tab 2: Variants
  enableVariants: boolean;
  variants: ProductVariantData[];

  // Tab 3: Pricing & Tax (auto-filled from default variant)
  hsnCode: string;
  gstPercentage: number;
  defaultMRP: number;
  defaultSellingPrice: number;
  defaultPurchasePrice: number;
  discountType: 'Percent' | 'Flat';
  defaultDiscountValue: number;
  isCODAvailable: boolean;
  shippingCharge: number;
  freeShipping: boolean;

  // Tab 4: Inventory
  totalStockQuantity: number;
  lowStockAlertLevel: number;
  stockStatus: 'in-stock' | 'out-of-stock';

  // Tab 5: Website Visibility & SEO
  productStatus: 'draft' | 'active';
  showOnHomepage: boolean;
  homepageBadge: string;
  showInProductsPage: boolean;
  productsPageBadge: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;

  // Tab 6: Compliance
  expiryDate?: string;
  mfgDate?: string;
  batchNo?: string;
  safetyInformation?: string;

  // Tab 7: Additional Fields
  returnPolicyApplicable: boolean;
  returnWindowDays: number;
  warrantyDetails: string;
  countryOfOrigin: string;

  // Tab 8: Frequently Bought Together (Add-ons)
  frequentlyBoughtTogether?: FrequentlyBoughtTogetherItem[];
}

/**
 * Frequently Bought Together item structure
 */
export interface FrequentlyBoughtTogetherItem {
  productId: string;
  variantIndex: number;
  isDefaultSelected: boolean;
}

/**
 * Complete product data structure from API
 */
export interface ProductData extends ProductFormData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ProductResponse {
  success: boolean;
  data: ProductData;
  message?: string;
}

export interface ProductListResponse {
  success: boolean;
  data: ProductData[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Product variant for UI state management
 */
export interface ProductVariant extends ProductVariantData {
  id: string; // Temporary ID for UI
}

/**
 * Product form state for managing the entire form
 */
export interface ProductFormState extends ProductFormData {
  variants: ProductVariant[];
}

// ============================================================================
// Additional Helper Types
// ============================================================================

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subCategory?: string;
  status?: 'draft' | 'active';
  sortBy?: 'name' | 'price' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface MediaUploadResponse {
  success: boolean;
  url: string;
  message?: string;
}

// Inventory product type for selection
export interface InventoryProduct {
  id: string;
  itemName: string;
  itemImage?: string;
  sku: string;
  category: string;
  subCategory: string;
  brand: string;
  hsn: string;
  barcode: string;
  colour: string;
  size: string;
  material: string;
  gst: number;
  mrp: number;
  sellingPrice: number;
  purchasePrice: number;
  stockQuantity: number;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
}
