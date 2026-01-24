"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductFormState } from "@/types/product";
import { badgeService, Badge } from "@/services/online-services/badgeService";
import { BadgeSelector } from "./badge-selector";
import { Eye, Search } from "lucide-react";
import { toast } from "sonner";

interface VisibilitySEOTabProps {
  formData: ProductFormState;
  onChange: (field: keyof ProductFormState, value: unknown) => void;
}

export function VisibilitySEOTab({ formData, onChange }: VisibilitySEOTabProps) {
  const [staticBadges, setStaticBadges] = useState<Badge[]>([]);
  const [customBadges, setCustomBadges] = useState<Badge[]>([]);
  const [isLoadingBadges, setIsLoadingBadges] = useState(false);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      setIsLoadingBadges(true);
      const response = await badgeService.getAllBadges();
      if (response.success) {
        setStaticBadges(response.data.static);
        setCustomBadges(response.data.custom);
      }
    } catch (error) {
      console.error("Error fetching badges:", error);
      toast.error("Failed to load badges");
    } finally {
      setIsLoadingBadges(false);
    }
  };

  // Handler for adding custom badges (only for Products Page)
  const handleAddBadge = async (badgeName: string) => {
    if (!badgeName.trim()) return;

    try {
      const response = await badgeService.createBadge(badgeName.trim());
      
      const newBadge: Badge = {
        id: response.data.id,
        name: badgeName.trim(),
        isStatic: false,
      };
      setCustomBadges((prev) => [...prev, newBadge]);
      onChange("productsPageBadge", badgeName.trim());
      
      toast.success("Badge created successfully");
    } catch (error) {
      console.error("Error adding badge:", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || "Failed to create badge");
    }
  };

  // Handler for editing custom badges (only for Products Page)
  const handleEditBadge = async (badgeId: string, badgeName: string) => {
    if (!badgeName.trim()) return;

    try {
      await badgeService.updateBadge(badgeId, badgeName.trim());
      
      setCustomBadges((prev) =>
        prev.map((badge) =>
          badge.id === badgeId
            ? { ...badge, name: badgeName.trim() }
            : badge
        )
      );
      
      toast.success("Badge updated successfully");
    } catch (error) {
      console.error("Error editing badge:", error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || "Failed to update badge");
    }
  };

  // Dummy handlers for homepage badge (custom badges disabled)
  const handleHomepageAddBadge = async () => {
    // Custom badge creation disabled for homepage
    toast.error("Custom badge creation is disabled for homepage. Use static badges only.");
  };

  const handleHomepageEditBadge = async () => {
    // Custom badge editing disabled for homepage
    toast.error("Custom badge editing is disabled for homepage.");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">Website Visibility & SEO</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
          Control how and where your product appears on the website
        </p>
      </div>

      {/* Product Status */}
      <div className="border rounded-lg p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Label htmlFor="productStatus" className="text-sm sm:text-base font-medium">
              Product Status <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.productStatus}
              onValueChange={(value: "draft" | "active") =>
                onChange("productStatus", value)
              }
            >
              <SelectTrigger id="productStatus" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Draft</span>
                    <span className="text-xs text-muted-foreground">
                      Not visible to customers
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="active">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Active</span>
                    <span className="text-xs text-muted-foreground">
                      Visible to customers
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Homepage Visibility */}
      <div className="border rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-3">
          <div className="flex-1 min-w-0">
            <Label htmlFor="showOnHomepage" className="text-sm sm:text-base font-medium">
              Show on Homepage
            </Label>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Display this product on the homepage
            </p>
          </div>
          <Switch
            id="showOnHomepage"
            checked={formData.showOnHomepage}
            onCheckedChange={(checked) => onChange("showOnHomepage", checked)}
            className="flex-shrink-0"
          />
        </div>

        {formData.showOnHomepage && (
          <BadgeSelector
            value={formData.homepageBadge || ""}
            onChange={(value) => onChange("homepageBadge", value)}
            staticBadges={staticBadges.filter(badge => 
              badge.name === "Bestseller" || 
              badge.name === "Trending" || 
              badge.name === "New Arrival" || 
              badge.name === "Hot Deal"
            )} // Show Bestseller, Trending, New Arrival, and Hot Deal for homepage
            customBadges={[]} // No custom badges for homepage
            onAddBadge={handleHomepageAddBadge}
            onEditBadge={handleHomepageEditBadge}
            label="Homepage Badge"
            disabled={isLoadingBadges}
            allowCustomBadges={false} // Disable custom badge creation for homepage
            showStaticBadgesHeading={false} // Hide "STATIC BADGES" heading for homepage
          />
        )}
      </div>

      {/* Products Page Visibility */}
      <div className="border rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-3">
          <div className="flex-1 min-w-0">
            <Label htmlFor="showInProductsPage" className="text-sm sm:text-base font-medium">
              Show in Products Page
            </Label>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Display this product in the products listing page
            </p>
          </div>
          <Switch
            id="showInProductsPage"
            checked={formData.showInProductsPage}
            onCheckedChange={(checked) => onChange("showInProductsPage", checked)}
            className="flex-shrink-0"
          />
        </div>

        {formData.showInProductsPage && (
          <BadgeSelector
            value={formData.productsPageBadge || ""}
            onChange={(value) => onChange("productsPageBadge", value)}
            staticBadges={staticBadges}
            customBadges={customBadges}
            onAddBadge={handleAddBadge}
            onEditBadge={handleEditBadge}
            label="Products Page Badge"
            disabled={isLoadingBadges}
            allowCustomBadges={true} // Allow custom badge creation for products page
          />
        )}
      </div>

      {/* SEO Information */}
      <div className="border-t pt-4 sm:pt-6">
        <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Search className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mt-1 flex-shrink-0" />
          <div>
            <h4 className="text-sm sm:text-base font-semibold">SEO Information</h4>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Optimize your product for search engines
            </p>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {/* Meta Title */}
          <div>
            <Label htmlFor="metaTitle" className="text-sm sm:text-base">Meta Title</Label>
            <Input
              id="metaTitle"
              value={formData.metaTitle || ""}
              onChange={(e) => onChange("metaTitle", e.target.value)}
              placeholder="Enter SEO title"
              className="mt-2 text-sm sm:text-base"
              maxLength={60}
            />
            <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mt-1">
              <span className="truncate">Recommended: 50-60 characters</span>
              <span className="flex-shrink-0 ml-2">{(formData.metaTitle || "").length}/60</span>
            </div>
          </div>

          {/* Meta Description */}
          <div>
            <Label htmlFor="metaDescription" className="text-sm sm:text-base">Meta Description</Label>
            <Textarea
              id="metaDescription"
              value={formData.metaDescription || ""}
              onChange={(e) => onChange("metaDescription", e.target.value)}
              placeholder="Enter SEO description"
              className="mt-2 min-h-[60px] sm:min-h-[80px] text-sm sm:text-base"
              maxLength={160}
            />
            <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mt-1">
              <span className="truncate">Recommended: 150-160 characters</span>
              <span className="flex-shrink-0 ml-2">{(formData.metaDescription || "").length}/160</span>
            </div>
          </div>

          {/* Meta Keywords */}
          <div>
            <Label htmlFor="metaKeywords" className="text-sm sm:text-base">Meta Keywords</Label>
            <Input
              id="metaKeywords"
              value={formData.metaKeywords || ""}
              onChange={(e) => onChange("metaKeywords", e.target.value)}
              placeholder="Enter keywords separated by commas"
              className="mt-2 text-sm sm:text-base"
            />
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Separate keywords with commas (e.g., t-shirt, cotton, red)
            </p>
          </div>
        </div>
      </div>

      {/* SEO Preview */}
      {(formData.metaTitle || formData.metaDescription) && (
        <div className="border-t pt-4 sm:pt-6">
          <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Search Engine Preview</h4>
          <div className="border rounded-lg p-3 sm:p-4 bg-gray-50">
            <div className="text-blue-600 text-base sm:text-lg font-medium mb-1 break-words">
              {formData.metaTitle || "Product Title"}
            </div>
            <div className="text-green-700 text-xs sm:text-sm mb-2 break-all">
              www.yourstore.com/products/product-name
            </div>
            <div className="text-gray-700 text-xs sm:text-sm break-words">
              {formData.metaDescription || "Product description will appear here..."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
