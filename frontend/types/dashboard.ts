// Dashboard Data Types

export interface KPICardsData {
  todaysOrders: number;
  todaysRevenue: number;
  avgOrderValue: number;
  onTimeDelivery: number;
  cancelledOrders: number;
  warehouseStatus: {
    total: number;
    online: number;
    offline: number;
  };
  trends: {
    orders: number;
    revenue: number;
    avgOrderValue: number;
  };
}

export interface OrderOperationsData {
  pending: number;
  confirmed: number;
  packing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  completed: number;
}

export interface DailyInsightsData {
  topCategories: Array<{
    name: string;
    sales: number;
    revenue: number;
  }>;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  peakHours: Array<{
    hour: string;
    orders: number;
  }>;
  salesTimeSeries?: Array<{
    date: string;
    sales: number;
    revenue: number;
    orders: number;
  }>;
}

export interface DeliveryPerformanceData {
  avgDeliveryTime: number;
  activeRiders: number;
  availableRiders?: number;
  totalDeliveries: number;
  successfulDeliveries?: number;
  failedAttempts: number;
  successRate?: number;
  pending?: number;
  assigned?: number;
  pickedUp?: number;
  inTransit?: number;
  delivered?: number;
}

export interface PaymentFinanceData {
  paymentSplit: {
    cod: number;
    prepaid: number;
    codAmount: number;
    prepaidAmount: number;
  };
  pendingCOD: number;
  failedPayments: number;
  refundsPending: number;
  outstandingBills?: number;
  monthlyData?: Array<{
    period: string;
    month: string;
    year: number;
    revenue: number;
    expenses: number;
    orders: number;
    tax: number;
    discount: number;
    netRevenue: number;
    profit: number;
    purchaseCost?: number;
  }>;
  summary?: {
    totalRevenue: number;
    totalTax: number;
    totalDiscount: number;
    netRevenue: number;
    totalExpenses: number;
    profit: number;
    profitMargin?: string;
  };
}

export interface WarehouseAlertsData {
  outOfStock: number;
  lowStockAlerts: number;
  expiringItems: number;
  inventoryMismatch: number;
}

export interface EODClosingData {
  dailyThroughput: number;
  totalCash: number;
  totalSales?: number;
  totalItems?: number;
  totalStockQuantity?: number;
  closingStockValue?: number;
  completedOrders?: number;
  readyToClose: boolean;
  stockByStatus?: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    inStockQty: number;
    lowStockQty: number;
  };
}

export interface DashboardData {
  kpiCards: KPICardsData;
  orderOperations: OrderOperationsData;
  dailyInsights: DailyInsightsData;
  deliveryPerformance: DeliveryPerformanceData;
  paymentFinance: PaymentFinanceData;
  warehouseAlerts: WarehouseAlertsData;
  eodClosing: EODClosingData;
}
