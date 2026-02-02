import axiosInstance from "@/lib/axios";

// Supplier Types
export interface Supplier {
  id: string;
  name: string;
  supplierType?: string;
  contactPersonName?: string;
  phone: string;
  alternatePhone?: string;
  email: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  shippingAddressSameAsBilling: boolean;
  shippingAddressLine1?: string;
  shippingAddressLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  taxId?: string;
  remarks?: string;
  attachments?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Warehouse Types
export interface Warehouse {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  manager: string;
  phone: string;
  status: string;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  isActive: boolean;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Item Types
export interface Item {
  id: string;
  itemName: string;
  category: string;
  itemCode?: string;
  uom: string;
  purchasePrice: number;
  gstPercentage: number;
  hsnCode?: string;
  warehouse: string;
  quantity: number;
  lowStockAlertLevel: number;
  status: string;
  description?: string;
  itemImage?: string;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

// Supplier Services
export const supplierService = {
  // Get all suppliers
  getAll: async (): Promise<Supplier[]> => {
    const response = await axiosInstance.get<ApiResponse<Supplier[]>>(
      "/api/purchase/suppliers"
    );
    return response.data.data;
  },

  // Get supplier by ID
  getById: async (id: string): Promise<Supplier> => {
    const response = await axiosInstance.get<ApiResponse<Supplier>>(
      `/api/purchase/suppliers/${id}`
    );
    return response.data.data;
  },

  // Create supplier
  create: async (data: FormData): Promise<Supplier> => {
    const response = await axiosInstance.post<ApiResponse<Supplier>>(
      "/api/purchase/suppliers",
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data.data;
  },

  // Update supplier
  update: async (id: string, data: FormData): Promise<Supplier> => {
    const response = await axiosInstance.put<ApiResponse<Supplier>>(
      `/api/purchase/suppliers/${id}`,
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data.data;
  },

  // Delete supplier
  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/purchase/suppliers/${id}`);
  },
};

// Warehouse Services
export const warehouseService = {
  // Get all warehouses
  getAll: async (status?: string): Promise<Warehouse[]> => {
    const params = status ? { status } : {};
    const response = await axiosInstance.get<ApiResponse<Warehouse[]>>(
      "/api/inventory/warehouses",
      { params }
    );
    return response.data.data;
  },

  // Get warehouse by ID
  getById: async (id: string): Promise<Warehouse> => {
    const response = await axiosInstance.get<ApiResponse<Warehouse>>(
      `/api/inventory/warehouses/${id}`
    );
    return response.data.data;
  },

  // Get warehouse statistics
  getStats: async () => {
    const response = await axiosInstance.get("/api/inventory/warehouses/stats");
    return response.data.data;
  },
};

// Category Services
export const categoryService = {
  // Get all categories
  getAll: async (isActive?: boolean): Promise<Category[]> => {
    const params = isActive !== undefined ? { isActive } : {};
    const response = await axiosInstance.get<ApiResponse<Category[]>>(
      "/api/inventory/categories",
      { params }
    );
    return response.data.data;
  },

  // Get active categories only
  getActive: async (): Promise<Category[]> => {
    const response = await axiosInstance.get<ApiResponse<Category[]>>(
      "/api/inventory/categories",
      { params: { isActive: true } }
    );
    return response.data.data;
  },

  // Get category by ID
  getById: async (id: string): Promise<Category> => {
    const response = await axiosInstance.get<ApiResponse<Category>>(
      `/api/inventory/categories/${id}`
    );
    return response.data.data;
  },

  // Get category statistics
  getStats: async () => {
    const response = await axiosInstance.get("/api/inventory/categories/stats");
    return response.data.data;
  },
};

// Item Services
export const itemService = {
  // Get all items
  getAll: async (filters?: {
    category?: string;
    warehouse?: string;
    status?: string;
    search?: string;
  }): Promise<Item[]> => {
    const response = await axiosInstance.get<ApiResponse<Item[]>>(
      "/api/inventory/items",
      { params: filters }
    );
    return response.data.data;
  },

  // Search items
  search: async (query: string): Promise<Item[]> => {
    const response = await axiosInstance.get<ApiResponse<Item[]>>(
      "/api/inventory/items/search",
      { params: { q: query } }
    );
    return response.data.data;
  },

  // Get low stock items
  getLowStock: async (): Promise<Item[]> => {
    const response = await axiosInstance.get<ApiResponse<Item[]>>(
      "/api/inventory/items/low-stock"
    );
    return response.data.data;
  },

  // Get item by ID
  getById: async (id: string): Promise<Item> => {
    const response = await axiosInstance.get<ApiResponse<Item>>(
      `/api/inventory/items/${id}`
    );
    return response.data.data;
  },

  // Get items by category
  getByCategory: async (category: string): Promise<Item[]> => {
    const response = await axiosInstance.get<ApiResponse<Item[]>>(
      `/api/inventory/items/category/${category}`
    );
    return response.data.data;
  },

  // Get items by warehouse
  getByWarehouse: async (warehouse: string): Promise<Item[]> => {
    const response = await axiosInstance.get<ApiResponse<Item[]>>(
      `/api/inventory/items/warehouse/${warehouse}`
    );
    return response.data.data;
  },

  // Get item statistics
  getStats: async () => {
    const response = await axiosInstance.get("/api/inventory/items/stats");
    return response.data.data;
  },
};

// Purchase Order Types
export interface PurchaseOrderItem {
  id?: string;
  itemId?: string;
  category: string;
  productName: string;
  sku: string;
  hsnCode: string;
  quantity: number;
  uom: string;
  price: number;
  gstRateId?: string; // GST Rate ID from finance service
  gstPercentage: number;
  gstType: "cgst_sgst" | "igst";
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  mrp: string;
  itemTotal: number;
  totalPrice: number;
}

export interface SupplierInfo {
  supplierId: string;
  supplierName: string;
  contactPersonName: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierGSTIN: string;
}

export interface PurchaseOrder {
  id: string;
  poId: string;
  supplierId: string;
  supplierName: string;
  contactPersonName?: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierGSTIN?: string;
  billingAddress: string;
  shippingAddress: string;
  currency?: string;
  currencySymbol?: string;
  warehouseId: string;
  warehouseName: string;
  warehousePhone?: string;
  poDate: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  customPaymentTerms?: string;
  poStatus: string;
  poNotes?: string;
  items: PurchaseOrderItem[];
  subTotal: number;
  totalQuantity: number;
  discount: number;
  discountType: string;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalGST: number;
  otherCharges: number;
  roundingAdjustment: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface GSTBreakdown {
  rate: number;
  gstType: "cgst_sgst" | "igst";
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface PurchaseOrderFormData {
  supplierInfo: SupplierInfo;
  billingAddress: string;
  shippingAddress: string;
  warehouseId: string;
  warehouseName: string;
  poId?: string;
  poDate: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  customPaymentTerms?: string;
  poStatus: string;
  poNotes: string;
  currency: string;
  currencySymbol: string;
  items: PurchaseOrderItem[];
  subTotal: number;
  totalQuantity: number;
  discount: number;
  discountType: "percentage" | "flat";
  gstBreakdown: GSTBreakdown[];
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalGST: number;
  otherCharges: number;
  roundingAdjustment: number;
  grandTotal: number;
}

// Purchase Order Services
export const purchaseOrderService = {
  // Get all purchase orders
  getAll: async (filters?: {
    status?: string;
    supplierId?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
    availableForBill?: boolean;
  }): Promise<PurchaseOrder[]> => {
    const response = await axiosInstance.get<ApiResponse<PurchaseOrder[]>>(
      "/api/purchase/purchase-orders",
      { params: filters }
    );
    return response.data.data;
  },

  // Get purchase orders available for bill creation (no existing bills)
  getAvailableForBill: async (): Promise<PurchaseOrder[]> => {
    const response = await axiosInstance.get<ApiResponse<PurchaseOrder[]>>(
      "/api/purchase/purchase-orders",
      { params: { availableForBill: true } }
    );
    return response.data.data;
  },

  // Get purchase order by ID
  getById: async (id: string): Promise<PurchaseOrder> => {
    const response = await axiosInstance.get<ApiResponse<PurchaseOrder>>(
      `/api/purchase/purchase-orders/${id}`
    );
    return response.data.data;
  },

  // Get next PO number
  getNextPONumber: async (): Promise<string> => {
    const response = await axiosInstance.get<ApiResponse<{ poId: string }>>(
      "/api/purchase/purchase-orders/next-number"
    );
    return response.data.data.poId;
  },

  // Create purchase order
  create: async (
    data: PurchaseOrderFormData
  ): Promise<{ data: PurchaseOrder; message: string }> => {
    const response = await axiosInstance.post<ApiResponse<PurchaseOrder>>(
      "/api/purchase/purchase-orders",
      data
    );
    return {
      data: response.data.data,
      message: response.data.message || "Purchase order created",
    };
  },

  // Update purchase order
  update: async (
    id: string,
    data: PurchaseOrderFormData
  ): Promise<{ data: PurchaseOrder; message: string }> => {
    const response = await axiosInstance.put<ApiResponse<PurchaseOrder>>(
      `/api/purchase/purchase-orders/${id}`,
      data
    );
    return {
      data: response.data.data,
      message: response.data.message || "Purchase order updated",
    };
  },

  // Delete purchase order - DISABLED
  // Purchase orders should be cancelled instead of deleted
  // delete: async (id: string): Promise<void> => {
  //   await axiosInstance.delete(`/api/purchase/purchase-orders/${id}`);
  // },

  // Get purchase order statistics
  getStats: async () => {
    const response = await axiosInstance.get(
      "/api/purchase/purchase-orders/stats"
    );
    return response.data.data;
  },
};

// GST Rate Types
export interface GSTRate {
  id: string;
  name: string;
  gstPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// GST Rate Services
export const gstRateService = {
  // Get all GST rates
  getAll: async (isActive?: boolean): Promise<GSTRate[]> => {
    const params = isActive !== undefined ? { isActive } : {};
    const response = await axiosInstance.get<ApiResponse<GSTRate[]>>(
      "/api/finance/gst-rates",
      { params }
    );
    return response.data.data;
  },

  // Get active GST rates only
  getActive: async (): Promise<GSTRate[]> => {
    const response = await axiosInstance.get<ApiResponse<GSTRate[]>>(
      "/api/finance/gst-rates",
      { params: { isActive: true } }
    );
    return response.data.data;
  },
};
