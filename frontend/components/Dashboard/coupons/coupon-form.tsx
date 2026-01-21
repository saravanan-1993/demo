"use client";

import { useState, useEffect } from "react";
import axiosInstance from "@/lib/axios";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
import { MultipleSelect, MultipleSelectContent, MultipleSelectItem } from "@/components/ui/multiple-select";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface CategoryOption {
  id: string;
  name: string;
}

interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  usageType: string;
  maxUsageCount?: number;
  maxUsagePerUser?: number;
  validFrom: string;
  validUntil: string;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  applicableCategories: string[];
  isActive: boolean;
}

interface CouponFormProps {
  coupon?: Coupon | null;
  onClose: () => void;
}

export function CouponForm({ coupon, onClose }: CouponFormProps) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<React.Key>>(new Set());
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    usageType: "multi-use",
    maxUsageCount: "",
    maxUsagePerUser: "",
    validFrom: "",
    validUntil: "",
    minOrderValue: "",
    maxDiscountAmount: "",
    isActive: true,
  });

  const currencySymbol = useCurrency();

  const [loading, setLoading] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axiosInstance.get("/api/online/category-subcategory/unique");
        if (response.data.success) {
          const categoryOptions = response.data.data.map((cat: { id: string; categoryName: string }) => ({
            id: cat.id, // Use actual category ID
            name: cat.categoryName,
          }));
          setCategories(categoryOptions);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories");
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (coupon) {
      setFormData({
        code: coupon.code || "",
        description: coupon.description || "",
        discountType: coupon.discountType || "percentage",
        discountValue: coupon.discountValue?.toString() || "",
        usageType: coupon.usageType || "multi-use",
        maxUsageCount: coupon.maxUsageCount?.toString() || "",
        maxUsagePerUser: coupon.maxUsagePerUser?.toString() || "",
        validFrom: coupon.validFrom
          ? new Date(coupon.validFrom).toISOString().split("T")[0]
          : "",
        validUntil: coupon.validUntil
          ? new Date(coupon.validUntil).toISOString().split("T")[0]
          : "",
        minOrderValue: coupon.minOrderValue?.toString() || "",
        maxDiscountAmount: coupon.maxDiscountAmount?.toString() || "",
        isActive: coupon.isActive ?? true,
      });
      
      // Set selected categories
      if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
        setSelectedCategories(new Set(coupon.applicableCategories));
      }
    }
  }, [coupon]);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, code: result }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        maxUsageCount: formData.maxUsageCount
          ? parseInt(formData.maxUsageCount)
          : null,
        maxUsagePerUser: formData.maxUsagePerUser
          ? parseInt(formData.maxUsagePerUser)
          : null,
        minOrderValue: formData.minOrderValue
          ? parseFloat(formData.minOrderValue)
          : null,
        maxDiscountAmount: formData.maxDiscountAmount
          ? parseFloat(formData.maxDiscountAmount)
          : null,
        applicableCategories: Array.from(selectedCategories) as string[],
      };

      if (coupon) {
        await axiosInstance.put(`/api/online/coupons/${coupon.id}`, payload);
        toast.success("Coupon updated successfully");
      } else {
        await axiosInstance.post(`/api/online/coupons`, payload);
        toast.success("Coupon created successfully");
      }

      onClose();
    } catch (error) {
      console.error("Error saving coupon:", error);
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message
        : "Failed to save coupon";
      toast.error(errorMessage || "Failed to save coupon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-2xl font-bold mb-6">
            {coupon ? "Edit Coupon" : "Create Coupon"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Coupon Code *</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    type="text"
                    className="flex-1"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="SUMMER2024"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generateCode}
                    title="Generate random code"
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="discountType">Discount Type *</Label>
                <select
                  id="discountType"
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({ ...formData, discountType: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2"
                  required
                >
                  <option value="percentage">Percentage</option>
                  <option value="flat">Flat Amount</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Summer sale discount"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discountValue">
                  Discount Value *{" "}
                  {formData.discountType === "percentage"
                    ? "(%)"
                    : "({currencySymbol})"}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  step="0.01"
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({ ...formData, discountValue: e.target.value })
                  }
                  placeholder={
                    formData.discountType === "percentage" ? "10" : "100"
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="usageType">Usage Type *</Label>
                <select
                  id="usageType"
                  value={formData.usageType}
                  onChange={(e) =>
                    setFormData({ ...formData, usageType: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2"
                  required
                >
                  <option value="single-use">Single Use</option>
                  <option value="multi-use">Multi Use</option>
                  <option value="first-time-user-only">
                    First Time User Only
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validFrom">Valid From *</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, validFrom: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="validUntil">Valid Until *</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) =>
                    setFormData({ ...formData, validUntil: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxUsageCount">Max Usage Count</Label>
                <Input
                  id="maxUsageCount"
                  type="number"
                  value={formData.maxUsageCount}
                  onChange={(e) =>
                    setFormData({ ...formData, maxUsageCount: e.target.value })
                  }
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div>
                <Label htmlFor="maxUsagePerUser">Max Usage Per User</Label>
                <Input
                  id="maxUsagePerUser"
                  type="number"
                  value={formData.maxUsagePerUser}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxUsagePerUser: e.target.value,
                    })
                  }
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minOrderValue">
                  Min Order Value ({currencySymbol})
                </Label>
                <Input
                  id="minOrderValue"
                  type="number"
                  step="0.01"
                  value={formData.minOrderValue}
                  onChange={(e) =>
                    setFormData({ ...formData, minOrderValue: e.target.value })
                  }
                  placeholder="500"
                />
              </div>

              <div>
                <Label htmlFor="maxDiscountAmount">
                  Max Discount Amount ({currencySymbol})
                </Label>
                <Input
                  id="maxDiscountAmount"
                  type="number"
                  step="0.01"
                  value={formData.maxDiscountAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDiscountAmount: e.target.value,
                    })
                  }
                  placeholder="For percentage coupons"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="applicableCategories">
                Applicable Categories
              </Label>
              <MultipleSelect
                className="w-full"
                placeholder="Select categories (leave empty for all)"
                aria-label="Select categories"
                selectedKeys={selectedCategories}
                onSelectionChange={(keys) => setSelectedCategories(keys as Set<React.Key>)}
              >
                <MultipleSelectContent items={categories}>
                  {(item) => (
                    <MultipleSelectItem id={item.id} textValue={item.name}>
                      <span className="text-sm">{item.name}</span>
                    </MultipleSelectItem>
                  )}
                </MultipleSelectContent>
              </MultipleSelect>
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to apply to all categories
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading
                  ? "Saving..."
                  : coupon
                  ? "Update Coupon"
                  : "Create Coupon"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
