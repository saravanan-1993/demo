"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import FileUpload from "@/components/ui/file-upload";
import {
  Edit2,
  Plus,
  X,
  Image as ImageIcon,
  Eraser,
  Sparkles,
} from "lucide-react";
import { categoryService, CategoryFormData } from "@/services/online-services/categoryService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCompanyContext } from "@/components/providers/company-provider";
import { useAuthContext } from "@/components/providers/auth-provider";
import { IoIosArrowRoundBack } from "react-icons/io";

export const CategoryForm = ({ id }: { id?: string }) => {
  const router = useRouter();
  const { getCompanyName } = useCompanyContext();
  const { getCompanyName: authGetCompanyName, refreshUserData } =
    useAuthContext();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormSubmitted, setIsFormSubmitted] = React.useState(false);
  const [categories, setCategories] = React.useState<
    { _id: string; name: string }[]
  >([]);

  const [formData, setFormData] = React.useState({
    categoryName: "",
    subcategoryName: "",
    // Category SEO
    categoryMetaTitle: "",
    categoryMetaDescription: "",
    categoryMetaKeywords: "",
    // Subcategory SEO
    subcategoryMetaTitle: "",
    subcategoryMetaDescription: "",
    subcategoryMetaKeywords: "",
    categoryIsActive: true,
    subcategoryIsActive: true,
  });
  const [categoryImage, setCategoryImage] = React.useState<File | null>(null);
  const [subcategoryImage, setSubcategoryImage] = React.useState<File | null>(
    null
  );
  const [existingCategoryImage, setExistingCategoryImage] =
    React.useState<string>("");
  const [existingSubcategoryImage, setExistingSubcategoryImage] =
    React.useState<string>("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = React.useState(false);
  const [showAddCategory, setShowAddCategory] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [editingCategory, setEditingCategory] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editCategoryName, setEditCategoryName] = React.useState("");
  const [explicitlyClosing, setExplicitlyClosing] = React.useState(false);

  // SEO state management
  const [categorySEOGenerated, setCategorySEOGenerated] = React.useState(false);
  const [subcategorySEOGenerated, setSubcategorySEOGenerated] =
    React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch category names for dropdown
        const categoryNamesResponse = await categoryService.getCategoryNames();
        setCategories(categoryNamesResponse.data);

        // If editing, fetch category data
        if (id) {
          const categoryResponse = await categoryService.getCategoryById(id);
          const data = categoryResponse.data;

          setFormData({
            categoryName: data.categoryName || "",
            subcategoryName: data.subcategoryName || "",
            categoryMetaTitle: data.categoryMetaTitle || "",
            categoryMetaDescription: data.categoryMetaDescription || "",
            categoryMetaKeywords: data.categoryMetaKeywords || "",
            subcategoryMetaTitle: data.subcategoryMetaTitle || "",
            subcategoryMetaDescription: data.subcategoryMetaDescription || "",
            subcategoryMetaKeywords: data.subcategoryMetaKeywords || "",
            categoryIsActive: data.categoryIsActive ?? true,
            subcategoryIsActive: data.subcategoryIsActive ?? true,
          });

          // Set existing image URLs
          setExistingCategoryImage(data.categoryImage || "");
          setExistingSubcategoryImage(data.subcategoryImage || "");
        }
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      // Create category in database with minimal data
      const response = await categoryService.createCategoryOnly({
        categoryName: newCategoryName.trim(),
      });

      // Add to local state for dropdown
      const newCategory = {
        _id: response.data.id,
        name: newCategoryName.trim(),
      };
      setCategories((prev) => [...prev, newCategory]);

      // Set as selected category
      setFormData((prev) => ({
        ...prev,
        categoryName: newCategoryName.trim(),
      }));

      setNewCategoryName("");
      setShowAddCategory(false);
      setCategoryDropdownOpen(false);
      setExplicitlyClosing(true);

      toast.success("Category created successfully");
    } catch (error) {
      toast.error("Failed to create category");
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) return;

    try {
      // Update category name in database
      await categoryService.updateCategoryName(
        editingCategory.id,
        editCategoryName.trim()
      );

      // Update local state
      setCategories((prev) =>
        prev.map((cat) =>
          cat._id === editingCategory.id
            ? { ...cat, name: editCategoryName.trim() }
            : cat
        )
      );

      // If the edited category is currently selected, update the form data
      if (formData.categoryName === editingCategory.name) {
        setFormData((prev) => ({
          ...prev,
          categoryName: editCategoryName.trim(),
        }));
      }

      setEditingCategory(null);
      setEditCategoryName("");
      setCategoryDropdownOpen(false);
      setExplicitlyClosing(true);

      toast.success("Category name updated successfully");
    } catch (error) {
      toast.error("Failed to update category name");
    }
  };

  const handleCancelAdd = () => {
    setShowAddCategory(false);
    setNewCategoryName("");
    setExplicitlyClosing(true);
    setCategoryDropdownOpen(false);
  };

  // Fetch category SEO data when category is selected
  const fetchCategorySEOData = async (categoryName: string) => {
    try {
      // Clear previous category data first
      setExistingCategoryImage("");
      setCategoryImage(null);
      setFormData((prev) => ({
        ...prev,
        categoryMetaTitle: "",
        categoryMetaDescription: "",
        categoryMetaKeywords: "",
      }));
      setCategorySEOGenerated(false);

      const response = await categoryService.getCategoryByName(categoryName);
      const data = response.data;

      // Fill category SEO fields if data exists
      if (
        data.categoryMetaTitle ||
        data.categoryMetaDescription ||
        data.categoryMetaKeywords
      ) {
        setFormData((prev) => ({
          ...prev,
          categoryMetaTitle: data.categoryMetaTitle || "",
          categoryMetaDescription: data.categoryMetaDescription || "",
          categoryMetaKeywords: data.categoryMetaKeywords || "",
        }));
        setCategorySEOGenerated(true);
      }

      // Set existing category image if available
      if (data.categoryImage) {
        setExistingCategoryImage(data.categoryImage);
      }
    } catch (error) {
      // Category doesn't exist or has no SEO data - this is normal for new categories
      console.log("No existing SEO data for category:", categoryName);
      // Ensure fields are cleared even if API call fails
      setExistingCategoryImage("");
      setCategoryImage(null);
    }
  };

  // Enhanced SEO Management Functions
  const handleGenerateEnhancedSEO = async () => {
    const { categoryName, subcategoryName } = formData;
    if (!categoryName) {
      toast.error("Please enter a category name first");
      return;
    }

    try {
      // Refresh user data first to get latest company name
      await refreshUserData();

      // Try to get company name from auth provider first, then company provider
      const authCompanyName = authGetCompanyName();
      const providerCompanyName = getCompanyName();
      const currentCompanyName =
        authCompanyName && authCompanyName !== "Your Company"
          ? authCompanyName
          : providerCompanyName || "Your Company";

      console.log("Company name sources:", {
        authCompanyName,
        providerCompanyName,
        currentCompanyName,
      });

      // Check if category SEO already exists and is filled
      const hasCategorySEO =
        formData.categoryMetaTitle ||
        formData.categoryMetaDescription ||
        formData.categoryMetaKeywords;

      if (hasCategorySEO && subcategoryName) {
        // Only generate subcategory SEO if category SEO exists and subcategory is provided
        const response = await categoryService.generateEnhancedSEO(
          categoryName,
          subcategoryName,
          currentCompanyName
        );

        // Only fill subcategory SEO fields, keep existing category SEO
        setFormData((prev) => ({
          ...prev,
          subcategoryMetaTitle:
            response.data.subcategory?.subcategoryMetaTitle || "",
          subcategoryMetaDescription:
            response.data.subcategory?.subcategoryMetaDescription || "",
          subcategoryMetaKeywords:
            response.data.subcategory?.subcategoryMetaKeywords || "",
        }));

        setSubcategorySEOGenerated(true);
        toast.success("Subcategory SEO content generated successfully!");
      } else {
        // Generate both category and subcategory SEO
        const response = await categoryService.generateEnhancedSEO(
          categoryName,
          subcategoryName || undefined,
          currentCompanyName
        );

        // Fill both category and subcategory SEO fields
        setFormData((prev) => ({
          ...prev,
          categoryMetaTitle: response.data.category.categoryMetaTitle || "",
          categoryMetaDescription:
            response.data.category.categoryMetaDescription || "",
          categoryMetaKeywords:
            response.data.category.categoryMetaKeywords || "",
          subcategoryMetaTitle:
            response.data.subcategory?.subcategoryMetaTitle || "",
          subcategoryMetaDescription:
            response.data.subcategory?.subcategoryMetaDescription || "",
          subcategoryMetaKeywords:
            response.data.subcategory?.subcategoryMetaKeywords || "",
        }));

        setCategorySEOGenerated(true);
        if (subcategoryName && response.data.subcategory) {
          setSubcategorySEOGenerated(true);
        }

        const detectedCompanyName =
          response.data.detectedCompanyName || currentCompanyName;
        toast.success(
          `Enhanced SEO content generated successfully using "${detectedCompanyName}". Click 'Create' to save all data.`
        );
      }
    } catch (error) {
      console.error("Error generating enhanced SEO:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate enhanced SEO content";
      toast.error(errorMessage);
    }
  };

  const handleClearCategorySEO = () => {
    setFormData((prev) => ({
      ...prev,
      categoryMetaTitle: "",
      categoryMetaDescription: "",
      categoryMetaKeywords: "",
    }));
    setCategorySEOGenerated(false);
  };

  const handleClearSubcategorySEO = () => {
    setFormData((prev) => ({
      ...prev,
      subcategoryMetaTitle: "",
      subcategoryMetaDescription: "",
      subcategoryMetaKeywords: "",
    }));
    setSubcategorySEOGenerated(false);
  };

  const validateForm = () => {
    // Allow saving with just category name for initial save
    return formData.categoryName.trim() !== "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);

    if (!validateForm()) {
      toast.error("Please enter a category name");
      return;
    }

    setIsLoading(true);

    try {
      const hasSubcategory = formData.subcategoryName.trim() !== "";

      if (id) {
        // Update existing category
        const submitData: CategoryFormData = {
          categoryName: formData.categoryName,
          subcategoryName: formData.subcategoryName,
          categoryMetaTitle: formData.categoryMetaTitle,
          categoryMetaDescription: formData.categoryMetaDescription,
          categoryMetaKeywords: formData.categoryMetaKeywords,
          subcategoryMetaTitle: formData.subcategoryMetaTitle,
          subcategoryMetaDescription: formData.subcategoryMetaDescription,
          subcategoryMetaKeywords: formData.subcategoryMetaKeywords,
          categoryIsActive: formData.categoryIsActive,
          subcategoryIsActive: formData.subcategoryIsActive,
        };

        await categoryService.updateCategory(
          id,
          submitData,
          categoryImage || undefined,
          subcategoryImage || undefined
        );
        toast.success("Category updated successfully");
      } else {
        if (hasSubcategory) {
          // Create complete category with subcategory
          const submitData: CategoryFormData = {
            categoryName: formData.categoryName,
            subcategoryName: formData.subcategoryName,
            categoryMetaTitle: formData.categoryMetaTitle,
            categoryMetaDescription: formData.categoryMetaDescription,
            categoryMetaKeywords: formData.categoryMetaKeywords,
            subcategoryMetaTitle: formData.subcategoryMetaTitle,
            subcategoryMetaDescription: formData.subcategoryMetaDescription,
            subcategoryMetaKeywords: formData.subcategoryMetaKeywords,
            categoryIsActive: formData.categoryIsActive,
            subcategoryIsActive: formData.subcategoryIsActive,
          };

          await categoryService.createCategory(
            submitData,
            categoryImage || undefined,
            subcategoryImage || undefined
          );
          toast.success("Category and subcategory created successfully");
        } else {
          // Check if we have SEO data or images to save for existing category
          const hasCategorySEOData =
            formData.categoryMetaTitle ||
            formData.categoryMetaDescription ||
            formData.categoryMetaKeywords;
          const hasCategoryImage = categoryImage;

          if (hasCategorySEOData || hasCategoryImage) {
            // First ensure category exists and get its ID
            const categoryResponse = await categoryService.createCategoryOnly({
              categoryName: formData.categoryName,
            });

            // Get the category ID from the response
            const categoryId = categoryResponse.data.id;

            // Update existing category with SEO data and/or image
            const submitData: CategoryFormData = {
              categoryName: formData.categoryName,
              subcategoryName: "", // Empty subcategory for category-only update
              categoryMetaTitle: formData.categoryMetaTitle,
              categoryMetaDescription: formData.categoryMetaDescription,
              categoryMetaKeywords: formData.categoryMetaKeywords,
              subcategoryMetaTitle: "",
              subcategoryMetaDescription: "",
              subcategoryMetaKeywords: "",
              categoryIsActive: formData.categoryIsActive,
              subcategoryIsActive: true,
            };

            // Update with SEO data and images using the category ID
            await categoryService.updateCategory(
              categoryId, // Use actual category ID
              submitData,
              categoryImage || undefined,
              undefined // No subcategory image
            );

            toast.success(
              "Category updated with SEO data and images successfully"
            );
          } else {
            // Create category only with minimal data
            await categoryService.createCategoryOnly({
              categoryName: formData.categoryName,
            });
            toast.success(
              "Category created successfully. You can now add subcategories and images."
            );
          }

          // Don't redirect, allow user to continue adding subcategory
          setIsLoading(false);
          return;
        }
      }

      // Redirect back to category list
      router.push("/dashboard/products-list/category-list");
    } catch (error: unknown) {
      if (error instanceof Error) {
        const apiError = error as {
          response?: { data?: { message?: string } };
        };
        toast.error(
          apiError.response?.data?.message ||
            error.message ||
            "Failed to save category"
        );
      } else {
        toast.error("Failed to save category");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <Card className="p-4 sm:p-6">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              // Navigate back to category list
              router.push("/dashboard/products-list/category-list");
            }}
            className="cursor-pointer w-full sm:w-auto"
          >
             <IoIosArrowRoundBack className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            {id ? "Edit Category" : "Create Category"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="relative">
              <Label className="text-base font-semibold">
                Category <span className="text-red-500">*</span>
              </Label>
              <div className="mt-2 space-y-2">
                <Select
                  value={formData.categoryName}
                  onValueChange={(value) => {
                    if (value === "add_new_category") {
                      setEditingCategory(null);
                      setEditCategoryName("");
                      setShowAddCategory(true);
                      setNewCategoryName("");
                      setCategoryDropdownOpen(true);
                    } else {
                      // Clear all form data when switching categories
                      setFormData((prev) => ({
                        ...prev,
                        categoryName: value,
                        subcategoryName: "",
                        subcategoryMetaTitle: "",
                        subcategoryMetaDescription: "",
                        subcategoryMetaKeywords: "",
                      }));
                      setCategoryDropdownOpen(false);
                      // Reset SEO generation state when category changes
                      setCategorySEOGenerated(false);
                      setSubcategorySEOGenerated(false);
                      // Clear subcategory image data
                      setExistingSubcategoryImage("");
                      setSubcategoryImage(null);
                      // Fetch and fill category SEO data if exists
                      fetchCategorySEOData(value);
                    }
                  }}
                  open={categoryDropdownOpen}
                  onOpenChange={(open) => {
                    if (
                      !open &&
                      (editingCategory || showAddCategory) &&
                      !explicitlyClosing
                    ) {
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
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="z-50" data-no-search="true">
                    {categories.map((category) => (
                      <div
                        key={category._id}
                        className="flex items-center justify-between group"
                      >
                        <SelectItem
                          value={category.name}
                          className="flex-1 cursor-pointer "
                        >
                          {category.name}
                        </SelectItem>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6  cursor-pointer p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAddCategory(false);
                              setNewCategoryName("");
                              setEditingCategory({
                                id: category._id,
                                name: category.name,
                              });
                              setEditCategoryName(category.name);
                              setCategoryDropdownOpen(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

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
                            className="hover:bg-gray-200 cursor-pointer  dark:hover:bg-gray-700"
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
                            onFocus={(e) => {
                              e.stopPropagation();
                            }}
                          />
                          <Button
                            type="button"
                            onClick={handleAddCategory}
                            size="sm"
                            className=" cursor-pointer "
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
                            onChange={(e) =>
                              setEditCategoryName(e.target.value)
                            }
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
                            onFocus={(e) => {
                              e.stopPropagation();
                            }}
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
              </div>
            </div>

            <div>
              <Label htmlFor="subcategory" className="text-base font-semibold">
                Subcategory <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subcategory"
                value={formData.subcategoryName}
                onChange={(e) => {
                  setFormData({ ...formData, subcategoryName: e.target.value });
                  // Reset subcategory SEO generation state when subcategory changes
                  setSubcategorySEOGenerated(false);
                }}
                placeholder="Enter subcategory name"
                className={`mt-2  ${
                  isFormSubmitted && !formData.subcategoryName
                    ? "ring-1 ring-red-500 focus:ring-2 focus:ring-red-500"
                    : ""
                }`}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label className="text-base font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Category Image
              </Label>
              <div className="mt-2">
                <FileUpload
                  onUploadSuccess={(file) => setCategoryImage(file)}
                  onUploadError={(error) => {
                    if (error.code === "FILE_TOO_LARGE") {
                      toast.error(
                        "Category image file size exceeds 5 MB. Please choose a smaller file."
                      );
                    } else {
                      toast.error(
                        error.message || "Failed to upload category image"
                      );
                    }
                  }}
                  acceptedFileTypes={["image/jpeg", "image/png", "image/webp"]}
                  maxFileSize={5 * 1024 * 1024} // 5MB
                  currentFile={categoryImage}
                  existingImageUrl={existingCategoryImage}
                  onFileRemove={() => {
                    setCategoryImage(null);
                    setExistingCategoryImage("");
                  }}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Subcategory Image
              </Label>
              <div className="mt-2">
                <FileUpload
                  onUploadSuccess={(file) => setSubcategoryImage(file)}
                  onUploadError={(error) => {
                    if (error.code === "FILE_TOO_LARGE") {
                      toast.error(
                        "Subcategory image file size exceeds 5 MB. Please choose a smaller file."
                      );
                    } else {
                      toast.error(
                        error.message || "Failed to upload subcategory image"
                      );
                    }
                  }}
                  acceptedFileTypes={["image/jpeg", "image/png", "image/webp"]}
                  maxFileSize={5 * 1024 * 1024} // 5MB
                  currentFile={subcategoryImage}
                  existingImageUrl={existingSubcategoryImage}
                  onFileRemove={() => {
                    setSubcategoryImage(null);
                    setExistingSubcategoryImage("");
                  }}
                  className="w-full "
                />
              </div>
            </div>
          </div>

          {/* Enhanced SEO Generation */}
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-center sm:justify-end mb-3">
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleGenerateEnhancedSEO();
                }}
                disabled={!formData.categoryName}
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white cursor-pointer shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Premium SEO
              </Button>
            </div>
          </div>

          {/* Category SEO Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Category SEO Settings
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearCategorySEO}
                    className="h-7 sm:h-8 px-2 sm:px-3 cursor-pointer text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Eraser className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                </div>
              </div>

              <div>
                <Label
                  htmlFor="categoryMetaTitle"
                  className="text-sm sm:text-base font-semibold flex items-center justify-between"
                >
                  <span>Category Meta Title</span>
                  <span
                    className={`text-xs ${
                      formData.categoryMetaTitle.length > 60
                        ? "text-red-500"
                        : formData.categoryMetaTitle.length > 50
                        ? "text-yellow-500"
                        : "text-green-500"
                    }`}
                  >
                    {formData.categoryMetaTitle.length}/60
                  </span>
                </Label>
                <Input
                  id="categoryMetaTitle"
                  value={formData.categoryMetaTitle}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      categoryMetaTitle: e.target.value,
                    }))
                  }
                  placeholder="Premium [Category] Collection | Your Company"
                  className={`mt-2 text-sm sm:text-base ${
                    formData.categoryMetaTitle.length > 60
                      ? "border-red-500"
                      : ""
                  }`}
                  disabled={isLoading}
                />
                {formData.categoryMetaTitle.length > 60 && (
                  <p className="text-xs text-red-500 mt-1">
                    Title should be under 60 characters for optimal SEO
                  </p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="categoryMetaDescription"
                  className="text-sm sm:text-base font-semibold flex items-center justify-between"
                >
                  <span>Category Meta Description</span>
                  <span
                    className={`text-xs ${
                      formData.categoryMetaDescription.length > 160
                        ? "text-red-500"
                        : formData.categoryMetaDescription.length < 140
                        ? "text-yellow-500"
                        : "text-green-500"
                    }`}
                  >
                    {formData.categoryMetaDescription.length}/160
                  </span>
                </Label>
                <Textarea
                  id="categoryMetaDescription"
                  value={formData.categoryMetaDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      categoryMetaDescription: e.target.value,
                    }))
                  }
                  placeholder="Shop premium [category] products. Top quality, competitive prices & fast delivery!"
                  className={`mt-2 ${
                    formData.categoryMetaDescription.length > 160
                      ? "border-red-500"
                      : ""
                  }`}
                  rows={2}
                  disabled={isLoading}
                />
                {formData.categoryMetaDescription.length > 160 && (
                  <p className="text-xs text-red-500 mt-1">
                    Description should be under 160 characters for optimal SEO
                  </p>
                )}
                {formData.categoryMetaDescription.length < 140 &&
                  formData.categoryMetaDescription.length > 0 && (
                    <p className="text-xs text-yellow-500 mt-1">
                      Consider adding more content (140-160 characters is
                      optimal)
                    </p>
                  )}
              </div>

              <div>
                <Label
                  htmlFor="categoryMetaKeywords"
                  className="text-sm sm:text-base font-semibold flex items-center justify-between"
                >
                  <span>Category Meta Keywords</span>
                  <span
                    className={`text-xs ${
                      formData.categoryMetaKeywords
                        .split(",")
                        .filter((k) => k.trim()).length > 12
                        ? "text-red-500"
                        : formData.categoryMetaKeywords
                            .split(",")
                            .filter((k) => k.trim()).length < 8 &&
                          formData.categoryMetaKeywords.trim()
                        ? "text-yellow-500"
                        : "text-green-500"
                    }`}
                  >
                    {
                      formData.categoryMetaKeywords
                        .split(",")
                        .filter((k) => k.trim()).length
                    }{" "}
                    keywords
                  </span>
                </Label>
                <Input
                  id="categoryMetaKeywords"
                  value={formData.categoryMetaKeywords}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      categoryMetaKeywords: e.target.value,
                    }))
                  }
                  placeholder="premium category, buy category, category online, quality category, category store"
                  className="mt-2"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optimal: 8-12 keywords separated by commas
                </p>
              </div>
            </div>

            {/* Subcategory SEO Settings */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Subcategory SEO Settings
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearSubcategorySEO}
                    className="h-7 sm:h-8 px-2 sm:px-3 cursor-pointer text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Eraser className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                </div>
              </div>

              <div>
                <Label
                  htmlFor="subcategoryMetaTitle"
                  className="text-sm sm:text-base font-semibold flex items-center justify-between"
                >
                  <span>Subcategory Meta Title</span>
                  <span
                    className={`text-xs ${
                      formData.subcategoryMetaTitle.length > 60
                        ? "text-red-500"
                        : formData.subcategoryMetaTitle.length > 50
                        ? "text-yellow-500"
                        : "text-green-500"
                    }`}
                  >
                    {formData.subcategoryMetaTitle.length}/60
                  </span>
                </Label>
                <Input
                  id="subcategoryMetaTitle"
                  value={formData.subcategoryMetaTitle}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      subcategoryMetaTitle: e.target.value,
                    }))
                  }
                  placeholder="Premium [Subcategory] [Category] | Your Company"
                  className={`mt-2 ${
                    formData.subcategoryMetaTitle.length > 60
                      ? "border-red-500"
                      : ""
                  }`}
                  disabled={isLoading}
                />
                {formData.subcategoryMetaTitle.length > 60 && (
                  <p className="text-xs text-red-500 mt-1">
                    Title should be under 60 characters for optimal SEO
                  </p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="subcategoryMetaDescription"
                  className="text-sm sm:text-base font-semibold flex items-center justify-between"
                >
                  <span>Subcategory Meta Description</span>
                  <span
                    className={`text-xs ${
                      formData.subcategoryMetaDescription.length > 160
                        ? "text-red-500"
                        : formData.subcategoryMetaDescription.length < 140
                        ? "text-yellow-500"
                        : "text-green-500"
                    }`}
                  >
                    {formData.subcategoryMetaDescription.length}/160
                  </span>
                </Label>
                <Textarea
                  id="subcategoryMetaDescription"
                  value={formData.subcategoryMetaDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      subcategoryMetaDescription: e.target.value,
                    }))
                  }
                  placeholder="Discover premium [subcategory] in [category]. Top quality, competitive prices & fast delivery!"
                  className={`mt-2 ${
                    formData.subcategoryMetaDescription.length > 160
                      ? "border-red-500"
                      : ""
                  }`}
                  rows={2}
                  disabled={isLoading}
                />
                {formData.subcategoryMetaDescription.length > 160 && (
                  <p className="text-xs text-red-500 mt-1">
                    Description should be under 160 characters for optimal SEO
                  </p>
                )}
                {formData.subcategoryMetaDescription.length < 140 &&
                  formData.subcategoryMetaDescription.length > 0 && (
                    <p className="text-xs text-yellow-500 mt-1">
                      Consider adding more content (140-160 characters is
                      optimal)
                    </p>
                  )}
              </div>

              <div>
                <Label
                  htmlFor="subcategoryMetaKeywords"
                  className="text-sm sm:text-base font-semibold flex items-center justify-between"
                >
                  <span>Subcategory Meta Keywords</span>
                  <span
                    className={`text-xs ${
                      formData.subcategoryMetaKeywords
                        .split(",")
                        .filter((k) => k.trim()).length > 12
                        ? "text-red-500"
                        : formData.subcategoryMetaKeywords
                            .split(",")
                            .filter((k) => k.trim()).length < 8 &&
                          formData.subcategoryMetaKeywords.trim()
                        ? "text-yellow-500"
                        : "text-green-500"
                    }`}
                  >
                    {
                      formData.subcategoryMetaKeywords
                        .split(",")
                        .filter((k) => k.trim()).length
                    }{" "}
                    keywords
                  </span>
                </Label>
                <Input
                  id="subcategoryMetaKeywords"
                  value={formData.subcategoryMetaKeywords}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      subcategoryMetaKeywords: e.target.value,
                    }))
                  }
                  placeholder="premium subcategory, buy subcategory, subcategory online, quality subcategory"
                  className="mt-2"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optimal: 8-12 keywords separated by commas
                </p>
              </div>
            </div>
          </div>

          {/* Status Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label className="text-sm sm:text-base font-semibold">Category Status</Label>
              <div className="mt-2">
                <Button
                  type="button"
                  variant={formData.categoryIsActive ? "default" : "outline"}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      categoryIsActive: !prev.categoryIsActive,
                    }))
                  }
                  className={`w-full sm:w-auto cursor-pointer ${
                    formData.categoryIsActive
                      ? "bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600"
                      : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {formData.categoryIsActive ? "Active" : "Inactive"}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm sm:text-base font-semibold">
                Subcategory Status
              </Label>
              <div className="mt-2">
                <Button
                  type="button"
                  variant={formData.subcategoryIsActive ? "default" : "outline"}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      subcategoryIsActive: !prev.subcategoryIsActive,
                    }))
                  }
                  className={`w-full sm:w-auto cursor-pointer ${
                    formData.subcategoryIsActive
                      ? "bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600"
                      : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {formData.subcategoryIsActive ? "Active" : "Inactive"}
                </Button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // Navigate back to category list
                router.push("/dashboard/products-list/category-list");
              }}
              className="cursor-pointer w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="cursor-pointer w-full sm:w-auto"
            >
              {isLoading
                ? "Saving..."
                : id
                ? "Update"
                : formData.subcategoryName.trim()
                ? "Create Category & Subcategory"
                : "Save Category"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};