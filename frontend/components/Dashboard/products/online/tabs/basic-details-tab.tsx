"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductFormState } from "@/types/product";
import { categoryService } from "@/services/online-services/categoryService";
import { brandService, Brand } from "@/services/online-services/brandService";
import { cuttingStyleService, CuttingStyle } from "@/services/online-services/cuttingStyleService";
import { toast } from "sonner";
import { Plus, X, Edit2 } from "lucide-react";

interface BasicDetailsTabProps {
  formData: ProductFormState;
  onChange: (field: keyof ProductFormState, value: unknown) => void;
}

interface CategoryName {
  _id: string;
  name: string;
}

interface SubcategoryWithId {
  id: string;
  name: string;
}

export function BasicDetailsTab({ formData, onChange }: BasicDetailsTabProps) {
  const [categories, setCategories] = useState<CategoryName[]>([]);
  const [subCategories, setSubCategories] = useState<SubcategoryWithId[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [cuttingStyles, setCuttingStyles] = useState<CuttingStyle[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingSubCategories, setIsLoadingSubCategories] = useState(false);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [isLoadingCuttingStyles, setIsLoadingCuttingStyles] = useState(false);
  
  // Brand management state
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [editingBrand, setEditingBrand] = useState<{ id: string; name: string } | null>(null);
  const [editBrandName, setEditBrandName] = useState("");
  const [explicitlyClosing, setExplicitlyClosing] = useState(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState("");

  // Cutting style management state
  const [showAddCuttingStyle, setShowAddCuttingStyle] = useState(false);
  const [newCuttingStyleName, setNewCuttingStyleName] = useState("");

  // Fetch categories, brands, and cutting styles on mount
  useEffect(() => {
    fetchCategories();
    fetchBrands();
    fetchCuttingStyles();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (formData.category) {
      fetchSubCategories(formData.category);
    } else {
      setSubCategories([]);
    }
  }, [formData.category]);

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const response = await categoryService.getCategoryNames();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error: unknown) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchSubCategories = async (categoryName: string) => {
    try {
      setIsLoadingSubCategories(true);
      const response = await categoryService.getSubcategoriesWithIds(categoryName);
      if (response.success) {
        setSubCategories(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching subcategories:", error);
      toast.error("Failed to load subcategories");
      setSubCategories([]);
    } finally {
      setIsLoadingSubCategories(false);
    }
  };

  const fetchBrands = async () => {
    try {
      setIsLoadingBrands(true);
      const response = await brandService.getAllBrands();
      if (response.success) {
        setBrands(response.data);
      }
    } catch (error: unknown) {
      console.error("Error fetching brands:", error);
      toast.error("Failed to load brands");
    } finally {
      setIsLoadingBrands(false);
    }
  };

  const fetchCuttingStyles = async () => {
    try {
      setIsLoadingCuttingStyles(true);
      const response = await cuttingStyleService.getActiveCuttingStyles();
      if (response.success) {
        setCuttingStyles(response.data);
      }
    } catch (error: unknown) {
      console.error("Error fetching cutting styles:", error);
      // Don't show error toast - cutting styles are optional
    } finally {
      setIsLoadingCuttingStyles(false);
    }
  };

  const handleAddCuttingStyle = async () => {
    if (!newCuttingStyleName.trim()) return;

    try {
      const response = await cuttingStyleService.createCuttingStyle({
        name: newCuttingStyleName.trim(),
      });
      
      if (response.success) {
        setCuttingStyles((prev) => [...prev, response.data]);
        // Auto-select the new cutting style
        const newCuttingStyles = [...(formData.cuttingStyles || []), response.data.id];
        onChange("cuttingStyles", newCuttingStyles);
        
        setNewCuttingStyleName("");
        setShowAddCuttingStyle(false);
        toast.success("Cutting style created successfully");
      }
    } catch (error: unknown) {
      console.error("Error adding cutting style:", error);
      toast.error("Failed to create cutting style");
    }
  };

  const handleCuttingStyleToggle = (styleId: string, checked: boolean) => {
    const currentStyles = formData.cuttingStyles || [];
    let newStyles: string[];
    
    if (checked) {
      newStyles = [...currentStyles, styleId];
    } else {
      newStyles = currentStyles.filter((id) => id !== styleId);
    }
    
    onChange("cuttingStyles", newStyles);
  };

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) return;

    try {
      const response = await brandService.createBrand(newBrandName.trim());
      
      const newBrand: Brand = {
        id: response.data.id,
        name: newBrandName.trim(),
      };
      setBrands((prev) => [...prev, newBrand]);
      onChange("brand", newBrandName.trim());
      
      setNewBrandName("");
      setShowAddBrand(false);
      setBrandDropdownOpen(false);
      setExplicitlyClosing(true);
      
      toast.success("Brand created successfully");
    } catch (error: any) {
      console.error("Error adding brand:", error);
      toast.error(error.response?.data?.message || "Failed to create brand");
    }
  };

  const handleEditBrand = async () => {
    if (!editingBrand || !editBrandName.trim()) return;

    try {
      await brandService.updateBrand(editingBrand.id, editBrandName.trim());
      
      setBrands((prev) =>
        prev.map((brand) =>
          brand.id === editingBrand.id
            ? { ...brand, name: editBrandName.trim() }
            : brand
        )
      );
      
      if (formData.brand === editingBrand.name) {
        onChange("brand", editBrandName.trim());
      }
      
      setEditingBrand(null);
      setEditBrandName("");
      setBrandDropdownOpen(false);
      setExplicitlyClosing(true);
      
      toast.success("Brand updated successfully");
    } catch (error: any) {
      console.error("Error editing brand:", error);
      toast.error(error.response?.data?.message || "Failed to update brand");
    }
  };

  const handleCancelAdd = () => {
    setShowAddBrand(false);
    setNewBrandName("");
    setExplicitlyClosing(true);
    setBrandDropdownOpen(false);
    setBrandSearchQuery(""); // Clear search when canceling
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">Basic Product Details</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
          Enter the basic information about your product
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Category */}
        <div>
          <Label htmlFor="category">
            Category <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.category}
            onValueChange={(value) => {
              onChange("category", value);
              onChange("subCategory", ""); // Reset subcategory
            }}
            disabled={isLoadingCategories}
          >
            <SelectTrigger id="category" className="mt-2">
              <SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select category"} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat._id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sub-Category */}
        <div>
          <Label htmlFor="subCategory">
            Sub-Category
          </Label>
          <Select
            value={formData.subCategory || ""}
            onValueChange={(value) => onChange("subCategory", value)}
            disabled={!formData.category || isLoadingSubCategories}
          >
            <SelectTrigger id="subCategory" className="mt-2">
              <SelectValue 
                placeholder={
                  isLoadingSubCategories 
                    ? "Loading..." 
                    : !formData.category 
                    ? "Select category first" 
                    : "Select sub-category"
                } 
              />
            </SelectTrigger>
            <SelectContent>
              {subCategories.map((subCat) => (
                <SelectItem key={subCat.id} value={subCat.name}>
                  {subCat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Brand */}
        <div className="relative">
          <Label className="text-base font-semibold">Brand</Label>
          <div className="mt-2 space-y-2">
            <Select
              value={formData.brand}
              onValueChange={(value) => {
                if (value === "add_new_brand") {
                  setEditingBrand(null);
                  setEditBrandName("");
                  setShowAddBrand(true);
                  setNewBrandName("");
                  setBrandDropdownOpen(true);
                } else {
                  onChange("brand", value);
                  setBrandDropdownOpen(false);
                }
              }}
              open={brandDropdownOpen}
              onOpenChange={(open) => {
                if (!open && (editingBrand || showAddBrand) && !explicitlyClosing) {
                  setBrandDropdownOpen(true);
                  return;
                }
                setBrandDropdownOpen(open);
                if (explicitlyClosing) {
                  setExplicitlyClosing(false);
                }
                if (!open && !explicitlyClosing) {
                  setShowAddBrand(false);
                  setEditingBrand(null);
                  setNewBrandName("");
                  setEditBrandName("");
                  setBrandSearchQuery(""); // Clear search when closing
                }
              }}
              disabled={isLoadingBrands}
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder={isLoadingBrands ? "Loading..." : "Select brand"} />
              </SelectTrigger>
              <SelectContent className="z-50" data-no-search="true">
                {/* Search Input */}
                <div className="p-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-950 z-10">
                  <Input
                    placeholder="Search brands..."
                    value={brandSearchQuery}
                    onChange={(e) => setBrandSearchQuery(e.target.value)}
                    className="h-8"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Filtered Brands List */}
                {brands
                  .filter((brand) =>
                    brand.name.toLowerCase().includes(brandSearchQuery.toLowerCase())
                  )
                  .map((brand) => (
                  <div key={brand.id} className="flex items-center justify-between group">
                    <SelectItem value={brand.name} className="flex-1 cursor-pointer">
                      {brand.name}
                    </SelectItem>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 cursor-pointer p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAddBrand(false);
                          setNewBrandName("");
                          setEditingBrand({ id: brand.id, name: brand.name });
                          setEditBrandName(brand.name);
                          setBrandDropdownOpen(true);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* No Results Message */}
                {brandSearchQuery &&
                  brands.filter((brand) =>
                    brand.name.toLowerCase().includes(brandSearchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      No brands found matching &quot;{brandSearchQuery}&quot;
                    </div>
                  )}

                <div
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1.5 text-sm flex items-center text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setEditingBrand(null);
                    setEditBrandName("");
                    setShowAddBrand(true);
                    setNewBrandName("");
                    setBrandSearchQuery(""); // Clear search when adding new
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Brand
                </div>

                {showAddBrand && (
                  <div
                    className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Add New Brand
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
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        placeholder="Enter brand name"
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddBrand();
                          }
                          e.stopPropagation();
                        }}
                        onFocus={(e) => e.stopPropagation()}
                      />
                      <Button type="button" onClick={handleAddBrand} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                {editingBrand && (
                  <div
                    className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Edit Brand
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingBrand(null);
                          setEditBrandName("");
                          setExplicitlyClosing(true);
                          setBrandDropdownOpen(false);
                        }}
                        className="hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={editBrandName}
                        onChange={(e) => setEditBrandName(e.target.value)}
                        placeholder="Enter brand name"
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleEditBrand();
                          }
                          e.stopPropagation();
                        }}
                        onFocus={(e) => e.stopPropagation()}
                      />
                      <Button type="button" onClick={handleEditBrand} size="sm">
                        <Edit2 className="h-4 w-4 mr-1" />
                        Update
                      </Button>
                    </div>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cutting Styles */}
        <div className="lg:col-span-2">
          <Label className="text-base font-semibold">
            Cutting Styles
            <span className="text-xs text-muted-foreground ml-2">(for meat/fish products)</span>
          </Label>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3">
            Select the cutting styles available for this product
          </p>
          
          {isLoadingCuttingStyles ? (
            <div className="text-sm text-muted-foreground">Loading cutting styles...</div>
          ) : (
            <div className="space-y-3">
              {/* Cutting Styles Checkboxes */}
              <div className="flex flex-wrap gap-3">
                {cuttingStyles.map((style) => (
                  <div key={style.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cutting-style-${style.id}`}
                      checked={(formData.cuttingStyles || []).includes(style.id)}
                      onCheckedChange={(checked) => handleCuttingStyleToggle(style.id, checked as boolean)}
                    />
                    <Label
                      htmlFor={`cutting-style-${style.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {style.name}
                    </Label>
                  </div>
                ))}
              </div>

              {/* Add New Cutting Style */}
              {!showAddCuttingStyle ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCuttingStyle(true)}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add New Cutting Style
                </Button>
              ) : (
                <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Input
                    value={newCuttingStyleName}
                    onChange={(e) => setNewCuttingStyleName(e.target.value)}
                    placeholder="Enter cutting style name"
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCuttingStyle();
                      }
                      if (e.key === "Escape") {
                        setShowAddCuttingStyle(false);
                        setNewCuttingStyleName("");
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddCuttingStyle} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddCuttingStyle(false);
                      setNewCuttingStyleName("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Selected Count */}
              {(formData.cuttingStyles || []).length > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  {(formData.cuttingStyles || []).length} cutting style(s) selected
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Short Description */}
      <div className="lg:col-span-2">
        <Label htmlFor="shortDescription" className="text-sm sm:text-base">
          Short Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="shortDescription"
          value={formData.shortDescription}
          onChange={(e) => onChange("shortDescription", e.target.value)}
          placeholder="Enter a brief description of the product"
          className="mt-2 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
        />
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          This will be displayed on product listing cards
        </p>
      </div>
    </div>
  );
}
