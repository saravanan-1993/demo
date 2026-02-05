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
  X,
  Sparkles,
  Eraser,
} from "lucide-react";
import { categoryService, CategoryFormData } from "@/services/online-services/categoryService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCompanyContext } from "@/components/providers/company-provider";
import { useAuthContext } from "@/components/providers/auth-provider";
import { IoIosArrowRoundBack } from "react-icons/io";

export const SubcategoryForm = ({ id }: { id?: string }) => {
  const router = useRouter();
  const { getCompanyName } = useCompanyContext();
  const { getCompanyName: authGetCompanyName, refreshUserData } =
    useAuthContext();
  const [isLoading, setIsLoading] = React.useState(false);
  const [categories, setCategories] = React.useState<{ _id: string; name: string }[]>([]);
  const [formData, setFormData] = React.useState({
    categoryName: "",
    subcategoryName: "",
    subcategoryMetaTitle: "",
    subcategoryMetaDescription: "",
    subcategoryMetaKeywords: "",
    subcategoryIsActive: true,
  });
  const [subcategoryImage, setSubcategoryImage] = React.useState<File | null>(null);
  const [existingSubcategoryImage, setExistingSubcategoryImage] = React.useState<string>("");

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const categoryNamesResponse = await categoryService.getCategoryNames();
        setCategories(categoryNamesResponse.data);

        if (id) {
          const categoryResponse = await categoryService.getCategoryById(id);
          const data = categoryResponse.data;
          setFormData({
            categoryName: data.categoryName || "",
            subcategoryName: data.subcategoryName || "",
            subcategoryMetaTitle: data.subcategoryMetaTitle || "",
            subcategoryMetaDescription: data.subcategoryMetaDescription || "",
            subcategoryMetaKeywords: data.subcategoryMetaKeywords || "",
            subcategoryIsActive: data.subcategoryIsActive ?? true,
          });
          setExistingSubcategoryImage(data.subcategoryImage || "");
        }
      } catch (error) {
        toast.error("Failed to load subcategory data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleGenerateSEO = async () => {
    if (!formData.categoryName || !formData.subcategoryName) {
      toast.error("Please select a category and enter a subcategory name");
      return;
    }

    try {
      await refreshUserData();
      const currentCompanyName = authGetCompanyName() || getCompanyName() || "Your Company";
      
      const response = await categoryService.generateEnhancedSEO(
        formData.categoryName,
        formData.subcategoryName,
        currentCompanyName
      );

      setFormData(prev => ({
        ...prev,
        subcategoryMetaTitle: response.data.subcategory?.subcategoryMetaTitle || "",
        subcategoryMetaDescription: response.data.subcategory?.subcategoryMetaDescription || "",
        subcategoryMetaKeywords: response.data.subcategory?.subcategoryMetaKeywords || "",
      }));
      toast.success("SEO content generated successfully");
    } catch (error) {
      toast.error("Failed to generate SEO content");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryName || !formData.subcategoryName) {
      toast.error("Category and Subcategory name are required");
      return;
    }

    setIsLoading(true);
    try {
      const submitData: CategoryFormData = {
        categoryName: formData.categoryName,
        subcategoryName: formData.subcategoryName,
        categoryMetaTitle: "", // Not used in subcategory form
        categoryMetaDescription: "",
        categoryMetaKeywords: "",
        subcategoryMetaTitle: formData.subcategoryMetaTitle,
        subcategoryMetaDescription: formData.subcategoryMetaDescription,
        subcategoryMetaKeywords: formData.subcategoryMetaKeywords,
        categoryIsActive: true, // Keep parent active
        subcategoryIsActive: formData.subcategoryIsActive,
      };

      if (id) {
        await categoryService.updateCategory(id, submitData, undefined, subcategoryImage || undefined);
        toast.success("Subcategory updated successfully");
      } else {
        await categoryService.createCategory(submitData, undefined, subcategoryImage || undefined);
        toast.success("Subcategory created successfully");
      }
      router.push("/dashboard/products-list/category-list");
    } catch (error) {
      toast.error("Failed to save subcategory");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          <IoIosArrowRoundBack className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-bold">{id ? "Edit Subcategory" : "Create Subcategory"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Parent Category <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.categoryName} 
              onValueChange={val => setFormData(prev => ({ ...prev, categoryName: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Parent Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat._id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subcategory Name <span className="text-red-500">*</span></Label>
            <Input 
              value={formData.subcategoryName} 
              onChange={e => setFormData(prev => ({ ...prev, subcategoryName: e.target.value }))}
              placeholder="Enter subcategory name"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">SEO Information</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleGenerateSEO}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate with AI
            </Button>
          </div>
          
          <div className="space-y-2">
            <Label>Meta Title</Label>
            <Input 
              value={formData.subcategoryMetaTitle} 
              onChange={e => setFormData(prev => ({ ...prev, subcategoryMetaTitle: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Meta Description</Label>
            <Textarea 
              value={formData.subcategoryMetaDescription} 
              onChange={e => setFormData(prev => ({ ...prev, subcategoryMetaDescription: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Meta Keywords</Label>
            <Input 
              value={formData.subcategoryMetaKeywords} 
              onChange={e => setFormData(prev => ({ ...prev, subcategoryMetaKeywords: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Subcategory Image</Label>
          <FileUpload
            currentFile={subcategoryImage}
            onUploadSuccess={(file) => setSubcategoryImage(file)}
            onUploadError={(error) => toast.error(error.message)}
            onFileRemove={() => {
              setSubcategoryImage(null);
              setExistingSubcategoryImage("");
            }}
            existingImageUrl={existingSubcategoryImage}
            acceptedFileTypes={["image/jpeg", "image/png", "image/webp"]}
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {id ? "Update Subcategory" : "Create Subcategory"}
          </Button>
        </div>
      </form>
    </Card>
  );
};
