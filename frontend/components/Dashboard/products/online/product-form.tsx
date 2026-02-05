"use client";

import { useState } from "react";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// Tab Components
import {
  BasicDetailsTab,
  VariantsTab,
  PricingTaxTab,
  InventoryTab,
  VisibilitySEOTab,
  ComplianceTab,
  AdditionalFieldsTab,
  FrequentlyBoughtTogetherTab,
} from "./tabs";

import { ProductFormState, ProductVariant } from "@/types/product";
import { ecommerceProductService } from "@/services/online-services/ecommerceProductService";

interface ProductFormProps {
  id?: string;
}

// Validation error interface
interface ValidationError {
  field: string;
  message: string;
  tab: string;
}

// Validation result interface
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  tabErrors: Record<string, number>;
}

const getInitialFormState = (): ProductFormState => ({
  // Tab 1: Basic Product Details
  category: "",
  subCategory: "",
  brand: "",
  shortDescription: "",
  cuttingStyles: [], // Array of cutting style IDs

  // Tab 2: Variants
  enableVariants: false,
  variants: [],

  // Tab 3: Pricing & Tax
  hsnCode: "",
  gstPercentage: 0,
  defaultMRP: 0,
  defaultSellingPrice: 0,
  defaultPurchasePrice: 0,
  discountType: "Percent",
  defaultDiscountValue: 0,
  isCODAvailable: true,
  shippingCharge: 0,
  freeShipping: false,

  // Tab 4: Inventory
  totalStockQuantity: 0,
  lowStockAlertLevel: 10,
  stockStatus: "in-stock",

  // Tab 5: Website Visibility & SEO
  productStatus: "draft",
  showOnHomepage: false,
  homepageBadge: "none",
  showInProductsPage: true,
  productsPageBadge: "none",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",

  // Tab 6: Compliance
  expiryDate: undefined,
  mfgDate: undefined,
  batchNo: undefined,
  safetyInformation: undefined,

  // Tab 7: Additional Fields
  returnPolicyApplicable: true,
  returnWindowDays: 7,
  warrantyDetails: "",
  countryOfOrigin: "India",

  // Tab 8: Frequently Bought Together
  frequentlyBoughtTogether: [],
});

export function ProductForm({ id }: ProductFormProps) {
  const router = useRouter();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<ProductFormState>(getInitialFormState());
  const [activeTab, setActiveTab] = useState("basic");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(isEditMode);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [tabErrors, setTabErrors] = useState<Record<string, number>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Comprehensive form validation
  const validateForm = (data: ProductFormState): ValidationResult => {
    const errors: ValidationError[] = [];
    const tabErrorCount: Record<string, number> = {
      basic: 0,
      variants: 0,
      pricing: 0,
      inventory: 0,
      visibility: 0,
      compliance: 0,
      additional: 0,
    };

    // ============ TAB 1: Basic Details Validation ============
    if (!data.category || data.category.trim() === "") {
      errors.push({ field: "category", message: "Category is required", tab: "basic" });
      tabErrorCount.basic++;
    }

    /* if (!data.subCategory || data.subCategory.trim() === "") {
      errors.push({ field: "subCategory", message: "Sub-category is required", tab: "basic" });
      tabErrorCount.basic++;
    } */

    if (!data.shortDescription || data.shortDescription.trim() === "") {
      errors.push({ field: "shortDescription", message: "Short description is required", tab: "basic" });
      tabErrorCount.basic++;
    } else if (data.shortDescription.trim().length < 10) {
      errors.push({ field: "shortDescription", message: "Short description must be at least 10 characters", tab: "basic" });
      tabErrorCount.basic++;
    }

    // ============ TAB 2: Variants Validation ============
    if (data.variants.length === 0) {
      errors.push({ field: "variants", message: "At least one product/variant is required. Please add a product from inventory.", tab: "variants" });
      tabErrorCount.variants++;
    } else {
      // Validate each variant
      data.variants.forEach((variant, index) => {
        const variantLabel = data.enableVariants ? `Variant ${index + 1}` : "Product";

        // Required: Variant Name
        if (!variant.variantName || variant.variantName.trim() === "") {
          errors.push({ field: `variant_${index}_name`, message: `${variantLabel}: Name is required`, tab: "variants" });
          tabErrorCount.variants++;
        }

        // Required: Display Name
        if (!variant.displayName || variant.displayName.trim() === "") {
          errors.push({ field: `variant_${index}_displayName`, message: `${variantLabel}: Display name is required`, tab: "variants" });
          tabErrorCount.variants++;
        }

        // Required: Dropdown Name
        if (!variant.dropdownName || variant.dropdownName.trim() === "") {
          errors.push({ field: `variant_${index}_dropdownName`, message: `${variantLabel}: Dropdown name is required`, tab: "variants" });
          tabErrorCount.variants++;
        }

        // Required: SKU
        if (!variant.variantSKU || variant.variantSKU.trim() === "") {
          errors.push({ field: `variant_${index}_sku`, message: `${variantLabel}: SKU is required (select from inventory)`, tab: "variants" });
          tabErrorCount.variants++;
        }

        // Required: Selling Price > 0
        if (!variant.variantSellingPrice || variant.variantSellingPrice <= 0) {
          errors.push({ field: `variant_${index}_sellingPrice`, message: `${variantLabel}: Selling price must be greater than 0`, tab: "variants" });
          tabErrorCount.variants++;
        }

        // Required: MRP > 0
        if (!variant.variantMRP || variant.variantMRP <= 0) {
          errors.push({ field: `variant_${index}_mrp`, message: `${variantLabel}: MRP must be greater than 0`, tab: "variants" });
          tabErrorCount.variants++;
        }

        // Validation: Selling Price should not exceed MRP
        if (variant.variantSellingPrice > variant.variantMRP) {
          errors.push({ field: `variant_${index}_price`, message: `${variantLabel}: Selling price cannot exceed MRP`, tab: "variants" });
          tabErrorCount.variants++;
        }

        // Required: GST
        if (variant.variantGST === undefined || variant.variantGST === null) {
          errors.push({ field: `variant_${index}_gst`, message: `${variantLabel}: GST rate is required`, tab: "variants" });
          tabErrorCount.variants++;
        }

        // Validation: At least one image
        if (!variant.variantImages || variant.variantImages.length === 0) {
          errors.push({ field: `variant_${index}_images`, message: `${variantLabel}: At least one product image is required`, tab: "variants" });
          tabErrorCount.variants++;
        }
      });

      // Check for default variant
      const hasDefault = data.variants.some(v => v.isDefault);
      if (!hasDefault && data.variants.length > 0) {
        errors.push({ field: "variants_default", message: "Please set one variant as the default/main product", tab: "variants" });
        tabErrorCount.variants++;
      }
    }

    // ============ TAB 3: Pricing & Tax Validation ============
    // These are auto-filled from default variant, but validate anyway
    if (data.defaultMRP <= 0) {
      errors.push({ field: "defaultMRP", message: "Default MRP must be greater than 0", tab: "pricing" });
      tabErrorCount.pricing++;
    }

    if (data.defaultSellingPrice <= 0) {
      errors.push({ field: "defaultSellingPrice", message: "Default selling price must be greater than 0", tab: "pricing" });
      tabErrorCount.pricing++;
    }

    if (data.defaultSellingPrice > data.defaultMRP) {
      errors.push({ field: "defaultSellingPrice", message: "Selling price cannot exceed MRP", tab: "pricing" });
      tabErrorCount.pricing++;
    }

    // Shipping charge validation (if not free shipping)
    if (!data.freeShipping && data.shippingCharge < 0) {
      errors.push({ field: "shippingCharge", message: "Shipping charge cannot be negative", tab: "pricing" });
      tabErrorCount.pricing++;
    }

    // ============ TAB 4: Inventory Validation ============
    if (data.lowStockAlertLevel < 0) {
      errors.push({ field: "lowStockAlertLevel", message: "Low stock alert level cannot be negative", tab: "inventory" });
      tabErrorCount.inventory++;
    }

    // ============ TAB 5: Visibility & SEO Validation ============
    // Meta title length check (optional but if provided, should be reasonable)
    if (data.metaTitle && data.metaTitle.length > 60) {
      errors.push({ field: "metaTitle", message: "Meta title should be under 60 characters for SEO", tab: "visibility" });
      tabErrorCount.visibility++;
    }

    // Meta description length check
    if (data.metaDescription && data.metaDescription.length > 160) {
      errors.push({ field: "metaDescription", message: "Meta description should be under 160 characters for SEO", tab: "visibility" });
      tabErrorCount.visibility++;
    }

    // ============ TAB 6: Compliance Validation ============
    // Expiry date should be in the future (if provided)
    if (data.expiryDate) {
      const expiryDate = new Date(data.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        errors.push({ field: "expiryDate", message: "Expiry date cannot be in the past", tab: "compliance" });
        tabErrorCount.compliance++;
      }
    }

    // Mfg date should be before expiry date (if both provided)
    if (data.mfgDate && data.expiryDate) {
      const mfgDate = new Date(data.mfgDate);
      const expiryDate = new Date(data.expiryDate);
      if (mfgDate >= expiryDate) {
        errors.push({ field: "mfgDate", message: "Manufacturing date must be before expiry date", tab: "compliance" });
        tabErrorCount.compliance++;
      }
    }

    // ============ TAB 7: Additional Fields Validation ============
    if (data.returnPolicyApplicable && data.returnWindowDays <= 0) {
      errors.push({ field: "returnWindowDays", message: "Return window days must be greater than 0", tab: "additional" });
      tabErrorCount.additional++;
    }

    return {
      isValid: errors.length === 0,
      errors,
      tabErrors: tabErrorCount,
    };
  };

  // Load existing product data in edit mode
  React.useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      
      try {
        setIsLoadingData(true);
        const response = await ecommerceProductService.getProductById(id);
        
        if (response.success) {
          const product = response.data;
          // Convert product data to form state
          setFormData({
            ...product,
            variants: product.variants.map((v, idx) => ({
              ...v,
              id: `variant-${idx}`,
            })),
          });
        } else {
          toast.error("Product not found");
          router.push("/dashboard/products-list/online");
        }
      } catch (error) {
        console.error("Error loading product:", error);
        toast.error("Failed to load product");
        router.push("/dashboard/products-list/online");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadProduct();
  }, [id, router]);

  // Handle field changes
  const handleFieldChange = (field: keyof ProductFormState, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);

    // 🔄 SYNC: Update default variant when pricing/tax fields change
    // This ensures consistency between Pricing & Tax tab and Variants tab
    const pricingFields: (keyof ProductFormState)[] = [
      'hsnCode',
      'gstPercentage',
      'defaultMRP',
      'defaultSellingPrice',
      'defaultPurchasePrice',
      'discountType',
      'defaultDiscountValue',
    ];

    if (pricingFields.includes(field)) {
      setFormData((prev) => {
        const defaultVariantIndex = prev.variants.findIndex(v => v.isDefault);
        
        if (defaultVariantIndex !== -1) {
          const updatedVariants = [...prev.variants];
          const defaultVariant = { ...updatedVariants[defaultVariantIndex] };

          // Map form fields to variant fields
          switch (field) {
            case 'hsnCode':
              defaultVariant.variantHSN = value as string;
              break;
            case 'gstPercentage':
              defaultVariant.variantGST = value as number;
              break;
            case 'defaultMRP':
              defaultVariant.variantMRP = value as number;
              break;
            case 'defaultSellingPrice':
              defaultVariant.variantSellingPrice = value as number;
              break;
            case 'defaultPurchasePrice':
              defaultVariant.variantPurchasePrice = value as number;
              break;
            case 'discountType':
              defaultVariant.discountType = (value as string) === 'Percent' ? 'percent' : 'flat';
              break;
            case 'defaultDiscountValue':
              defaultVariant.variantDiscount = value as number;
              break;
          }

          updatedVariants[defaultVariantIndex] = defaultVariant;

          return {
            ...prev,
            [field]: value,
            variants: updatedVariants,
          };
        }

        return {
          ...prev,
          [field]: value,
        };
      });
    }
  };

  // Handle variant changes
  const handleVariantsChange = (variants: ProductVariant[]) => {
    setFormData((prev) => ({
      ...prev,
      variants,
    }));
    
    // Auto-update pricing and inventory from default variant
    const defaultVariant = variants.find(v => v.isDefault);
    if (defaultVariant) {
      setFormData((prev) => ({
        ...prev,
        hsnCode: defaultVariant.variantHSN,
        gstPercentage: defaultVariant.variantGST,
        defaultMRP: defaultVariant.variantMRP,
        defaultSellingPrice: defaultVariant.variantSellingPrice,
        defaultPurchasePrice: defaultVariant.variantPurchasePrice,
        discountType: defaultVariant.discountType === "percent" ? "Percent" : "Flat",
        defaultDiscountValue: defaultVariant.variantDiscount,
        totalStockQuantity: variants.reduce((sum, v) => sum + v.variantStockQuantity, 0),
      }));
    }
    
    setIsDirty(true);
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setHasAttemptedSubmit(true);

      // Run comprehensive validation
      const validation = validateForm(formData);
      setValidationErrors(validation.errors);
      setTabErrors(validation.tabErrors);

      if (!validation.isValid) {
        // Find the first tab with errors and switch to it
        const tabsWithErrors = Object.entries(validation.tabErrors)
          .filter(([, count]) => count > 0)
          .map(([tab]) => tab);

        if (tabsWithErrors.length > 0) {
          setActiveTab(tabsWithErrors[0]);
        }

        // Show error summary
        const totalErrors = validation.errors.length;
        const tabsAffected = tabsWithErrors.length;
        
        toast.error(
          `Please fix ${totalErrors} error${totalErrors > 1 ? 's' : ''} in ${tabsAffected} tab${tabsAffected > 1 ? 's' : ''} before saving`,
          {
            description: validation.errors.slice(0, 3).map(e => e.message).join(', ') + 
              (validation.errors.length > 3 ? ` and ${validation.errors.length - 3} more...` : ''),
            duration: 6000,
          }
        );
        
        setIsLoading(false);
        return;
      }

      // Ensure at least one variant exists
      if (!formData.enableVariants && formData.variants.length === 0) {
        // This shouldn't happen due to validation, but just in case
        toast.error("Please add at least one product from inventory");
        setActiveTab("variants");
        setIsLoading(false);
        return;
      }

      // Ensure default variant is set
      if (formData.variants.length > 0 && !formData.variants.some(v => v.isDefault)) {
        formData.variants[0].isDefault = true;
      }

      // Collect image files from variants
      const imageFiles: { variantIndex: number; imageIndex: number; file: File }[] = [];
      formData.variants.forEach((variant, variantIndex) => {
        console.log(`🔍 Variant ${variantIndex} images:`, variant.variantImages);
        if (variant.variantImages && Array.isArray(variant.variantImages)) {
          variant.variantImages.forEach((image, imageIndex) => {
            console.log(`  Image ${imageIndex} type:`, typeof image, image instanceof File ? 'File' : 'Not File', image);
            // Check if image is a File object (not a string URL)
            if (image instanceof File) {
              imageFiles.push({ variantIndex, imageIndex, file: image });
            }
          });
        }
      });

      console.log("📸 Collected", imageFiles.length, "image files to upload");

      // Prepare data for API (remove temporary UI fields and File objects)
      const apiData = {
        ...formData,
        // Remove temporary UI id field from variants before sending to API
        variants: formData.variants.map((variant) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, ...variantData } = variant;
          return {
            ...variantData,
            // Replace File objects with empty array (will be filled by backend with S3 keys)
            variantImages: variant.variantImages?.map(img => img instanceof File ? '' : img) || [],
          };
        }),
      };

      console.log("📤 Sending product data to API:", apiData);
      console.log("📍 API Endpoint:", isEditMode ? `PUT /api/online/online-products/${id}` : "POST /api/online/online-products");

      // API call to save product
      let response;
      try {
        if (isEditMode) {
          response = await ecommerceProductService.updateProduct(id!, apiData, imageFiles);
        } else {
          response = await ecommerceProductService.createProduct(apiData, imageFiles);
        }

        console.log("✅ API Response:", response);

        if (response.success) {
          toast.success(response.message || (isEditMode ? "Product updated successfully" : "Product created successfully"));
          setIsDirty(false);
          
          setTimeout(() => {
            router.push("/dashboard/products-list/online");
          }, 1000);
        } else {
          throw new Error(response.message || "Failed to save product");
        }
      } catch (apiError: unknown) {
        console.error("❌ API Error:", apiError);
        const axiosError = apiError as { response?: { data?: { message?: string } } };
        console.error("Error response:", axiosError.response?.data);
        throw apiError;
      }
    } catch (error: unknown) {
      console.error("❌ Error submitting product:", error);
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = axiosError.response?.data?.message || axiosError.message || "Failed to save product";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading product data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">
              {isEditMode ? "Edit Product" : "Add Product"}
              {isDirty && (
                <span className="text-xs sm:text-sm text-muted-foreground ml-2">
                  (Unsaved changes)
                </span>
              )}
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/products-list/online")}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Back to Products
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-4 lg:px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 mb-6 sm:mb-8 h-auto gap-1 sm:gap-0 p-1">
              <TabsTrigger value="basic" className="text-xs sm:text-sm py-2 relative">
                Basic Details
                {hasAttemptedSubmit && tabErrors.basic > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {tabErrors.basic}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="variants" className="text-xs sm:text-sm py-2 relative">
                Variants
                {hasAttemptedSubmit && tabErrors.variants > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {tabErrors.variants}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pricing" className="text-xs sm:text-sm py-2 relative">
                Pricing & Tax
                {hasAttemptedSubmit && tabErrors.pricing > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {tabErrors.pricing}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs sm:text-sm py-2 relative">
                Inventory
                {hasAttemptedSubmit && tabErrors.inventory > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {tabErrors.inventory}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="visibility" className="text-xs sm:text-sm py-2 relative">
                Visibility & SEO
                {hasAttemptedSubmit && tabErrors.visibility > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {tabErrors.visibility}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="compliance" className="text-xs sm:text-sm py-2 relative">
                Compliance
                {hasAttemptedSubmit && tabErrors.compliance > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {tabErrors.compliance}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="additional" className="text-xs sm:text-sm py-2 relative">
                Additional
                {hasAttemptedSubmit && tabErrors.additional > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {tabErrors.additional}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="addons" className="text-xs sm:text-sm py-2 relative">
                Add-ons
                {hasAttemptedSubmit && tabErrors.addons > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {tabErrors.addons}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Validation Error Summary */}
            {hasAttemptedSubmit && validationErrors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-900 mb-2">
                      Please fix the following errors before saving:
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                      {validationErrors.slice(0, 5).map((error, index) => (
                        <li key={index}>{error.message}</li>
                      ))}
                      {validationErrors.length > 5 && (
                        <li className="text-red-600 font-medium">
                          ...and {validationErrors.length - 5} more error(s)
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <TabsContent value="basic" className="space-y-4">
              <BasicDetailsTab
                formData={formData}
                onChange={handleFieldChange}
              />
            </TabsContent>

            <TabsContent value="variants" className="space-y-4">
              <VariantsTab
                formData={formData}
                onChange={handleFieldChange}
                onVariantsChange={handleVariantsChange}
              />
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <PricingTaxTab
                formData={formData}
                onChange={handleFieldChange}
              />
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <InventoryTab
                formData={formData}
                onChange={handleFieldChange}
              />
            </TabsContent>

            <TabsContent value="visibility" className="space-y-4">
              <VisibilitySEOTab
                formData={formData}
                onChange={handleFieldChange}
              />
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <ComplianceTab
                formData={formData}
                onChange={handleFieldChange}
              />
            </TabsContent>

            <TabsContent value="additional" className="space-y-4">
              <AdditionalFieldsTab
                formData={formData}
                onChange={handleFieldChange}
              />
            </TabsContent>

            <TabsContent value="addons" className="space-y-4">
              <FrequentlyBoughtTogetherTab
                formData={formData}
                onChange={handleFieldChange}
              />
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 pt-6 mt-8 border-t">
            {/* Validation Status */}
            <div className="flex items-center gap-2 text-sm">
              {hasAttemptedSubmit && validationErrors.length === 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>All fields validated</span>
                </div>
              )}
              {hasAttemptedSubmit && validationErrors.length > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{validationErrors.length} error(s) to fix</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/products-list/online")}
                disabled={isLoading}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button disabled={isLoading} onClick={handleSubmit} className="w-full sm:w-auto order-1 sm:order-2">
                {isLoading ? "Saving..." : isEditMode ? "Update Product" : "Save Product"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
