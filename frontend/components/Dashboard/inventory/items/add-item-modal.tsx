"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import FileUpload from "@/components/ui/file-upload";
import { CalendarIcon, Loader2, Plus, X, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import axiosInstance from "@/lib/axios";

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (itemData: ItemFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export interface ItemFormData {
  itemName: string;
  category: string;
  itemCode: string;
  uom: string;
  purchasePrice: string;
  gstRateId: string;
  gstPercentage: string;
  hsnCode: string;
  warehouse: string;
  openingStock: string;
  lowStockAlertLevel: string;
  status: string;
  expiryDate: Date | undefined;
  description: string;
  itemImage: File | null;
}

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

interface GSTRate {
  id: string;
  name: string;
  gstPercentage: number;
  isActive: boolean;
}

export default function AddItemModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: AddItemModalProps) {
  const [formData, setFormData] = useState<ItemFormData>({
    itemName: "",
    category: "",
    itemCode: "",
    uom: "",
    purchasePrice: "",
    gstRateId: "",
    gstPercentage: "",
    hsnCode: "",
    warehouse: "",
    openingStock: "",
    lowStockAlertLevel: "",
    status: "in_stock",
    expiryDate: undefined,
    description: "",
    itemImage: null,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ItemFormData, string>>>({});
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [explicitlyClosing, setExplicitlyClosing] = useState(false);
  const [warehouses, setWarehouses] = useState<{ _id: string; name: string }[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [gstRates, setGstRates] = useState<GSTRate[]>([]);
  const [isLoadingGST, setIsLoadingGST] = useState(true);
  const [isValidatingSKU, setIsValidatingSKU] = useState(false);
  const [skuValidationTimer, setSkuValidationTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch warehouses, categories, and GST rates on mount using Promise.all
  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;

      try {
        setIsLoadingWarehouses(true);
        setIsLoadingCategories(true);
        setIsLoadingGST(true);

        // Fetch warehouses, categories, and GST rates in parallel
        const [warehouseResponse, categoryResponse, gstResponse] = await Promise.all([
          axiosInstance.get("/api/inventory/warehouses?status=active"),
          axiosInstance.get("/api/inventory/categories?isActive=true"),
          axiosInstance.get("/api/finance/gst-rates?isActive=true"),
        ]);

        // Process warehouse response
        if (warehouseResponse.data.success) {
          setWarehouses(
            warehouseResponse.data.data.map((warehouse: { id: string; name: string }) => ({
              _id: warehouse.id,
              name: warehouse.name,
            }))
          );
        }

        // Process category response
        if (categoryResponse.data.success) {
          setCategories(
            categoryResponse.data.data.map((cat: { id: string; name: string }) => ({
              id: cat.id,
              name: cat.name,
            }))
          );
        }

        // Process GST rates response
        if (gstResponse.data.success) {
          setGstRates(gstResponse.data.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setWarehouses([]);
        setCategories([]);
        setGstRates([]);
      } finally {
        setIsLoadingWarehouses(false);
        setIsLoadingCategories(false);
        setIsLoadingGST(false);
      }
    };

    fetchData();
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        itemName: "",
        category: "",
        itemCode: "",
        uom: "",
        purchasePrice: "",
        gstRateId: "",
        gstPercentage: "",
        hsnCode: "",
        warehouse: "",
        openingStock: "",
        lowStockAlertLevel: "",
        status: "in_stock",
        expiryDate: undefined,
        description: "",
        itemImage: null,
      });
      setErrors({});
      
      // Clear SKU validation timer
      if (skuValidationTimer) {
        clearTimeout(skuValidationTimer);
        setSkuValidationTimer(null);
      }
    }
  }, [open, skuValidationTimer]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ItemFormData, string>> = {};

    if (!formData.itemImage) {
      newErrors.itemImage = "Item image is required";
    }
    if (!formData.itemName.trim()) {
      newErrors.itemName = "Item name is required";
    }
    if (!formData.category) {
      newErrors.category = "Category is required";
    }
    if (!formData.uom) {
      newErrors.uom = "Unit of measurement is required";
    }
    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) < 0) {
      newErrors.purchasePrice = "Valid purchase price is required";
    }
    if (!formData.gstPercentage || parseFloat(formData.gstPercentage) < 0 || parseFloat(formData.gstPercentage) > 100) {
      newErrors.gstPercentage = "GST % must be between 0 and 100";
    }
    if (!formData.warehouse) {
      newErrors.warehouse = "Warehouse is required";
    }
    if (!formData.openingStock || parseInt(formData.openingStock) < 0) {
      newErrors.openingStock = "Valid opening stock is required";
    }
    if (!formData.lowStockAlertLevel || parseInt(formData.lowStockAlertLevel) < 0) {
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

    await onSubmit(formData);
  };

  const handleInputChange = (field: keyof ItemFormData, value: string | Date | File | null | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Validate SKU/itemCode in real-time with debouncing
    if (field === "itemCode" && typeof value === "string") {
      // Clear previous timer
      if (skuValidationTimer) {
        clearTimeout(skuValidationTimer);
      }

      // Only validate if SKU is not empty
      if (value.trim() !== "") {
        // Set a new timer for debouncing (500ms delay)
        const timer = setTimeout(() => {
          validateSKU(value.trim());
        }, 500);
        setSkuValidationTimer(timer);
      }
    }
  };

  // 🔒 CRITICAL: Validate SKU/itemCode for duplicates
  const validateSKU = async (sku: string) => {
    if (!sku || sku.trim() === "") return;

    try {
      setIsValidatingSKU(true);
      
      // Fetch all items to check for duplicate SKU
      const response = await axiosInstance.get("/api/inventory/items");
      
      if (response.data.success) {
        const items = response.data.data;
        const duplicateItem = items.find(
          (item: { itemCode: string }) => 
            item.itemCode && item.itemCode.toLowerCase() === sku.toLowerCase()
        );

        if (duplicateItem) {
          setErrors((prev) => ({
            ...prev,
            itemCode: `SKU "${sku}" already exists. Please use a unique SKU.`,
          }));
        }
      }
    } catch (error) {
      console.error("Error validating SKU:", error);
      // Don't show error to user for validation failures
    } finally {
      setIsValidatingSKU(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const response = await axiosInstance.post("/api/inventory/categories", {
        name: newCategoryName.trim(),
      });

      if (response.data.success) {
        const newCategory = response.data.data;
        setCategories((prev) => [...prev, { id: newCategory.id, name: newCategory.name }]);
        setFormData((prev) => ({ ...prev, category: newCategory.name }));
        setNewCategoryName("");
        setShowAddCategory(false);
        setCategoryDropdownOpen(false);
        setExplicitlyClosing(true);
      }
    } catch (error) {
      console.error("Error adding category:", error);
      const err = error as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || "Failed to add category");
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) return;
    
    try {
      const response = await axiosInstance.put(`/api/inventory/categories/${editingCategory.id}`, {
        name: editCategoryName.trim(),
      });

      if (response.data.success) {
        const updatedCategory = response.data.data;
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === editingCategory.id ? { id: updatedCategory.id, name: updatedCategory.name } : cat
          )
        );
        
        if (formData.category === editingCategory.name) {
          setFormData((prev) => ({ ...prev, category: updatedCategory.name }));
        }
        
        setEditingCategory(null);
        setEditCategoryName("");
        setCategoryDropdownOpen(false);
        setExplicitlyClosing(true);
      }
    } catch (error) {
      console.error("Error updating category:", error);
      const err = error as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || "Failed to update category");
    }
  };

  const handleCancelAdd = () => {
    setShowAddCategory(false);
    setNewCategoryName("");
    setExplicitlyClosing(true);
    setCategoryDropdownOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Image */}
          <div className="space-y-2">
            <Label>
              Item Main Image <span className="text-destructive">*</span>
            </Label>
            <FileUpload
              acceptedFileTypes={["image/jpeg", "image/png", "image/jpg", "image/webp"]}
              maxFileSize={5 * 1024 * 1024}
              onUploadSuccess={(file) => handleInputChange("itemImage", file)}
              onFileRemove={() => handleInputChange("itemImage", null)}
              currentFile={formData.itemImage}
            />
            {errors.itemImage && (
              <p className="text-xs text-destructive">{errors.itemImage}</p>
            )}
          </div>

          {/* Row 1: Item Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">
                Item Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="itemName"
                value={formData.itemName}
                onChange={(e) => handleInputChange("itemName", e.target.value)}
                placeholder="Enter item name"
                className={errors.itemName ? "border-destructive" : ""}
              />
              {errors.itemName && (
                <p className="text-xs text-destructive">{errors.itemName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  if (value === "add_new_category") {
                    setEditingCategory(null);
                    setEditCategoryName("");
                    setShowAddCategory(true);
                    setNewCategoryName("");
                    setCategoryDropdownOpen(true);
                  } else {
                    handleInputChange("category", value);
                    setCategoryDropdownOpen(false);
                  }
                }}
                open={categoryDropdownOpen}
                onOpenChange={(open) => {
                  if (!open && (editingCategory || showAddCategory) && !explicitlyClosing) {
                    setCategoryDropdownOpen(true);
                    return;
                  }
                  setCategoryDropdownOpen(open);
                  if (explicitlyClosing) {
                    setExplicitlyClosing(false);
                  }
                  if (!open && !explicitlyClosing) {
                    setShowAddCategory(false);
                    setEditingCategory(null);
                    setNewCategoryName("");
                    setEditCategoryName("");
                  }
                }}
              >
                <SelectTrigger className={cn("w-full cursor-pointer", errors.category && "border-destructive")}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="z-50" data-no-search="true">
                  {isLoadingCategories ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Loading categories...
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No categories available
                    </div>
                  ) : (
                    categories.map((category) => (
                      <div key={category.id} className="flex items-center justify-between group">
                        <SelectItem value={category.name} className="flex-1 cursor-pointer">
                          {category.name}
                        </SelectItem>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 cursor-pointer p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAddCategory(false);
                              setNewCategoryName("");
                              setEditingCategory({ id: category.id, name: category.name });
                              setEditCategoryName(category.name);
                              setCategoryDropdownOpen(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}

                  <div
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1.5 text-sm flex items-center text-gray-900 dark:text-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setEditingCategory(null);
                      setEditCategoryName("");
                      setShowAddCategory(true);
                      setNewCategoryName("");
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Category
                  </div>

                  {showAddCategory && (
                    <div
                      className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Add New Category
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelAdd}
                          className="hover:bg-gray-200 cursor-pointer dark:hover:bg-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Enter category name"
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCategory();
                            }
                            e.stopPropagation();
                          }}
                          onFocus={(e) => e.stopPropagation()}
                        />
                        <Button
                          type="button"
                          onClick={handleAddCategory}
                          size="sm"
                          className="cursor-pointer"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  )}

                  {editingCategory && (
                    <div
                      className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Edit Category
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCategory(null);
                            setEditCategoryName("");
                            setExplicitlyClosing(true);
                            setCategoryDropdownOpen(false);
                          }}
                          className="hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          placeholder="Enter category name"
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleEditCategory();
                            }
                            e.stopPropagation();
                          }}
                          onFocus={(e) => e.stopPropagation()}
                        />
                        <Button
                          type="button"
                          onClick={handleEditCategory}
                          size="sm"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Update
                        </Button>
                      </div>
                    </div>
                  )}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category}</p>
              )}
            </div>
          </div>

          {/* Row 2: Item Code & UOM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemCode">Item Code / SKU (optional)</Label>
              <div className="relative">
                <Input
                  id="itemCode"
                  value={formData.itemCode}
                  onChange={(e) => handleInputChange("itemCode", e.target.value)}
                  placeholder="Enter item code or SKU"
                  className={errors.itemCode ? "border-destructive pr-10" : ""}
                />
                {isValidatingSKU && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {errors.itemCode && (
                <p className="text-xs text-destructive">{errors.itemCode}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter a unique SKU/Item Code for inventory tracking
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="uom">
                Unit of Measurement (UOM) <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.uom}
                onValueChange={(value) => handleInputChange("uom", value)}
              >
                <SelectTrigger className={cn("w-full", errors.uom && "border-destructive")}>
                  <SelectValue placeholder="Select UOM" />
                </SelectTrigger>
                <SelectContent>
                  {UOM_OPTIONS.map((uom) => (
                    <SelectItem key={uom} value={uom}>
                      {uom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.uom && (
                <p className="text-xs text-destructive">{errors.uom}</p>
              )}
            </div>
          </div>

          {/* Row 3: Purchase Price & GST % */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">
                Purchase Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.purchasePrice}
                onChange={(e) => handleInputChange("purchasePrice", e.target.value)}
                placeholder="0.00"
                className={errors.purchasePrice ? "border-destructive" : ""}
              />
              {errors.purchasePrice && (
                <p className="text-xs text-destructive">{errors.purchasePrice}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstPercentage">
                GST % <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.gstRateId}
                onValueChange={(value) => {
                  const selectedRate = gstRates.find(r => r.id === value);
                  if (selectedRate) {
                    handleInputChange("gstRateId", value);
                    handleInputChange("gstPercentage", selectedRate.gstPercentage.toString());
                  }
                }}
                disabled={isLoadingGST}
              >
                <SelectTrigger className={cn("w-full", errors.gstPercentage && "border-destructive")}>
                  <SelectValue placeholder={isLoadingGST ? "Loading GST rates..." : "Select GST %"} />
                </SelectTrigger>
                <SelectContent>
                  {gstRates.length === 0 && !isLoadingGST ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No GST rates available
                    </div>
                  ) : (
                    gstRates.map((rate) => (
                      <SelectItem key={rate.id} value={rate.id}>
                        {rate.name} 
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.gstPercentage && (
                <p className="text-xs text-destructive">{errors.gstPercentage}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Select the applicable GST rate for this item
              </p>
            </div>
          </div>

          {/* Row 4: HSN Code & Warehouse */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hsnCode">HSN Code (optional)</Label>
              <Input
                id="hsnCode"
                value={formData.hsnCode}
                onChange={(e) => handleInputChange("hsnCode", e.target.value)}
                placeholder="Enter HSN code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse">
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.warehouse}
                onValueChange={(value) => handleInputChange("warehouse", value)}
                disabled={isLoadingWarehouses}
              >
                <SelectTrigger className={cn("w-full", errors.warehouse && "border-destructive")}>
                  <SelectValue placeholder={isLoadingWarehouses ? "Loading warehouses..." : "Select warehouse"} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.length === 0 && !isLoadingWarehouses ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No active warehouses available
                    </div>
                  ) : (
                    warehouses.map((warehouse) => (
                      <SelectItem key={warehouse._id} value={warehouse._id}>
                        {warehouse.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.warehouse && (
                <p className="text-xs text-destructive">{errors.warehouse}</p>
              )}
            </div>
          </div>

          {/* Row 5: Opening Stock & Low Stock Alert Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openingStock">
                Opening Stock <span className="text-destructive">*</span>
              </Label>
              <Input
                id="openingStock"
                type="number"
                min="0"
                value={formData.openingStock}
                onChange={(e) => handleInputChange("openingStock", e.target.value)}
                placeholder="0"
                className={errors.openingStock ? "border-destructive" : ""}
              />
              {errors.openingStock && (
                <p className="text-xs text-destructive">{errors.openingStock}</p>
              )}
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
                onChange={(e) => handleInputChange("lowStockAlertLevel", e.target.value)}
                placeholder="0"
                className={errors.lowStockAlertLevel ? "border-destructive" : ""}
              />
              {errors.lowStockAlertLevel && (
                <p className="text-xs text-destructive">{errors.lowStockAlertLevel}</p>
              )}
            </div>
          </div>

          {/* Row 6: Status & Expiry Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange("status", value)}
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

            <div className="space-y-2">
              <Label>Expiry Date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expiryDate ? (
                      format(formData.expiryDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expiryDate}
                    onSelect={(date) => handleInputChange("expiryDate", date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Enter item description"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Item"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
