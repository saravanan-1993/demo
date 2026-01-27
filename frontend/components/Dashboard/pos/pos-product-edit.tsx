"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PosProductFormData } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Barcode as BarcodeIcon, Download, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import axiosInstance from "@/lib/axios";
import { barcodeService } from "@/services/offline-services/barcodeService";
import Barcode from "react-barcode";

interface PosProductEditProps {
  productId: string;
}

export const PosProductEdit: React.FC<PosProductEditProps> = ({
  productId,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGeneratingBarcode, setIsGeneratingBarcode] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof PosProductFormData, string>>
  >({});
  const [categories, setCategories] = useState<string[]>([]);
  const [gstRates, setGstRates] = useState<Array<{ id: string; name: string; gstPercentage: number }>>([]);

  const [formData, setFormData] = useState<PosProductFormData>({
    itemName: "",
    category: "",
    itemCode: "",
    barcode: "",
    brand: "",
    uom: "",
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    gstPercentage: 0,
    hsnCode: "",
    discountType: "",
    discountValue: 0,
    warehouse: "Default",
    openingStock: 0,
    quantity: 0,
    lowStockAlertLevel: 0,
    status: "in_stock",
    display: "inactive",
    expiryDate: undefined,
    mfgDate: undefined,
    batchNo: "",
    safetyInformation: "",
    description: "",
    itemImage: "" as string | File,
  });

  const UOM_OPTIONS = [
    "Piece",
    "Box",
    "Kg",
    "Litre",
    "Meter",
    "Dozen",
    "Pack",
    "Unit",
  ];

  useEffect(() => {
    fetchCategories();
    fetchGSTRates();
    fetchProduct();
  }, [productId]);

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get(
        "/api/inventory/categories?isActive=true"
      );
      if (response.data.success) {
        const categoryNames = response.data.data.map(
          (cat: { name: string }) => cat.name
        );
        setCategories(categoryNames);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    }
  };

  const fetchGSTRates = async () => {
    try {
      const response = await axiosInstance.get("/api/finance/gst-rates?isActive=true");
      if (response.data.success) {
        setGstRates(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching GST rates:", error);
      setGstRates([]);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/api/pos/products/${productId}`
      );

      if (response.data.success) {
        const product = response.data.data;
        setFormData({
          itemName: product.itemName,
          category: product.category,
          itemCode: product.itemCode || "",
          barcode: product.barcode || "",
          brand: product.brand || "",
          uom: product.uom,
          purchasePrice: product.purchasePrice,
          sellingPrice: product.sellingPrice || 0,
          mrp: product.mrp || 0,
          gstPercentage: product.gstPercentage,
          hsnCode: product.hsnCode || "",
          discountType: product.discountType || "",
          discountValue: product.discountValue || 0,
          warehouse: product.warehouse,
          openingStock: product.openingStock,
          quantity: product.quantity,
          lowStockAlertLevel: product.lowStockAlertLevel,
          status: product.status,
          display: product.display || "inactive",
          expiryDate: product.expiryDate
            ? new Date(product.expiryDate)
            : undefined,
          mfgDate: product.mfgDate
            ? new Date(product.mfgDate)
            : undefined,
          batchNo: product.batchNo || "",
          safetyInformation: product.safetyInformation || "",
          description: product.description || "",
          itemImage: product.itemImage || "",
        });
      }
    } catch (error) {
      toast.error("Failed to load product");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PosProductFormData, string>> = {};

    if (!formData.itemName.trim()) {
      newErrors.itemName = "Item name is required";
    }
    if (!formData.category) {
      newErrors.category = "Category is required";
    }
    if (!formData.uom) {
      newErrors.uom = "Unit of measurement is required";
    }
    if (!formData.purchasePrice || formData.purchasePrice < 0) {
      newErrors.purchasePrice = "Valid purchase price is required";
    }
    if (!formData.sellingPrice || formData.sellingPrice < 0) {
      newErrors.sellingPrice = "Valid selling price is required";
    }
    if (formData.gstPercentage < 0 || formData.gstPercentage > 100) {
      newErrors.gstPercentage = "GST % must be between 0 and 100";
    }
    if (formData.openingStock < 0) {
      newErrors.openingStock = "Valid opening stock is required";
    }
    if (formData.quantity < 0) {
      newErrors.quantity = "Valid quantity is required";
    }
    if (formData.lowStockAlertLevel < 0) {
      newErrors.lowStockAlertLevel = "Valid low stock alert level is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      // Create FormData for multipart upload
      const submitData = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach((key) => {
        const value = formData[key as keyof PosProductFormData];
        if (value !== null && value !== undefined && value !== '') {
          if (value instanceof Date) {
            submitData.append(key, value.toISOString());
          } else if (value instanceof File) {
            submitData.append(key, value);
          } else {
            submitData.append(key, String(value));
          }
        }
      });

      await axiosInstance.put(`/api/pos/products/${productId}`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success("Product updated successfully");
      router.push("/dashboard/pos/products");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || "An error occurred";
      toast.error(`Failed to update product: ${errorMessage}`);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    field: keyof PosProductFormData,
    value: string | number | Date | File | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleGenerateBarcode = async () => {
    try {
      setIsGeneratingBarcode(true);
      const response = await barcodeService.generateBarcode();
      
      if (response.success) {
        handleChange("barcode", response.data.barcode);
        toast.success(`Barcode generated: ${response.data.barcode}`);
      }
    } catch (error: unknown) {
      console.error("Error generating barcode:", error);
      toast.error("Failed to generate barcode");
    } finally {
      setIsGeneratingBarcode(false);
    }
  };

  const handleDownloadBarcode = () => {
    try {
      const svg = document.querySelector(`#barcode-display svg`) as SVGElement;
      if (!svg) {
        toast.error("Barcode not found");
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        toast.error("Failed to create canvas");
        return;
      }

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width || 200;
        canvas.height = img.height || 100;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `barcode-${formData.barcode}-${formData.itemName}.png`;
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

  const handlePrintBarcode = () => {
    try {
      const barcodeElement = document.getElementById(`barcode-display`);
      if (!barcodeElement) {
        toast.error("Barcode not found");
        return;
      }

      const printWindow = window.open('', '_blank');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-muted-foreground">Loading product...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Product</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update product information (synced from inventory)
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">1. Basic Information</h2>
          
          {/* Row: Category & Product Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange("category", value)}
              >
                <SelectTrigger
                  className={cn(
                    "w-full",
                    errors.category && "border-destructive"
                  )}
                >
                  <SelectValue placeholder="Select from inventory" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No categories available
                    </div>
                  ) : (
                    categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemName">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="itemName"
                type="text"
                value={formData.itemName}
                onChange={(e) => handleChange("itemName", e.target.value)}
                placeholder="Enter product name"
                className={cn(errors.itemName && "border-destructive")}
              />
              {errors.itemName && (
                <p className="text-xs text-destructive">{errors.itemName}</p>
              )}
            </div>
          </div>

          {/* Row: SKU, Barcode, Brand */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemCode">Product SKU</Label>
              <Input
                id="itemCode"
                type="text"
                value={formData.itemCode}
                onChange={(e) => handleChange("itemCode", e.target.value)}
                placeholder="Enter SKU"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => handleChange("barcode", e.target.value)}
                  placeholder="Click generate to create barcode"
                  readOnly
                  className="bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateBarcode}
                  disabled={isGeneratingBarcode}
                >
                  {isGeneratingBarcode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BarcodeIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {formData.barcode && (
                <div className="mt-4 p-4 border rounded-lg bg-white">
                  <div id="barcode-display" className="flex justify-center mb-3">
                    <Barcode value={formData.barcode} width={2} height={80} />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadBarcode}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePrintBarcode}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                type="text"
                value={formData.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                placeholder="Enter brand"
              />
            </div>
          </div>

          {/* Row: Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Product Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Enter product description"
              rows={3}
            />
          </div>

          {/* Row: Active/Inactive */}
          <div className="space-y-2">
            <Label htmlFor="display">Active / Inactive</Label>
            <Select
              value={formData.display}
              onValueChange={(value) => handleChange("display", value)}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Section 2: Media */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">2. Media</h2>
          
          {/* Main Product Image */}
          <div className="space-y-2">
            <Label htmlFor="itemImage">Main Product Image</Label>
            {formData.itemImage && typeof formData.itemImage === 'string' && formData.itemImage.trim() !== '' && (
              <div className="mb-2 relative w-32 h-32">
                <Image
                  src={formData.itemImage}
                  alt="Product"
                  fill
                  sizes="128px"
                  className="object-cover rounded-lg border"
                  priority={false}
                  quality={75}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Product images are managed through the inventory service
            </p>
          </div>
        </div>

        {/* Section 3: Pricing & Tax */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">3. Pricing & Tax</h2>
          
          {/* Row: HSN Code & GST % */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hsnCode">HSN Code</Label>
              <Input
                id="hsnCode"
                type="text"
                value={formData.hsnCode}
                onChange={(e) => handleChange("hsnCode", e.target.value)}
                placeholder="Enter HSN code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstPercentage">
                GST % <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.gstPercentage.toString()}
                onValueChange={(value) => {
                  const gst = parseFloat(value);
                  handleChange("gstPercentage", gst);
                  // Auto-calculate MRP when GST changes
                  if (formData.sellingPrice) {
                    const mrp = formData.sellingPrice + (formData.sellingPrice * gst / 100);
                    handleChange("mrp", mrp);
                  }
                }}
              >
                <SelectTrigger
                  className={cn(
                    "w-full",
                    errors.gstPercentage && "border-destructive"
                  )}
                >
                  <SelectValue placeholder="Select GST rate" />
                </SelectTrigger>
                <SelectContent>
                  {gstRates.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No GST rates available
                    </div>
                  ) : (
                    gstRates.map((rate) => (
                      <SelectItem key={rate.id} value={rate.gstPercentage.toString()}>
                        {rate.name} ({rate.gstPercentage}%)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.gstPercentage && (
                <p className="text-xs text-destructive">
                  {errors.gstPercentage}
                </p>
              )}
            </div>
          </div>

          {/* Row: MRP, Selling Price, Purchase Price */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mrp">MRP (Auto Calculate)</Label>
              <Input
                id="mrp"
                type="number"
                step="0.01"
                min="0"
                value={formData.mrp}
                placeholder="0.00"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Auto-calculated from Selling Price + GST
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice">
                Selling Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.sellingPrice || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const value = e.target.value;
                  const price = value === '' ? 0 : parseFloat(value);
                  handleChange("sellingPrice", price);
                  // Auto-calculate MRP
                  if (price > 0) {
                    const mrp = price + (price * formData.gstPercentage / 100);
                    handleChange("mrp", mrp);
                  }
                }}
                placeholder="0.00"
                className={cn(errors.sellingPrice && "border-destructive")}
              />
              {errors.sellingPrice && (
                <p className="text-xs text-destructive">
                  {errors.sellingPrice}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchasePrice">
                Purchase Price (Cost) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.purchasePrice}
                onChange={(e) =>
                  handleChange("purchasePrice", parseFloat(e.target.value) || 0)
                }
                placeholder="0.00"
                className={cn(errors.purchasePrice && "border-destructive")}
              />
              {errors.purchasePrice && (
                <p className="text-xs text-destructive">
                  {errors.purchasePrice}
                </p>
              )}
            </div>
          </div>

          {/* Row: Discount Type & Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountType">Discount Type (Percentage / Flat Amount)</Label>
              <Select
                value={formData.discountType}
                onValueChange={(value) => handleChange("discountType", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select discount type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Discount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountValue">Discount Value</Label>
              <Input
                id="discountValue"
                type="number"
                step="0.01"
                min="0"
                value={formData.discountValue || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const value = e.target.value;
                  const discount = value === '' ? 0 : parseFloat(value);
                  handleChange("discountValue", discount);
                }}
                placeholder="0.00"
                disabled={!formData.discountType}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Inventory */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">4. Inventory</h2>
          
          {/* Row: Stock Quantity, Low Stock Alert, Stock Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Stock Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                placeholder="0"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Managed by inventory system
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lowStockAlertLevel">
                Low Stock Alert Level <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lowStockAlertLevel"
                type="number"
                min="0"
                value={formData.lowStockAlertLevel}
                onChange={(e) =>
                  handleChange(
                    "lowStockAlertLevel",
                    parseInt(e.target.value) || 0
                  )
                }
                placeholder="0"
                className={cn(errors.lowStockAlertLevel && "border-destructive")}
              />
              {errors.lowStockAlertLevel && (
                <p className="text-xs text-destructive">
                  {errors.lowStockAlertLevel}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Stock Status (In Stock / Out of Stock) <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 5: Additional Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">5. Additional Information</h2>
          
          {/* Row: Expiry Date, MFG Date, Batch No */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date (FMCG, Food products)</Label>
              <Input
                id="expiryDate"
                type="date"
                value={
                  formData.expiryDate
                    ? formData.expiryDate.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  handleChange(
                    "expiryDate",
                    e.target.value ? new Date(e.target.value) : undefined
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mfgDate">MFG Date</Label>
              <Input
                id="mfgDate"
                type="date"
                value={
                  formData.mfgDate
                    ? formData.mfgDate.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  handleChange(
                    "mfgDate",
                    e.target.value ? new Date(e.target.value) : undefined
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchNo">Batch No</Label>
              <Input
                id="batchNo"
                type="text"
                value={formData.batchNo}
                onChange={(e) => handleChange("batchNo", e.target.value)}
                placeholder="Enter batch number"
              />
            </div>
          </div>

          {/* Row: Safety Information */}
          <div className="space-y-2">
            <Label htmlFor="safetyInformation">Safety Information</Label>
            <Textarea
              id="safetyInformation"
              value={formData.safetyInformation}
              onChange={(e) => handleChange("safetyInformation", e.target.value)}
              placeholder="Enter safety information, warnings, or precautions"
              rows={3}
            />
          </div>

          {/* Row: Product Image */}
          <div className="space-y-2">
            <Label htmlFor="itemImage">Product Image</Label>
            <div className="flex items-start gap-4">
              {/* Current Image Preview */}
              {formData.itemImage && (
                typeof formData.itemImage === 'string' 
                  ? formData.itemImage.trim() !== '' && (
                      <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                        <Image
                          src={formData.itemImage}
                          alt="Product"
                          fill
                          sizes="128px"
                          className="object-cover"
                          priority={false}
                          quality={75}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )
                  : (
                      <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                        <Image
                          src={URL.createObjectURL(formData.itemImage)}
                          alt="Product"
                          fill
                          sizes="128px"
                          className="object-cover"
                          priority={false}
                          quality={75}
                        />
                      </div>
                    )
              )}
              
              {/* File Input */}
              <div className="flex-1">
                <Input
                  id="itemImage"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleChange("itemImage", file);
                    }
                  }}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload product image (JPEG, PNG, WebP - Max 5MB)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
