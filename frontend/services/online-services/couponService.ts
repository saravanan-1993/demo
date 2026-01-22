import axiosInstance from "@/lib/axios";

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  usageType: "single-use" | "multi-use" | "first-time-user-only";
  maxUsageCount?: number | null;
  currentUsageCount: number;
  maxUsagePerUser?: number | null;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  minOrderValue?: number | null;
  maxDiscountAmount?: number | null;
  applicableCategories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  couponCode: string;
  userId: string;
  orderId?: string | null;
  discountAmount: number;
  orderValue: number;
  usedAt: string;
}

export interface CouponValidationRequest {
  code: string;
  userId: string;
  orderValue: number;
  categories?: string[];
}

export interface CouponValidationResponse {
  success: boolean;
  message: string;
  data?: {
    couponId: string;
    code: string;
    discountAmount: number;
    finalAmount: number;
  };
}

export interface CouponApplyRequest {
  couponId: string;
  userId: string;
  orderId?: string;
  discountAmount: number;
  orderValue: number;
}

export interface CouponStats {
  coupon: Coupon;
  stats: {
    totalUsage: number;
    totalDiscount: number;
    totalOrderValue: number;
    averageDiscount: number;
  };
  recentUsage: CouponUsage[];
}

class CouponService {
  private baseURL = "/api/online/coupons";

  /**
   * Create a new coupon
   */
  async createCoupon(couponData: Partial<Coupon>): Promise<{
    success: boolean;
    message: string;
    data: Coupon;
  }> {
    const response = await axiosInstance.post(this.baseURL, couponData);
    return response.data;
  }

  /**
   * Get all coupons
   */
  async getAllCoupons(params?: {
    isActive?: boolean;
    search?: string;
  }): Promise<{
    success: boolean;
    data: Coupon[];
    count: number;
  }> {
    const response = await axiosInstance.get(this.baseURL, { params });
    return response.data;
  }

  /**
   * Get coupon by ID
   */
  async getCouponById(id: string): Promise<{
    success: boolean;
    data: Coupon;
  }> {
    const response = await axiosInstance.get(`${this.baseURL}/${id}`);
    return response.data;
  }

  /**
   * Update coupon
   */
  async updateCoupon(
    id: string,
    couponData: Partial<Coupon>
  ): Promise<{
    success: boolean;
    message: string;
    data: Coupon;
  }> {
    const response = await axiosInstance.put(`${this.baseURL}/${id}`, couponData);
    return response.data;
  }

  /**
   * Delete coupon
   */
  async deleteCoupon(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await axiosInstance.delete(`${this.baseURL}/${id}`);
    return response.data;
  }

  /**
   * Validate coupon
   */
  async validateCoupon(
    validationData: CouponValidationRequest
  ): Promise<CouponValidationResponse> {
    const response = await axiosInstance.post(
      `${this.baseURL}/validate`,
      validationData
    );
    return response.data;
  }

  /**
   * Apply coupon (record usage)
   */
  async applyCoupon(applyData: CouponApplyRequest): Promise<{
    success: boolean;
    message: string;
    data: CouponUsage;
  }> {
    const response = await axiosInstance.post(`${this.baseURL}/apply`, applyData);
    return response.data;
  }

  /**
   * Get coupon statistics
   */
  async getCouponStats(id: string): Promise<{
    success: boolean;
    data: CouponStats;
  }> {
    const response = await axiosInstance.get(`${this.baseURL}/${id}/stats`);
    return response.data;
  }

  /**
   * Get promotional coupons for header display
   */
  async getPromotionalCoupons(): Promise<{
    success: boolean;
    data: Array<{
      code: string;
      description?: string;
      discountType: "percentage" | "flat";
      discountValue: number;
      minOrderValue?: number | null;
      maxDiscountAmount?: number | null;
      usageType?: string;
    }>;
  }> {
    const response = await axiosInstance.get(`${this.baseURL}/promotional`);
    return response.data;
  }
}

export const couponService = new CouponService();
