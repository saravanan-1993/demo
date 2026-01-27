import axiosInstance from "@/lib/axios";
import { CartItem, Customer } from "@/components/Dashboard/pos/pos-interface";

export interface POSOrderItem {
  productId: string;
  productName: string;
  productSku?: string;
  unitPrice: number;
  quantity: number;
  discount?: number;
  gstPercentage?: number;
}

export interface CreatePOSOrderRequest {
  customer?: Customer | null;
  items: POSOrderItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount?: number;
  roundingOff?: number;
  total: number;
  paymentMethod: string;
  amountReceived: number;
  changeGiven?: number;
  createdBy?: string;
}

export interface POSOrder {
  id: string;
  orderNumber: string;
  invoiceNumber?: string;
  orderType: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: any[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  roundingOff: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  amountReceived: number;
  changeGiven: number;
  orderStatus: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

class POSOrderService {
  private baseUrl = "/api/pos/orders";

  async createOrder(orderData: CreatePOSOrderRequest): Promise<POSOrder> {
    const response = await axiosInstance.post(this.baseUrl, orderData);
    return response.data.data;
  }

  async getOrders(params?: {
    page?: number;
    limit?: number;
    orderStatus?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: POSOrder[]; pagination: any }> {
    const response = await axiosInstance.get(this.baseUrl, { params });
    return response.data;
  }

  async getOrderById(id: string): Promise<POSOrder> {
    const response = await axiosInstance.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  async getOrderByNumber(orderNumber: string): Promise<POSOrder> {
    const response = await axiosInstance.get(
      `${this.baseUrl}/order-number/${orderNumber}`
    );
    return response.data.data;
  }

  async getSalesSummary(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    const response = await axiosInstance.get(`${this.baseUrl}/stats/summary`, {
      params,
    });
    return response.data.data;
  }

  // PDF Invoice Methods
  async downloadInvoicePDF(orderNumber: string): Promise<void> {
    try {
      const response = await axiosInstance.get(
        `/api/pos/invoices/download/${orderNumber}`,
        {
          responseType: 'blob',
        }
      );

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pos-invoice-${orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading POS invoice PDF:', error);
      throw error;
    }
  }

  async previewInvoicePDF(orderNumber: string): Promise<void> {
    try {
      const response = await axiosInstance.get(
        `/api/pos/invoices/preview/${orderNumber}`,
        {
          responseType: 'blob',
        }
      );

      // Open PDF in new tab
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Cleanup after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error('Error previewing POS invoice PDF:', error);
      throw error;
    }
  }

  async getInvoiceDetails(orderNumber: string): Promise<any> {
    const response = await axiosInstance.get(
      `/api/pos/invoices/details/${orderNumber}`
    );
    return response.data.data;
  }

  // Helper to transform cart items to order items
  transformCartItems(cartItems: CartItem[]): POSOrderItem[] {
    return cartItems.map((item) => ({
      productId: item.id,
      productName: item.name,
      productSku: item.sku,
      unitPrice: item.price,
      quantity: item.quantity,
      discount: item.discount || 0,
      gstPercentage: item.gstPercentage || 0,
    }));
  }
}

export const posOrderService = new POSOrderService();
