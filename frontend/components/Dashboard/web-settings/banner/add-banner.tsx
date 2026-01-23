"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FileUpload from "@/components/ui/file-upload";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import axiosInstance from "@/lib/axios";

interface Banner {
  id?: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
}

interface AddBannerProps {
  banner?: Banner | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddBanner({
  banner,
  onSuccess,
  onCancel,
}: AddBannerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    imageUrl: "",
    linkUrl: "",
  });

  useEffect(() => {
    if (banner) {
      setFormData({
        title: banner.title,
        imageUrl: banner.imageUrl,
        linkUrl: banner.linkUrl,
      });
    }
  }, [banner]);

  const handleInputChange = (
    field: keyof typeof formData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUploadSuccess = (file: File) => {
    setUploadedFile(file);
    toast.success("Image ready to upload");
  };

  const handleFileRemove = () => {
    setUploadedFile(null);
    if (!banner) {
      setFormData((prev) => ({ ...prev, imageUrl: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error("Please enter a banner title");
      return;
    }

    if (!uploadedFile && !formData.imageUrl) {
      toast.error("Please upload a banner image");
      return;
    }

    try {
      setIsSubmitting(true);

      const submitFormData = new FormData();
      submitFormData.append("title", formData.title);
      submitFormData.append("linkUrl", formData.linkUrl);

      // Add image file if new file was selected
      if (uploadedFile) {
        submitFormData.append("image", uploadedFile);
      } else if (formData.imageUrl) {
        // Keep existing image URL
        submitFormData.append("existingImageUrl", formData.imageUrl);
      }

      let response;
      if (banner?.id) {
        // Update existing banner
        response = await axiosInstance.put(
          `/api/web/banners/${banner.id}`,
          submitFormData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      } else {
        // Create new banner
        response = await axiosInstance.post(
          "/api/web/banners",
          submitFormData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      }

      if (response.data.success) {
        toast.success(
          banner?.id
            ? "Banner updated successfully"
            : "Banner created successfully"
        );
        onSuccess();
      }
    } catch (error) {
      const err = error as { 
        response?: { 
          data?: { 
            error?: string;
            details?: string;
          } 
        };
        message?: string;
      };
      
      const errorMessage = err.response?.data?.error || err.message || "Failed to save banner";
      const errorDetails = err.response?.data?.details;
      
      toast.error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image Upload */}
      <div className="space-y-2">
        <Label>Banner Image *</Label>
        <FileUpload
          onUploadSuccess={handleFileUploadSuccess}
          onUploadError={(error) => toast.error(error.message)}
          acceptedFileTypes={["image/jpeg", "image/png", "image/jpg", "image/webp"]}
          maxFileSize={5 * 1024 * 1024} // 5MB
          currentFile={uploadedFile}
          existingImageUrl={formData.imageUrl}
          onFileRemove={handleFileRemove}
          uploadDelay={0}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Recommended size: 1920x600px. Max file size: 5MB
        </p>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange("title", e.target.value)}
          placeholder="Enter banner title (alt text)"
          required
        />
        <p className="text-xs text-muted-foreground">
          This will be used as the alt text for the image
        </p>
      </div>

      {/* Link URL */}
      <div className="space-y-2">
        <Label htmlFor="linkUrl">Link URL</Label>
        <Input
          id="linkUrl"
          value={formData.linkUrl}
          onChange={(e) => handleInputChange("linkUrl", e.target.value)}
          placeholder="/products or https://example.com"
        />
        <p className="text-xs text-muted-foreground">
          Where users will be redirected when clicking the banner
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {banner?.id ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>{banner?.id ? "Update Banner" : "Create Banner"}</>
          )}
        </Button>
      </div>
    </form>
  );
}
