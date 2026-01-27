"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductFormState, ProductVariant } from "@/types/product";
import {
  onlineProductService,
  OnlineProduct,
} from "@/services/online-services/onlineProductService";
import { barcodeService } from "@/services/online-services/barcodeService";
import {
  gstRateService,
  GSTRate,
} from "@/services/online-services/gstRateService";
import { Plus, Trash2, X, Star, Upload, Package } from "lucide-react";
import { toast } from "sonner";
import Barcode from "react-barcode";
import { useCurrency } from "@/hooks/useCurrency";

interface VariantsTabProps {
  formData: ProductFormState;
  onChange: (field: keyof ProductFormState, value: unknown) => void;
  onVariantsChange: (variants: ProductVariant[]) => void;
}

export function VariantsTab({
  formData,
  onChange,
  onVariantsChange,
}: VariantsTabProps) {
  const [inventoryProducts, setInventoryProducts] = useState<OnlineProduct[]>(
    []
  );
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");

  // GST rates state
  const [gstRates, setGstRates] = useState<GSTRate[]>([]);
  const [isLoadingGST, setIsLoadingGST] = useState(false);

  // Currency symbol
  const currencySymbol = useCurrency();

  // Track last edited price field for each variant (for smart calculation)
  const [lastEditedPriceField, setLastEditedPriceField] = useState<
    Record<string, "sellingPrice" | "mrp" | "discount">
  >({});

  // Auto-calculate prices preference (with localStorage persistence)
  const [autoCalculatePrices, setAutoCalculatePrices] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("autoCalculatePrices");
      return saved !== null ? saved === "true" : false; // Default to false
    }
    return false;
  });

  // Barcode generation state
  const [isGeneratingBarcode, setIsGeneratingBarcode] = useState<
    Record<string, boolean>
  >({});

  // Define fetch functions before useEffect
  const fetchInventoryProducts = async (search?: string) => {
    try {
      setIsLoadingInventory(true);
      const response = await onlineProductService.getProducts(
        search || inventorySearch
      );
      if (response.success) {
        console.log("📦 Inventory Products Fetched:", response.data);
        console.log("📅 First product expiryDate:", response.data[0]?.expiryDate);
        setInventoryProducts(response.data);
      }
    } catch (error: unknown) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to load inventory products");
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const fetchGSTRates = async () => {
    try {
      setIsLoadingGST(true);
      const response = await gstRateService.getActiveGSTRates();
      if (response.success) {
        setGstRates(response.data);
      }
    } catch (error: unknown) {
      console.error("Error fetching GST rates:", error);
      toast.error("Failed to load GST rates");
    } finally {
      setIsLoadingGST(false);
    }
  };

  // Fetch inventory products and GST rates on mount
  useEffect(() => {
    fetchInventoryProducts();
    fetchGSTRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddNewVariant = () => {
    const newVariant: ProductVariant = {
      id: `variant-${Date.now()}`,
      variantName: "",
      displayName: "", // NEW
      variantSKU: "",
      inventoryProductId: null, // Reference to inventory product
      variantHSN: "",
      variantBarcode: "",
      variantColour: "",
      variantSize: "",
      variantMaterial: "",
      customAttributes: [],
      variantGST: 0,
      discountType: "percent", // NEW
      variantDiscount: 0, // NEW
      variantMRP: 0,
      variantSellingPrice: 0,
      variantPurchasePrice: 0,
      variantStockQuantity: 0,
      variantLowStockAlert: 0,
      variantStockStatus: "out-of-stock",
      variantWeight: 0,
      variantLength: undefined,
      variantWidth: undefined,
      variantHeight: undefined,
      detailedDescription: "",
      variantStatus: "active",
      variantImages: [],
      isDefault: formData.variants.length === 0,
    };
    onVariantsChange([...formData.variants, newVariant]);
  };

  // Smart price calculation based on last edited field
  const calculatePricesSmartly = (
    variantId: string,
    sellingPrice: number,
    mrp: number,
    discount: number,
    discountType: "percent" | "flat",
    changedField: "sellingPrice" | "mrp" | "discount"
  ) => {
    // Ensure all values are valid numbers
    const validSellingPrice =
      isNaN(sellingPrice) || sellingPrice < 0 ? 0 : sellingPrice;
    const validMRP = isNaN(mrp) || mrp < 0 ? 0 : mrp;
    const validDiscount = isNaN(discount) || discount < 0 ? 0 : discount;

    // Update last edited field tracker
    setLastEditedPriceField((prev) => ({ ...prev, [variantId]: changedField }));

    // Get the previously edited field for this variant
    const previouslyEditedField = lastEditedPriceField[variantId];

    // SMART LOGIC: Calculate based on what the user is doing
    if (changedField === "discount") {
      // User changed discount - calculate based on which price field was edited last
      if (previouslyEditedField === "mrp") {
        // User previously edited MRP, so calculate Selling Price
        if (discountType === "percent") {
          const calculatedSellingPrice = validMRP * (1 - validDiscount / 100);
          return {
            mrp: validMRP,
            sellingPrice: Math.round(calculatedSellingPrice) || 0,
            discount: validDiscount,
          };
        } else {
          const calculatedSellingPrice = validMRP - validDiscount;
          return {
            mrp: validMRP,
            sellingPrice: Math.max(0, Math.round(calculatedSellingPrice)) || 0,
            discount: validDiscount,
          };
        }
      } else {
        // Default or user edited Selling Price last, so calculate MRP
        if (discountType === "percent") {
          if (validDiscount >= 100) {
            return {
              mrp: validSellingPrice,
              sellingPrice: validSellingPrice,
              discount: validDiscount,
            };
          }
          const calculatedMRP =
            validDiscount > 0
              ? validSellingPrice / (1 - validDiscount / 100)
              : validSellingPrice;
          return {
            mrp: Math.round(calculatedMRP) || 0,
            sellingPrice: validSellingPrice,
            discount: validDiscount,
          };
        } else {
          const calculatedMRP = validSellingPrice + validDiscount;
          return {
            mrp: Math.round(calculatedMRP) || 0,
            sellingPrice: validSellingPrice,
            discount: validDiscount,
          };
        }
      }
    } else if (changedField === "sellingPrice") {
      // User changed Selling Price - calculate MRP (keep discount)
      if (discountType === "percent") {
        if (validDiscount >= 100) {
          return {
            mrp: validSellingPrice,
            sellingPrice: validSellingPrice,
            discount: validDiscount,
          };
        }
        const calculatedMRP =
          validDiscount > 0
            ? validSellingPrice / (1 - validDiscount / 100)
            : validSellingPrice;
        return {
          mrp: Math.round(calculatedMRP) || 0,
          sellingPrice: validSellingPrice,
          discount: validDiscount,
        };
      } else {
        const calculatedMRP = validSellingPrice + validDiscount;
        return {
          mrp: Math.round(calculatedMRP) || 0,
          sellingPrice: validSellingPrice,
          discount: validDiscount,
        };
      }
    } else if (changedField === "mrp") {
      // User changed MRP - calculate Selling Price (keep discount)
      if (discountType === "percent") {
        const calculatedSellingPrice = validMRP * (1 - validDiscount / 100);
        return {
          mrp: validMRP,
          sellingPrice: Math.round(calculatedSellingPrice) || 0,
          discount: validDiscount,
        };
      } else {
        const calculatedSellingPrice = validMRP - validDiscount;
        return {
          mrp: validMRP,
          sellingPrice: Math.max(0, Math.round(calculatedSellingPrice)) || 0,
          discount: validDiscount,
        };
      }
    }

    return {
      mrp: validMRP,
      sellingPrice: validSellingPrice,
      discount: validDiscount,
    };
  };

  const handleUpdateVariant = (
    variantId: string,
    field: keyof ProductVariant,
    value: unknown
  ) => {
    const updatedVariants = formData.variants.map((v) => {
      if (v.id === variantId) {
        const updated = { ...v, [field]: value };

        // Smart price calculation when relevant fields change
        if (field === "variantSellingPrice") {
          const currentSellingPrice = parseFloat(value) || 0;
          const prices = calculatePricesSmartly(
            variantId,
            currentSellingPrice,
            v.variantMRP || 0,
            v.variantDiscount || 0,
            v.discountType || "percent",
            "sellingPrice"
          );
          return {
            ...updated,
            variantMRP: prices.mrp,
            variantSellingPrice: prices.sellingPrice,
            variantDiscount: prices.discount,
          };
        } else if (field === "variantMRP") {
          const currentMRP = parseFloat(value) || 0;
          const prices = calculatePricesSmartly(
            variantId,
            v.variantSellingPrice || 0,
            currentMRP,
            v.variantDiscount || 0,
            v.discountType || "percent",
            "mrp"
          );
          return {
            ...updated,
            variantMRP: prices.mrp,
            variantSellingPrice: prices.sellingPrice,
            variantDiscount: prices.discount,
          };
        } else if (field === "variantDiscount") {
          const currentDiscount = parseFloat(value) || 0;
          const prices = calculatePricesSmartly(
            variantId,
            v.variantSellingPrice || 0,
            v.variantMRP || 0,
            currentDiscount,
            v.discountType || "percent",
            "discount"
          );
          return {
            ...updated,
            variantMRP: prices.mrp,
            variantSellingPrice: prices.sellingPrice,
            variantDiscount: prices.discount,
          };
        } else if (field === "discountType") {
          // When discount type changes, recalculate based on last edited field
          const lastField = lastEditedPriceField[variantId] || "sellingPrice";
          const prices = calculatePricesSmartly(
            variantId,
            v.variantSellingPrice || 0,
            v.variantMRP || 0,
            v.variantDiscount || 0,
            value,
            lastField
          );
          return {
            ...updated,
            variantMRP: prices.mrp,
            variantSellingPrice: prices.sellingPrice,
            variantDiscount: prices.discount,
          };
        }

        return updated;
      }
      return v;
    });
    onVariantsChange(updatedVariants);
  };

  const handleDeleteVariant = (variantId: string) => {
    const updatedVariants = formData.variants.filter((v) => v.id !== variantId);

    // If deleted variant was default, make first variant default
    if (
      updatedVariants.length > 0 &&
      !updatedVariants.some((v) => v.isDefault)
    ) {
      updatedVariants[0].isDefault = true;
    }

    onVariantsChange(updatedVariants);
    toast.success("Variant deleted");
  };

  const handleSetDefault = (variantId: string) => {
    const updatedVariants = formData.variants.map((v) => ({
      ...v,
      isDefault: v.id === variantId,
    }));
    onVariantsChange(updatedVariants);
    toast.success("Default/Main product updated");
  };

  const handleGenerateBarcode = async (variantId: string) => {
    try {
      setIsGeneratingBarcode((prev) => ({ ...prev, [variantId]: true }));

      const response = await barcodeService.generateBarcode();

      if (response.success) {
        const updatedVariants = formData.variants.map((v) =>
          v.id === variantId
            ? { ...v, variantBarcode: response.data.barcode }
            : v
        );
        onVariantsChange(updatedVariants);
        toast.success(`Barcode generated: ${response.data.barcode}`);
      }
    } catch (error: unknown) {
      console.error("Error generating barcode:", error);
      toast.error("Failed to generate barcode");
    } finally {
      setIsGeneratingBarcode((prev) => ({ ...prev, [variantId]: false }));
    }
  };

  const handleDownloadBarcode = (
    variantId: string,
    barcode: string,
    variantName: string
  ) => {
    try {
      const svg = document.querySelector(
        `#barcode-${variantId} svg`
      ) as SVGElement;
      if (!svg) {
        toast.error("Barcode not found");
        return;
      }

      // Get SVG dimensions
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        toast.error("Failed to create canvas");
        return;
      }

      const img = new Image();
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width || 200;
        canvas.height = img.height || 100;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = `barcode-${barcode}-${
              variantName || "variant"
            }.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
            URL.revokeObjectURL(url);
            toast.success("Barcode downloaded");
          }
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        toast.error("Failed to process barcode image");
      };

      img.src = url;
    } catch (error) {
      console.error("Error downloading barcode:", error);
      toast.error("Failed to download barcode");
    }
  };

  const handlePrintBarcode = (variantId: string) => {
    try {
      const barcodeElement = document.getElementById(`barcode-${variantId}`);
      if (!barcodeElement) {
        toast.error("Barcode not found");
        return;
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups to print");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Barcode</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh;
                font-family: Arial, sans-serif;
              }
              .barcode-container { 
                text-align: center; 
                page-break-inside: avoid; 
              }
              svg {
                max-width: 100%;
                height: auto;
              }
              @media print { 
                body { padding: 0; } 
                @page { margin: 1cm; } 
              }
            </style>
          </head>
          <body>
            <div class="barcode-container">${barcodeElement.innerHTML}</div>
          </body>
        </html>
      `);

      printWindow.document.close();

      // Wait for content to load before printing
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 100);
      }, 250);
    } catch (error) {
      console.error("Error printing barcode:", error);
      toast.error("Failed to print barcode");
    }
  };

  const handleSelectFromInventory = (productId: string, variantId: string) => {
    const product = inventoryProducts.find((p) => p.id === productId);
    if (!product) return;

    // 🔒 DUPLICATE CHECK 1: Check if used in another online product
    if (product.isUsedInOnlineProduct) {
      toast.error(
        `This inventory item "${product.itemName}" is already used in another online product. Each inventory item can only be used in ONE online product.`,
        { duration: 6000 }
      );
      return;
    }

    // 🔒 DUPLICATE CHECK 2: Prevent same inventory item from being used in multiple variants of current product
    // Use inventoryProductId for reliable check (SKU is optional in inventory)
    const isAlreadyUsedInCurrentProduct = formData.variants.some(
      (v) => v.id !== variantId && v.inventoryProductId === product.id
    );

    if (isAlreadyUsedInCurrentProduct) {
      const existingVariantIndex = formData.variants.findIndex(
        (v) => v.inventoryProductId === product.id
      );
      toast.error(
        `This inventory item is already used in ${
          formData.enableVariants
            ? `Variant ${existingVariantIndex + 1}`
            : "this product"
        }. Each inventory item can only be used once per product.`,
        { duration: 5000 }
      );
      return;
    }

    // Prepare base variant data (always filled)
    const baseVariantData = {
      variantName: product.itemName,
      displayName: product.itemName,
      variantSKU: product.itemCode || "",  // Keep empty if no SKU in inventory
      inventoryProductId: product.id, // Save the inventory product ID (primary identifier)
      variantHSN: product.hsnCode || "",
      variantBarcode: "", // Clear barcode - user must generate for online product
      variantGST: product.gstPercentage,
      variantPurchasePrice: product.purchasePrice || 0,
      variantStockQuantity: product.quantity || 0,
      variantLowStockAlert: product.lowStockAlertLevel || 10, // Variant-level low stock alert
      variantStockStatus:
        (product.quantity || 0) === 0
          ? ("out-of-stock" as const)
          : (product.quantity || 0) <= (product.lowStockAlertLevel || 10)
          ? ("low-stock" as const)
          : ("in-stock" as const),
      detailedDescription: product.description || "",
      // Use presigned URL for display, backend will extract S3 key when saving
      variantImages: product.itemImage ? [product.itemImage] : [],
    };

    // Update main form's lowStockAlertLevel from inventory
    onChange("lowStockAlertLevel", product.lowStockAlertLevel || 10);

    // Calculate prices only if auto-calculate is enabled
    let priceData = {};
    if (autoCalculatePrices) {
      const purchasePrice = product.purchasePrice || 0;
      const gstPercentage = product.gstPercentage || 0;
      const priceWithGST = purchasePrice * (1 + gstPercentage / 100);
      const sellingPrice = Math.round(priceWithGST * 1.2); // 20% markup
      const mrp = Math.round(sellingPrice * 1.1); // 10% above selling price
      const calculatedDiscount = Math.round(((mrp - sellingPrice) / mrp) * 100);

      priceData = {
        discountType: "percent" as const,
        variantDiscount: calculatedDiscount,
        variantMRP: mrp,
        variantSellingPrice: sellingPrice,
      };
    } else {
      // Leave prices empty for manual entry
      priceData = {
        discountType: "percent" as const,
        variantDiscount: 0,
        variantMRP: 0,
        variantSellingPrice: 0,
      };
    }

    const updatedVariants = formData.variants.map((v) =>
      v.id === variantId
        ? {
            ...v,
            ...baseVariantData,
            ...priceData,
          }
        : v
    );
    onVariantsChange(updatedVariants);

    if (autoCalculatePrices) {
      toast.success("Product details and prices auto-filled from inventory");
    } else {
      toast.success(
        "Product details auto-filled. Please enter prices manually."
      );
    }
  };

  const handleAddCustomAttribute = (variantId: string) => {
    const updatedVariants = formData.variants.map((v) =>
      v.id === variantId
        ? {
            ...v,
            customAttributes: [...v.customAttributes, { key: "", value: "" }],
          }
        : v
    );
    onVariantsChange(updatedVariants);
  };

  const handleRemoveCustomAttribute = (variantId: string, index: number) => {
    const updatedVariants = formData.variants.map((v) =>
      v.id === variantId
        ? {
            ...v,
            customAttributes: v.customAttributes.filter((_, i) => i !== index),
          }
        : v
    );
    onVariantsChange(updatedVariants);
  };

  const handleUpdateCustomAttribute = (
    variantId: string,
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const updatedVariants = formData.variants.map((v) =>
      v.id === variantId
        ? {
            ...v,
            customAttributes: v.customAttributes.map((attr, i) =>
              i === index ? { ...attr, [field]: value } : attr
            ),
          }
        : v
    );
    onVariantsChange(updatedVariants);
  };

  // Handle image upload
  const handleImageUpload = (variantId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const updatedVariants = formData.variants.map((v) =>
      v.id === variantId
        ? {
            ...v,
            variantImages: [...(v.variantImages || []), ...fileArray],
          }
        : v
    );
    onVariantsChange(updatedVariants);
    toast.success(`${fileArray.length} image(s) added`);
  };

  // Handle image removal
  const handleRemoveImage = (variantId: string, imageIndex: number) => {
    const updatedVariants = formData.variants.map((v) =>
      v.id === variantId
        ? {
            ...v,
            variantImages:
              v.variantImages?.filter((_, i) => i !== imageIndex) || [],
          }
        : v
    );
    onVariantsChange(updatedVariants);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
          Product Variants
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
          Add single or multiple product variants from inventory
        </p>
      </div>

      {/* Enable Variants Toggle */}
      <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg bg-gray-50 gap-3">
        <div className="flex-1 min-w-0">
          <Label
            htmlFor="enableVariants"
            className="text-sm sm:text-base font-medium"
          >
            Enable Variants
          </Label>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {formData.enableVariants
              ? "Add multiple variants with different attributes"
              : "Add single product from inventory"}
          </p>
        </div>
        <Switch
          id="enableVariants"
          checked={formData.enableVariants}
          onCheckedChange={(checked) => onChange("enableVariants", checked)}
          className="flex-shrink-0"
        />
      </div>

      {/* Add Variant Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {formData.enableVariants
            ? "Add multiple product variants"
            : "Add one product only"}
        </p>
        <Button
          onClick={handleAddNewVariant}
          disabled={!formData.enableVariants && formData.variants.length >= 1}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add {formData.enableVariants ? "Variant" : "Product"}
        </Button>
      </div>

      {/* Variants List */}
      {formData.variants.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-6 sm:p-12 text-center text-muted-foreground">
          <Package className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 opacity-50" />
          <p className="text-base sm:text-lg">
            No {formData.enableVariants ? "variants" : "product"} added yet
          </p>
          <p className="text-xs sm:text-sm mt-2">
            Click &ldquo;Add {formData.enableVariants ? "Variant" : "Product"}
            &rdquo; button above to get started
          </p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={["variant-0"]}
          className="space-y-3 sm:space-y-4"
        >
          {formData.variants.map((variant, index) => (
            <AccordionItem
              key={variant.id}
              value={`variant-${index}`}
              className="border-2 rounded-lg overflow-hidden"
            >
              <div className="bg-gray-50 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between border-b gap-2">
                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                  <AccordionTrigger className="hover:no-underline py-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-semibold whitespace-nowrap">
                          {formData.enableVariants
                            ? `Variant ${index + 1}`
                            : "Product"}
                        </span>
                        {variant.isDefault && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 sm:px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                            Main
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        {variant.variantName && (
                          <span className="font-medium text-foreground truncate max-w-[150px] sm:max-w-none">
                            {variant.variantName}
                          </span>
                        )}
                        {variant.variantSKU && (
                          <code className="bg-muted px-1.5 sm:px-2 py-0.5 rounded text-xs">
                            {variant.variantSKU}
                          </code>
                        )}
                        {variant.variantStockQuantity > 0 && (
                          <span className="text-xs whitespace-nowrap">
                            Stock: {variant.variantStockQuantity}
                          </span>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {formData.enableVariants && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(variant.id);
                      }}
                      disabled={variant.isDefault}
                      title="Set as default/main product"
                      className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                    >
                      <Star
                        className={`h-3 w-3 sm:h-4 sm:w-4 ${
                          variant.isDefault
                            ? "fill-yellow-400 text-yellow-400"
                            : ""
                        }`}
                      />
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVariant(variant.id);
                    }}
                    className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
              <AccordionContent className="px-3 sm:px-6 pb-4 sm:pb-6 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
                {/* Select from Inventory */}
                <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label className="text-sm sm:text-base font-medium">
                    Select Product from Inventory
                  </Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-2 sm:mb-3">
                    Choose a product to auto-fill all details below
                  </p>

                  {/* IMPORTANT: Each inventory item can only be used in ONE online product.
                      Already-used items are filtered out and won't appear in the dropdown. */}

                  <div className="space-y-2">
                    <Input
                      placeholder="Search inventory products..."
                      value={inventorySearch}
                      onChange={(e) => {
                        setInventorySearch(e.target.value);
                        fetchInventoryProducts(e.target.value);
                      }}
                    />
                    <Select
                      onValueChange={(productId) =>
                        handleSelectFromInventory(productId, variant.id)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingInventory ? "Loading..." : "Select product"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryProducts.filter((product) => {
                          // Filter out items already used in current product's other variants
                          // Use inventoryProductId for reliable check (SKU is optional)
                          const isUsedInCurrentProduct = formData.variants.some(
                            (v) =>
                              v.id !== variant.id &&
                              v.inventoryProductId === product.id
                          );

                          // Filter out items already used in another online product
                          const isUsedInAnotherProduct =
                            product.isUsedInOnlineProduct || false;

                          // Only show items that are NOT used anywhere
                          return (
                            !isUsedInCurrentProduct && !isUsedInAnotherProduct
                          );
                        }).length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            {isLoadingInventory
                              ? "Loading..."
                              : "No available products found"}
                          </div>
                        ) : (
                          inventoryProducts
                            .filter((product) => {
                              // Filter out items already used in current product's other variants
                              // Use inventoryProductId for reliable check (SKU is optional)
                              const isUsedInCurrentProduct =
                                formData.variants.some(
                                  (v) =>
                                    v.id !== variant.id &&
                                    v.inventoryProductId === product.id
                                );

                              // Filter out items already used in another online product
                              const isUsedInAnotherProduct =
                                product.isUsedInOnlineProduct || false;

                              // Only show items that are NOT used anywhere
                              return (
                                !isUsedInCurrentProduct &&
                                !isUsedInAnotherProduct
                              );
                            })
                            .map((product) => {
                              console.log("🔍 Rendering product:", product.itemName, "expiryDate:", product.expiryDate);
                              console.log("🔍 Product full data:", JSON.stringify(product, null, 2));
                              
                              const expiryText = product.expiryDate 
                                ? ` | Expiry: ${new Date(product.expiryDate).toLocaleDateString()}`
                                : ' | No Expiry';
                              
                              console.log("🔍 Expiry text:", expiryText);
                              
                              return (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.itemName}{" "}
                                  {product.itemCode ? `- ${product.itemCode}` : ""}
                                  {expiryText}
                                </SelectItem>
                              );
                            })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Variant Name & Display Name */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm sm:text-base">
                      Variant Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={variant.variantName || ""}
                      onChange={(e) =>
                        handleUpdateVariant(
                          variant.id,
                          "variantName",
                          e.target.value
                        )
                      }
                      placeholder="e.g., Red Cotton T-Shirt - Large"
                      className="mt-2 text-sm sm:text-base"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Internal name
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">
                      Display Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={variant.displayName || ""}
                      onChange={(e) =>
                        handleUpdateVariant(
                          variant.id,
                          "displayName",
                          e.target.value
                        )
                      }
                      placeholder="e.g., Red T-Shirt (L)"
                      className="mt-2 text-sm sm:text-base"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Shown on website
                    </p>
                  </div>
                </div>

                {/* Row 1: SKU, HSN, Barcode */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <Label>
                      Variant SKU <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={variant.variantSKU || ""}
                      onChange={(e) =>
                        handleUpdateVariant(
                          variant.id,
                          "variantSKU",
                          e.target.value
                        )
                      }
                      placeholder="SKU-001"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Variant HSN</Label>
                    <Input
                      value={variant.variantHSN || ""}
                      onChange={(e) =>
                        handleUpdateVariant(
                          variant.id,
                          "variantHSN",
                          e.target.value
                        )
                      }
                      placeholder="HSN Code"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Variant Barcode</Label>
                    {!variant.variantSKU || variant.variantSKU.trim() === "" ? (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          Please select a product from inventory first to generate barcode
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={variant.variantBarcode || ""}
                            onChange={(e) =>
                              handleUpdateVariant(
                                variant.id,
                                "variantBarcode",
                                e.target.value
                              )
                            }
                            placeholder="Click Generate to create barcode"
                            className="flex-1"
                            readOnly
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleGenerateBarcode(variant.id)}
                            disabled={isGeneratingBarcode[variant.id]}
                          >
                            {isGeneratingBarcode[variant.id] ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                Generating...
                              </>
                            ) : (
                              <>
                                <Package className="h-4 w-4 mr-2" />
                                Generate
                              </>
                            )}
                          </Button>
                        </div>
                        {variant.variantBarcode &&
                          variant.variantBarcode.length === 13 && (
                            <div className="mt-3 p-3 bg-white border rounded-lg">
                              <div
                                id={`barcode-${variant.id}`}
                                className="flex flex-col items-center"
                              >
                                <Barcode
                                  value={variant.variantBarcode}
                                  height={50}
                                  fontSize={12}
                                />
                                <div className="text-xs text-muted-foreground mt-2">
                                  {variant.variantName || "Product Variant"}
                                </div>
                              </div>
                              <div className="flex gap-2 mt-3 justify-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDownloadBarcode(
                                      variant.id,
                                      variant.variantBarcode,
                                      variant.variantName
                                    )
                                  }
                                >
                                  <Upload className="h-3 w-3 mr-1" />
                                  Download PNG
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePrintBarcode(variant.id)}
                                >
                                  <Package className="h-3 w-3 mr-1" />
                                  Print Label
                                </Button>
                              </div>
                            </div>
                          )}
                        <p className="text-xs text-muted-foreground mt-1">
                          EAN-13 format (13 digits) - Generated for online
                          product only
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Row 2: Colour, Size, Material */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm sm:text-base">
                      Variant Colour
                    </Label>
                    <Input
                      value={variant.variantColour || ""}
                      onChange={(e) =>
                        handleUpdateVariant(
                          variant.id,
                          "variantColour",
                          e.target.value
                        )
                      }
                      placeholder="Red, Blue, etc."
                      className="mt-2 text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">Variant Size</Label>
                    <Input
                      value={variant.variantSize || ""}
                      onChange={(e) =>
                        handleUpdateVariant(
                          variant.id,
                          "variantSize",
                          e.target.value
                        )
                      }
                      placeholder="S, M, L, XL"
                      className="mt-2 text-sm sm:text-base"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <Label className="text-sm sm:text-base">
                      Variant Material
                    </Label>
                    <Input
                      value={variant.variantMaterial || ""}
                      onChange={(e) =>
                        handleUpdateVariant(
                          variant.id,
                          "variantMaterial",
                          e.target.value
                        )
                      }
                      placeholder="Cotton, Polyester"
                      className="mt-2 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Custom Attributes Section */}
                <div className="border-t pt-4 sm:pt-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div>
                      <Label className="text-sm sm:text-base font-semibold">
                        Custom Attributes
                      </Label>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Add any additional specifications or features for this
                        product
                      </p>
                    </div>
                  </div>

                  {variant.customAttributes &&
                  variant.customAttributes.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {variant.customAttributes.map((attr, attrIndex) => (
                        <div
                          key={attrIndex}
                          className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                            <Input
                              placeholder="Property name (e.g., Warranty)"
                              value={attr.key}
                              onChange={(e) =>
                                handleUpdateCustomAttribute(
                                  variant.id,
                                  attrIndex,
                                  "key",
                                  e.target.value
                                )
                              }
                              className="bg-white text-sm sm:text-base"
                            />
                            <Input
                              placeholder="Property value (e.g., 2 Years)"
                              value={attr.value}
                              onChange={(e) =>
                                handleUpdateCustomAttribute(
                                  variant.id,
                                  attrIndex,
                                  "value",
                                  e.target.value
                                )
                              }
                              className="bg-white text-sm sm:text-base"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRemoveCustomAttribute(variant.id, attrIndex)
                            }
                            className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 self-end sm:self-auto"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-4 sm:p-8 text-center bg-gray-50">
                      <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-muted-foreground opacity-50" />
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                        No custom attributes added yet
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add product-specific details like warranty period,
                        ingredients, battery capacity, etc.
                      </p>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddCustomAttribute(variant.id)}
                    className="w-full mt-3"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Attribute
                  </Button>
                </div>

                {/* Pricing Section with Auto-Calculation */}
                <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div>
                      <Label className="text-sm sm:text-base font-medium">
                        Pricing & Discount
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter Selling Price + Discount to auto-calculate MRP, OR
                        enter MRP + Discount to auto-calculate Selling Price
                      </p>
                    </div>
                  </div>

                  {/* Auto-Calculate Prices from Inventory Toggle */}
                  <div className="flex items-start gap-2 mb-3 sm:mb-4 p-2 sm:p-3 bg-white border border-blue-300 rounded-lg">
                    <Switch
                      id={`auto-calc-${variant.id}`}
                      checked={autoCalculatePrices}
                      onCheckedChange={(checked) => {
                        setAutoCalculatePrices(checked);
                        // Save preference to localStorage
                        if (typeof window !== "undefined") {
                          localStorage.setItem(
                            "autoCalculatePrices",
                            String(checked)
                          );
                        }

                        if (checked) {
                          // Turning ON - Calculate prices if purchase price exists
                          if (variant.variantPurchasePrice > 0) {
                            const purchasePrice = variant.variantPurchasePrice;
                            const gstPercentage = variant.variantGST || 0;
                            const priceWithGST =
                              purchasePrice * (1 + gstPercentage / 100);
                            const sellingPrice = Math.round(priceWithGST * 1.2); // 20% markup
                            const mrp = Math.round(sellingPrice * 1.1); // 10% above selling price
                            const calculatedDiscount = Math.round(
                              ((mrp - sellingPrice) / mrp) * 100
                            );

                            const updatedVariants = formData.variants.map((v) =>
                              v.id === variant.id
                                ? {
                                    ...v,
                                    variantMRP: mrp,
                                    variantSellingPrice: sellingPrice,
                                    variantDiscount: calculatedDiscount,
                                    discountType: "percent" as const,
                                  }
                                : v
                            );
                            onVariantsChange(updatedVariants);
                          }
                        } else {
                          // Turning OFF - Clear prices to zero for manual entry
                          const updatedVariants = formData.variants.map((v) =>
                            v.id === variant.id
                              ? {
                                  ...v,
                                  variantMRP: 0,
                                  variantSellingPrice: 0,
                                  variantDiscount: 0,
                                }
                              : v
                          );
                          onVariantsChange(updatedVariants);
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`auto-calc-${variant.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        Auto-calculate prices from purchase cost
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {autoCalculatePrices
                          ? "Prices calculated using 20% markup + 10% MRP formula"
                          : "Enter prices manually or toggle ON to auto-calculate"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    {/* Discount Type */}
                    <div>
                      <Label className="text-sm sm:text-base">
                        Discount Type
                      </Label>
                      <Select
                        value={variant.discountType || "percent"}
                        onValueChange={(value: "percent" | "flat") =>
                          handleUpdateVariant(variant.id, "discountType", value)
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">
                            Percentage (%)
                          </SelectItem>
                          <SelectItem value="flat">
                            Flat Amount ({currencySymbol})
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Discount Value */}
                    <div>
                      <Label className="text-sm sm:text-base">
                        Discount{" "}
                        {variant.discountType === "percent"
                          ? "(%)"
                          : `(${currencySymbol})`}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variant.variantDiscount ?? 0}
                        onChange={(e) =>
                          handleUpdateVariant(
                            variant.id,
                            "variantDiscount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="mt-2 text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Selling Price */}
                    <div>
                      <Label className="text-sm sm:text-base">
                        Selling Price ({currencySymbol}){" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variant.variantSellingPrice ?? 0}
                        onChange={(e) =>
                          handleUpdateVariant(
                            variant.id,
                            "variantSellingPrice",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="mt-2 font-semibold text-sm sm:text-base"
                      />
                      <p className="text-xs text-green-600 mt-1">
                        Customer pays this price
                      </p>
                    </div>

                    {/* MRP */}
                    <div>
                      <Label className="text-sm sm:text-base">
                        MRP ({currencySymbol}){" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variant.variantMRP ?? 0}
                        onChange={(e) =>
                          handleUpdateVariant(
                            variant.id,
                            "variantMRP",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="mt-2 font-semibold text-sm sm:text-base"
                      />
                      <p className="text-xs text-blue-600 mt-1">
                        Maximum Retail Price
                      </p>
                    </div>
                  </div>

                  {/* Savings Display */}
                  {variant.variantMRP > variant.variantSellingPrice && (
                    <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-center">
                      <p className="text-sm font-medium text-green-800">
                        Customer Saves: {currencySymbol}
                        {(
                          variant.variantMRP - variant.variantSellingPrice
                        ).toFixed(2)}
                        (
                        {variant.discountType === "percent"
                          ? `${variant.variantDiscount}%`
                          : `${currencySymbol}${variant.variantDiscount}`}{" "}
                        OFF)
                      </p>
                    </div>
                  )}
                </div>

                {/* GST & Purchase Price */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm sm:text-base">
                      Variant GST % <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={variant.variantGST?.toString() || ""}
                      onValueChange={(value) =>
                        handleUpdateVariant(
                          variant.id,
                          "variantGST",
                          parseFloat(value)
                        )
                      }
                      disabled={isLoadingGST}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue
                          placeholder={
                            isLoadingGST
                              ? "Loading GST rates..."
                              : "Select GST rate"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {gstRates.length === 0 ? (
                          <div className="p-2 text-xs sm:text-sm text-muted-foreground text-center">
                            {isLoadingGST
                              ? "Loading..."
                              : "No GST rates available"}
                          </div>
                        ) : (
                          gstRates.map((rate) => (
                            <SelectItem
                              key={rate.id}
                              value={rate.gstPercentage.toString()}
                            >
                              {rate.name} - {rate.gstPercentage}%
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-selected from inventory, can be changed
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">
                      Purchase Price ({currencySymbol})
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={variant.variantPurchasePrice ?? 0}
                      readOnly
                      disabled
                      className="mt-2 text-sm sm:text-base bg-gray-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-filled from inventory (read-only)
                    </p>
                  </div>
                </div>

                {/* Row 4: Stock Quantity, Low Stock Alert, Weight */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm sm:text-base">
                      Variant Stock Quantity
                    </Label>
                    <Input
                      type="number"
                      value={variant.variantStockQuantity ?? 0}
                      readOnly
                      disabled
                      className="mt-2 text-sm sm:text-base bg-gray-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Synced from inventory (read-only) - {variant.variantStockQuantity || 0} units
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">
                      Low Stock Alert Level
                    </Label>
                    <Input
                      type="number"
                      value={variant.variantLowStockAlert ?? ""}
                      readOnly
                      disabled
                      className="mt-2 text-sm sm:text-base bg-gray-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Synced from inventory (read-only)
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">
                      Variant Weight (kg)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={variant.variantWeight ?? 0}
                      onChange={(e) =>
                        handleUpdateVariant(
                          variant.id,
                          "variantWeight",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0"
                      className="mt-2 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm sm:text-base">Length (cm)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={variant.variantLength ?? ""}
                      onChange={(e) =>
                        handleUpdateVariant(
                          variant.id,
                          "variantLength",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                      placeholder="0"
                      className="mt-2 text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <Label className="text-sm sm:text-base">Width (cm)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={variant.variantWidth ?? ""}
                      onChange={(e) =>
                        handleUpdateVariant(
                          variant.id,
                          "variantWidth",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                      placeholder="0"
                      className="mt-2 text-sm sm:text-base"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <Label className="text-sm sm:text-base">Height (cm)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={variant.variantHeight ?? ""}
                      onChange={(e) =>
                        handleUpdateVariant(
                          variant.id,
                          "variantHeight",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                      placeholder="0"
                      className="mt-2 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Detailed Description */}
                <div>
                  <Label className="text-sm sm:text-base">
                    Detailed Description
                  </Label>
                  <Textarea
                    value={variant.detailedDescription || ""}
                    onChange={(e) =>
                      handleUpdateVariant(
                        variant.id,
                        "detailedDescription",
                        e.target.value
                      )
                    }
                    placeholder="Enter detailed description for this variant"
                    className="mt-2 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                  />
                </div>

                {/* Variant Status */}
                <div>
                  <Label className="text-sm sm:text-base">Variant Status</Label>
                  <Select
                    value={variant.variantStatus || "active"}
                    onValueChange={(value: "active" | "inactive") =>
                      handleUpdateVariant(variant.id, "variantStatus", value)
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Variant Images */}
                <div>
                  <Label className="text-sm sm:text-base">
                    Variant-specific Images (Multiple)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    First image will be the main display image. Drag to reorder.
                  </p>
                  <input
                    type="file"
                    id={`variant-images-${variant.id}`}
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      console.log("📁 Files selected:", files.length, files);
                      if (files.length > 0) {
                        const updatedVariants = formData.variants.map((v) => {
                          if (v.id === variant.id) {
                            const newImages = [...v.variantImages, ...files];
                            console.log(
                              "✅ Updated variant images:",
                              newImages
                            );
                            return { ...v, variantImages: newImages };
                          }
                          return v;
                        });
                        onVariantsChange(updatedVariants);
                        toast.success(`${files.length} image(s) added`);
                      }
                    }}
                  />
                  <label
                    htmlFor={`variant-images-${variant.id}`}
                    className="mt-2 border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors block"
                  >
                    <Upload className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Click to upload or drag and drop variant images
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG up to 10MB (Multiple files allowed)
                    </p>
                  </label>
                  {variant.variantImages.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                      {variant.variantImages.map((img, imgIndex) => (
                        <div
                          key={imgIndex}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData(
                              "text/plain",
                              imgIndex.toString()
                            );
                            e.currentTarget.classList.add("opacity-50");
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.classList.remove("opacity-50");
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            e.currentTarget.classList.add(
                              "ring-2",
                              "ring-blue-500"
                            );
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.classList.remove(
                              "ring-2",
                              "ring-blue-500"
                            );
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove(
                              "ring-2",
                              "ring-blue-500"
                            );

                            const draggedIndex = parseInt(
                              e.dataTransfer.getData("text/plain")
                            );
                            const targetIndex = imgIndex;

                            if (draggedIndex !== targetIndex) {
                              const updatedVariants = formData.variants.map(
                                (v) => {
                                  if (v.id === variant.id) {
                                    const newImages = [...v.variantImages];
                                    const [draggedImage] = newImages.splice(
                                      draggedIndex,
                                      1
                                    );
                                    newImages.splice(
                                      targetIndex,
                                      0,
                                      draggedImage
                                    );
                                    return { ...v, variantImages: newImages };
                                  }
                                  return v;
                                }
                              );
                              onVariantsChange(updatedVariants);
                              toast.success("Image order updated");
                            }
                          }}
                          className="relative w-full aspect-square border-2 rounded-lg group cursor-move hover:border-blue-400 transition-all"
                        >
                          {imgIndex === 0 && (
                            <div className="absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2 bg-blue-500 text-white text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium z-10">
                              Main
                            </div>
                          )}
                          <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1 sm:px-1.5 py-0.5 rounded z-10">
                            {imgIndex + 1}
                          </div>
                          <div className="relative w-full h-full">
                            <Image
                              src={
                                typeof img === "string"
                                  ? img
                                  : URL.createObjectURL(img)
                              }
                              alt={`Variant ${index + 1} - Image ${imgIndex + 1}`}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              className="object-cover rounded-lg"
                              priority={imgIndex === 0}
                              quality={75}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedVariants = formData.variants.map(
                                (v) =>
                                  v.id === variant.id
                                    ? {
                                        ...v,
                                        variantImages: v.variantImages.filter(
                                          (_, i) => i !== imgIndex
                                        ),
                                      }
                                    : v
                              );
                              onVariantsChange(updatedVariants);
                              toast.success("Image removed");
                            }}
                            className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full p-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
