"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import FileUpload from "@/components/ui/file-upload";
import {
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
  const [formData, setFormData] = React.useState({
    categoryName: "",
    sortOrder: 0,
    // Category SEO
    categoryMetaTitle: "",
    categoryMetaDescription: "",
    categoryMetaKeywords: "",
    categoryIsActive: true,
  });
  const [categoryImage, setCategoryImage] = React.useState<File | null>(null);
  const [existingCategoryImage, setExistingCategoryImage] =
    React.useState<string>("");

  // SEO state management
  const [categorySEOGenerated, setCategorySEOGenerated] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // If editing, fetch category data
        if (id) {
          const categoryResponse = await categoryService.getCategoryById(id);
          const data = categoryResponse.data;

          setFormData({
            categoryName: data.categoryName || "",
            sortOrder: data.sortOrder ?? 0,
            categoryMetaTitle: data.categoryMetaTitle || "",
            categoryMetaDescription: data.categoryMetaDescription || "",
            categoryMetaKeywords: data.categoryMetaKeywords || "",
            categoryIsActive: data.categoryIsActive ?? true,
          });

          // Set existing image URLs
          setExistingCategoryImage(data.categoryImage || "");
        }
      } catch (error) {
        toast.error("Failed to load category data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Enhanced SEO Management Functions
  const handleGenerateEnhancedSEO = async () => {
    const { categoryName } = formData;
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

      // Generate category SEO
      const response = await categoryService.generateEnhancedSEO(
        categoryName,
        undefined,
        currentCompanyName
      );

      // Fill category SEO fields
      setFormData((prev) => ({
        ...prev,
        categoryMetaTitle: response.data.category.categoryMetaTitle || "",
        categoryMetaDescription:
          response.data.category.categoryMetaDescription || "",
        categoryMetaKeywords:
          response.data.category.categoryMetaKeywords || "",
      }));

      setCategorySEOGenerated(true);

      const detectedCompanyName =
        response.data.detectedCompanyName || currentCompanyName;
      toast.success(
        `Enhanced SEO content generated successfully using "${detectedCompanyName}". Click 'Save' to save all data.`
      );
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

  const validateForm = () => {
    return formData.categoryName.trim() !== "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please enter a category name");
      return;
    }

    setIsLoading(true);

    try {
      const submitData: CategoryFormData = {
        categoryName: formData.categoryName,
        sortOrder: formData.sortOrder,
        subcategoryName: "", // Subcategories managed separately
        categoryMetaTitle: formData.categoryMetaTitle,
        categoryMetaDescription: formData.categoryMetaDescription,
        categoryMetaKeywords: formData.categoryMetaKeywords,
        categoryIsActive: formData.categoryIsActive,
        subcategoryIsActive: true,
      };

      if (id) {
        // Update existing category
        await categoryService.updateCategory(
          id,
          submitData,
          categoryImage || undefined
        );
        toast.success("Category updated successfully");
      } else {
        // Create new category
        // We use createCategory which handles both data and image in one multipart request
        await categoryService.createCategory(
            submitData,
            categoryImage || undefined
        );
        toast.success("Category created successfully");
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
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="categoryName" className="text-base font-semibold">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="categoryName"
                value={formData.categoryName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    categoryName: e.target.value,
                  }))
                }
                placeholder="Enter category name"
                className="mt-2"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="sortOrder" className="text-base font-semibold">
                Sort Order
              </Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sortOrder: parseInt(e.target.value) || 0,
                  }))
                }
                placeholder="Enter sort order (0 = first)"
                className="mt-2"
                disabled={isLoading}
                min="0"
              />
              <p className="text-sm text-gray-500 mt-1">
                Lower numbers appear first in the list
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div>
              <Label className="text-base font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Category Image
              </Label>
              <div className="mt-2">
                <FileUpload
                  onUploadSuccess={(file) => setCategoryImage(file)}
                  onUploadError={(error) => toast.error(error.message)}
                  acceptedFileTypes={["image/jpeg", "image/png", "image/webp"]}
                  maxFileSize={5 * 1024 * 1024}
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
          </div>

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

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                Category SEO Settings
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearCategorySEO}
                className="h-7 sm:h-8 px-2 sm:px-3 cursor-pointer text-xs text-red-600 hover:text-red-700"
              >
                <Eraser className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>

            <div className="space-y-4">
                <div>
                    <Label htmlFor="categoryMetaTitle" className="text-sm sm:text-base font-semibold">Category Meta Title</Label>
                    <Input
                        id="categoryMetaTitle"
                        value={formData.categoryMetaTitle}
                        onChange={(e) => setFormData((prev) => ({ ...prev, categoryMetaTitle: e.target.value }))}
                        className="mt-2"
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <Label htmlFor="categoryMetaDescription" className="text-sm sm:text-base font-semibold">Category Meta Description</Label>
                    <Textarea
                        id="categoryMetaDescription"
                        value={formData.categoryMetaDescription}
                        onChange={(e) => setFormData((prev) => ({ ...prev, categoryMetaDescription: e.target.value }))}
                        className="mt-2"
                        disabled={isLoading}
                        rows={3}
                    />
                </div>

                <div>
                    <Label htmlFor="categoryMetaKeywords" className="text-sm sm:text-base font-semibold">Category Meta Keywords</Label>
                    <Input
                        id="categoryMetaKeywords"
                        value={formData.categoryMetaKeywords}
                        onChange={(e) => setFormData((prev) => ({ ...prev, categoryMetaKeywords: e.target.value }))}
                        className="mt-2"
                        disabled={isLoading}
                    />
                </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm sm:text-base font-semibold">Category Status</Label>
              <Button
                type="button"
                variant={formData.categoryIsActive ? "default" : "outline"}
                onClick={() => setFormData((prev) => ({ ...prev, categoryIsActive: !prev.categoryIsActive }))}
                className={formData.categoryIsActive ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                {formData.categoryIsActive ? "Active" : "Inactive"}
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/products-list/category-list")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : id ? "Update Category" : "Save Category"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};