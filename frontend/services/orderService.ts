import axiosInstance from '@/lib/axios';

export interface OrderItem {
  id: string;
  productId: string;
  inventoryProductId: string;
  productName: string;
  variantName: string;
  displayName?: string;
  brand: string;
  productImage: string;
  selectedCuttingStyle?: string;
  unitPrice: number;
  mrp: number;
  quantity: number;
  discount: number;
  subtotal: number;
  total: number;
  gstPercentage: number;
  gstAmount: number;
}

export interface DeliveryAddress {
  name: string;
  phone: string;
  alternatePhone?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  addressType: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  invoiceNumber?: string;
  orderType: string;
  customerId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: DeliveryAddress;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  
  // GST Breakdown fields
  gstType?: string; // 'cgst_sgst' or 'igst'
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalGstAmount?: number;
  adminState?: string;
  customerState?: string;
  
  discount: number;
  couponCode?: string;
  couponDiscount: number;
  shippingCharge: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentId?: string;
  orderStatus: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  processingAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

export interface OrdersResponse {
  success: boolean;
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderResponse {
  success: boolean;
  data: Order;
}

/**
 * Get all orders for a user
 */
export const getUserOrders = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  status?: string
): Promise<OrdersResponse> => {
  const params: any = { userId, page, limit };
  if (status) params.status = status;

  const response = await axiosInstance.get('/api/online/my-orders', { params });
  return response.data;
};

/**
 * Get single order by order number
 */
export const getOrderByNumber = async (orderNumber: string, userId: string): Promise<OrderResponse> => {
  const response = await axiosInstance.get(`/api/online/my-orders/${orderNumber}`, {
    params: { userId }
  });
  return response.data;
};
