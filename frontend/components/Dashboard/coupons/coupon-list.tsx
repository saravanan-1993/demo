"use client";

import { useState, useEffect } from "react";
import axiosInstance from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CouponForm } from "./coupon-form";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";

interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  usageType: string;
  maxUsageCount?: number;
  currentUsageCount: number;
  maxUsagePerUser?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  applicableCategories: string[];
  createdAt: string;
}

interface Category {
  id: string;
  categoryName: string;
  categoryImage?: string;
}

export function CouponList() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [filterActive, setFilterActive] = useState<string>("all");
  const [categories, setCategories] = useState<Category[]>([]);

  const currencySymbol = useCurrency();

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get("/api/online/category-subcategory/unique");
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterActive !== "all") {
        params.append("isActive", filterActive);
      }
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await axiosInstance.get(
        `/api/online/coupons?${params.toString()}`
      );
      setCoupons(response.data.data);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast.error("Failed to fetch coupons");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryNames = (categoryIds: string[]) => {
    if (categoryIds.length === 0) return "All Categories";
    return categoryIds
      .map((id) => {
        const category = categories.find((cat) => cat.id === id);
        return category ? category.categoryName : id;
      })
      .join(", ");
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterActive, searchTerm]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      await axiosInstance.delete(`/api/online/coupons/${id}`);
      toast.success("Coupon deleted successfully");
      fetchCoupons();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Failed to delete coupon");
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCoupon(null);
    fetchCoupons();
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const isUpcoming = (validFrom: string) => {
    return new Date(validFrom) > new Date();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Coupon Management</h1>
        <Button onClick={() => setShowForm(true)}>Create Coupon</Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search coupons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Button
            variant={filterActive === "all" ? "default" : "outline"}
            onClick={() => setFilterActive("all")}
          >
            All
          </Button>
          <Button
            variant={filterActive === "true" ? "default" : "outline"}
            onClick={() => setFilterActive("true")}
          >
            Active
          </Button>
          <Button
            variant={filterActive === "false" ? "default" : "outline"}
            onClick={() => setFilterActive("false")}
          >
            Inactive
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No coupons found. Create your first coupon!
        </div>
      ) : (
        <div className="grid gap-4">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{coupon.code}</h3>
                    {coupon.isActive ? (
                      isExpired(coupon.validUntil) ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : isUpcoming(coupon.validFrom) ? (
                        <Badge variant="secondary">Upcoming</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                    <Badge variant="outline">
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}% OFF`
                        : `${currencySymbol}${coupon.discountValue} OFF`}
                    </Badge>
                  </div>

                  {coupon.description && (
                    <p className="text-gray-600 mb-3">{coupon.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Valid From:</span>
                      <p className="font-medium">
                        {format(new Date(coupon.validFrom), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Valid Until:</span>
                      <p className="font-medium">
                        {format(new Date(coupon.validUntil), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Usage:</span>
                      <p className="font-medium">
                        {coupon.currentUsageCount}
                        {coupon.maxUsageCount
                          ? ` / ${coupon.maxUsageCount}`
                          : " / Unlimited"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <p className="font-medium capitalize">
                        {coupon.usageType.replace(/-/g, " ")}
                      </p>
                    </div>
                  </div>

                  {coupon.minOrderValue && (
                    <p className="text-sm text-gray-600 mt-2">
                      Min. order value: {currencySymbol}
                      {coupon.minOrderValue}
                    </p>
                  )}

                  <div className="mt-2">
                    <span className="text-sm text-gray-500">
                      Applicable to:{" "}
                    </span>
                    <span className="text-sm font-medium">
                      {getCategoryNames(coupon.applicableCategories)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(coupon)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(coupon.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CouponForm coupon={editingCoupon} onClose={handleFormClose} />
      )}
    </div>
  );
}
