"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Eye, Search, Loader2, FileText, Calendar, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useCurrency } from "@/hooks/useCurrency";
import { financeService, type SalesOrder, type SalesFilters, type OrderDetails } from "@/services/financeService";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceView } from "../../../orders/InvoiceView";
import axiosInstance from "@/lib/axios";

const paymentStatusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
};

const orderStatusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  confirmed: "outline",
  shipped: "outline",
  delivered: "default",
  cancelled: "destructive",
};

export default function OnlineSalesList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<OrderDetails | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const currencySymbol = useCurrency();

  // Company Settings
  const [companySettings, setCompanySettings] = useState<{
    companyName: string;
    logoUrl: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
    email: string;
    gstNumber?: string;
  } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSales, setTotalSales] = useState(0);
  const [summary, setSummary] = useState({
    totalOrders: 0,
    totalAmount: 0,
  });
  const itemsPerPage = 10;

  // Fetch sales data
  const fetchSales = async () => {
    try {
      setLoading(true);
      
      const filters: SalesFilters = {
        orderType: 'online',
        page: currentPage,
        limit: itemsPerPage,
        sortBy: 'saleDate',
        sortOrder: 'desc',
      };

      // Add search filter
      if (searchQuery.trim()) {
        // Note: Backend should support search by order number, customer name, etc.
        // For now, we'll filter on frontend after getting results
      }

      // Add status filters
      if (paymentStatusFilter !== 'all') {
        filters.paymentStatus = paymentStatusFilter;
      }

      // Add date range filter
      if (dateRange !== 'all') {
        const today = new Date();
        let startDate: Date;
        
        switch (dateRange) {
          case 'today':
            startDate = new Date(today.setHours(0, 0, 0, 0));
            filters.startDate = startDate.toISOString();
            filters.endDate = new Date().toISOString();
            break;
          case 'week':
            startDate = new Date(today.setDate(today.getDate() - 7));
            filters.startDate = startDate.toISOString();
            break;
          case 'month':
            startDate = new Date(today.setMonth(today.getMonth() - 1));
            filters.startDate = startDate.toISOString();
            break;
          case 'quarter':
            startDate = new Date(today.setMonth(today.getMonth() - 3));
            filters.startDate = startDate.toISOString();
            break;
        }
      }

      const response = await financeService.getAllSales(filters);
      
      if (response.success) {
        // Apply frontend search filter if needed
        let filteredSales = response.data;
        if (searchQuery.trim()) {
          filteredSales = response.data.filter((sale) =>
            sale.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sale.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        // Apply order status filter
        if (orderStatusFilter !== 'all') {
          filteredSales = filteredSales.filter(sale => sale.orderStatus === orderStatusFilter);
        }

        setSales(filteredSales);
        setTotalPages(response.pagination.pages);
        setTotalSales(response.pagination.total);
        setSummary({
          totalOrders: response.summary.onlineOrders,
          totalAmount: response.summary.totalAmount,
        });
      }
    } catch (error) {
      console.error('Error fetching online sales:', error);
      toast.error('Failed to fetch online sales data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
    loadCompanySettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, paymentStatusFilter, dateRange]);

  const loadCompanySettings = async () => {
    try {
      const [webSettingsResponse, adminResponse] = await Promise.all([
        axiosInstance.get("/api/web/web-settings"),
        axiosInstance.get("/api/auth/admin/settings")
      ]);
      
      if (webSettingsResponse.data.success || adminResponse.data.success) {
        const adminData = adminResponse.data.data || {};
        
        setCompanySettings({
          companyName: adminData.companyName || 'Company',
          logoUrl: webSettingsResponse.data.data?.logoUrl || '',
          address: adminData.address || '',
          city: adminData.city || '',
          state: adminData.state || '',
          zipCode: adminData.zipCode || '',
          country: adminData.country || '',
          phone: '',
          email: '',
          gstNumber: adminData.gstNumber || '',
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchSales();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, orderStatusFilter]);

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis-start");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("ellipsis-end");
      pages.push(totalPages);
    }
    return pages;
  };

  const handleViewDetails = async (sale: SalesOrder) => {
    try {
      const response = await financeService.getOrderDetails('online', sale.id);
      if (response.success) {
        setSelectedSale(response.data);
        setShowInvoiceModal(true);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to fetch order details');
    }
  };

  const handleDownloadPDF = async (sale: SalesOrder) => {
    setDownloadingPDF(sale.orderNumber);
    try {
      const response = await financeService.getOrderDetails('online', sale.id);
      if (!response.success) {
        toast.error('Failed to fetch order details');
        return;
      }

      const order = response.data;

      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.top = '0';
      tempDiv.style.left = '0';
      tempDiv.style.zIndex = '-9999';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.width = '210mm';
      tempDiv.style.minHeight = '297mm';
      
      tempDiv.innerHTML = generateOnlineInvoiceHTML(order);
      document.body.appendChild(tempDiv);

      const logoImg = tempDiv.querySelector('img') as HTMLImageElement;
      if (logoImg && companySettings?.logoUrl) {
        logoImg.crossOrigin = "anonymous";
        logoImg.referrerPolicy = "no-referrer";
        logoImg.src = companySettings.logoUrl;
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(tempDiv, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        width: tempDiv.scrollWidth,
        height: tempDiv.scrollHeight,
      });

      document.body.removeChild(tempDiv);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      if (imgHeight > pdfHeight) {
        const scale = pdfHeight / imgHeight;
        const scaledWidth = imgWidth * scale;
        const scaledHeight = pdfHeight;
        const xOffset = (pdfWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, 0, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }

      pdf.save(`invoice-${order.orderNumber}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error: unknown) {
      console.error('Error downloading PDF:', error);
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = axiosError.response?.data?.message || axiosError.message || 'Unknown error';
      toast.error(`Failed to download PDF: ${errorMessage}`);
    } finally {
      setDownloadingPDF(null);
    }
  };

  const generateOnlineInvoiceHTML = (order: OrderDetails): string => {
    const formatCurrency = (amount: number | undefined) => {
      const value = amount ?? 0;
      return `${currencySymbol}${value.toFixed(2)}`;
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const deliveryAddr = order.deliveryAddress as any;

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; padding: 0; margin: 0;">
        <div style="height: 8px; background-color: #e22a2a; width: 100%;"></div>
        
        <div style="background-color: #e8e4d9; padding: 32px; border-bottom: 1px solid #d4cdb8;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
            <div>
              ${companySettings?.logoUrl ? `
                <div style="width: 160px; height: 80px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                  <img 
                    src="${companySettings.logoUrl}" 
                    alt="Company Logo" 
                    style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain;" 
                  />
                </div>
              ` : `
                <div style="width: 160px; height: 80px; background-color: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                  <div style="color: #e22a2a; font-weight: bold; font-size: 18px;">${companySettings?.companyName || 'COMPANY'}</div>
                </div>
              `}
            </div>
            
            <div style="text-align: right;">
              <h1 style="font-size: 48px; font-weight: bold; color: black; letter-spacing: 8px; margin: 0 0 24px 0;">TAX INVOICE</h1>
              <div style="background: white; border: 1px solid #a89b7e; padding: 16px; min-width: 220px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 12px; color: #64748b;">Invoice Number</span>
                  <span style="font-size: 12px; font-weight: bold; color: black;">${order.orderNumber}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 12px; color: #64748b;">Invoice Date</span>
                  <span style="font-size: 12px; color: black;">${formatDate(order.createdAt)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 12px; color: #64748b;">Order Status</span>
                  <span style="font-size: 12px; color: black; text-transform: uppercase;">${order.orderStatus}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 48px;">
            <div>
              <p style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px;">BILL FROM</p>
              <div>
                <p style="font-weight: bold; color: black; font-size: 16px; margin-bottom: 8px;">${companySettings?.companyName || 'Company Name'}</p>
                ${companySettings?.address ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">${companySettings.address}</p>` : ''}
                ${companySettings?.city || companySettings?.state || companySettings?.zipCode ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">${[companySettings?.city, companySettings?.state, companySettings?.zipCode].filter(Boolean).join(', ')}</p>` : ''}
                ${companySettings?.country ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">${companySettings.country}</p>` : ''}
                ${companySettings?.gstNumber ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">GSTIN: ${companySettings.gstNumber}</p>` : ''}
              </div>
            </div>
            
            <div>
              <p style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px;">SHIP TO</p>
              <div>
                <p style="font-weight: bold; color: black; font-size: 16px; margin-bottom: 8px;">${deliveryAddr?.name || order.customerName || 'Customer'}</p>
                ${deliveryAddr?.addressLine1 ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">${deliveryAddr.addressLine1}</p>` : ''}
                ${deliveryAddr?.addressLine2 ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">${deliveryAddr.addressLine2}</p>` : ''}
                ${deliveryAddr?.city || deliveryAddr?.state || deliveryAddr?.pincode ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">${[deliveryAddr?.city, deliveryAddr?.state, deliveryAddr?.pincode].filter(Boolean).join(', ')}</p>` : ''}
                ${deliveryAddr?.phone || order.customerPhone ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">Phone: ${deliveryAddr?.phone || order.customerPhone}</p>` : ''}
                ${order.customerEmail ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5;">Email: ${order.customerEmail}</p>` : ''}
              </div>
            </div>
          </div>
        </div>
        
        <div style="padding: 32px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
            <thead>
              <tr style="border-bottom: 2px solid #1f2937;">
                <th style="text-align: left; padding: 12px 8px; font-size: 12px; font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 1px;">#</th>
                <th style="text-align: left; padding: 12px 8px; font-size: 12px; font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 1px;">Item Description</th>
                <th style="text-align: center; padding: 12px 8px; font-size: 12px; font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 1px;">Qty</th>
                <th style="text-align: right; padding: 12px 8px; font-size: 12px; font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 1px;">Rate</th>
                <th style="text-align: center; padding: 12px 8px; font-size: 12px; font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 1px;">GST%</th>
                <th style="text-align: right; padding: 12px 8px; font-size: 12px; font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 1px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item, index) => {
                return `
                  <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                    <td style="padding: 12px 8px; color: #64748b; text-align: center;">${index + 1}</td>
                    <td style="padding: 12px 8px;">
                      <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${item.productName}</div>
                      ${item.variantName ? `<div style="font-size: 11px; color: #9ca3af;">${item.variantName}</div>` : ''}
                      ${item.brand ? `<div style="font-size: 11px; color: #9ca3af;">Brand: ${item.brand}</div>` : ''}
                    </td>
                    <td style="padding: 12px 8px; text-align: center; font-weight: 600; color: #1f2937;">${item.quantity}</td>
                    <td style="padding: 12px 8px; text-align: right; color: #64748b;">${formatCurrency(item.unitPrice)}</td>
                    <td style="padding: 12px 8px; text-align: center; font-weight: 600; color: #1f2937;">${item.gstPercentage ? `${Math.round(item.gstPercentage)}%` : '0%'}</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #1f2937;">${formatCurrency(item.totalAmount)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div style="display: flex; justify-content: flex-end; margin-bottom: 32px;">
            <div style="width: 320px;">
              <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                <span style="color: #64748b;">Subtotal</span>
                <span style="font-weight: 600; color: #1f2937;">${formatCurrency(order.subtotal)}</span>
              </div>
              ${(order.discount ?? 0) > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                  <span style="color: #64748b;">Discount</span>
                  <span style="font-weight: 600; color: #dc2626;">-${formatCurrency(order.discount)}</span>
                </div>
              ` : ''}
              ${(order.couponDiscount ?? 0) > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                  <span style="color: #64748b;">Coupon Discount${order.couponCode ? ` (${order.couponCode})` : ''}</span>
                  <span style="font-weight: 600; color: #dc2626;">-${formatCurrency(order.couponDiscount)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                <span style="color: #64748b;">Tax (GST)</span>
                <span style="font-weight: 600; color: #1f2937;">${formatCurrency(order.tax)}</span>
              </div>
              ${(order.shippingCharge ?? 0) > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                  <span style="color: #64748b;">Shipping Charge</span>
                  <span style="font-weight: 600; color: #1f2937;">${formatCurrency(order.shippingCharge)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding-top: 16px; border-top: 2px solid #1f2937; margin-top: 8px;">
                <span style="font-weight: bold; font-size: 18px; color: #e22a2a;">TOTAL</span>
                <span style="font-weight: bold; font-size: 24px; color: #e22a2a;">${formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
          
          <div style="margin-bottom: 32px; padding: 16px; background-color: #f8fafc; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 14px; color: #64748b;">Payment Method:</span>
              <span style="font-size: 14px; font-weight: 600; color: #1f2937; text-transform: uppercase;">${order.paymentMethod}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 14px; color: #64748b;">Payment Status:</span>
              <span style="font-size: 14px; font-weight: 600; text-transform: uppercase; color: ${
                order.paymentStatus === 'completed' || order.paymentStatus === 'paid' ? '#16a34a' : 
                order.paymentStatus === 'pending' ? '#ca8a04' : '#dc2626'
              };">${order.paymentStatus}</span>
            </div>
          </div>
          
          <div style="margin-bottom: 40px;">
            <div style="border-top: 2px solid #1f2937; width: 250px; padding-top: 8px;">
              <p style="font-weight: bold; color: #1f2937; margin: 0;">Authorized Signatory</p>
              <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Account Manager</p>
            </div>
          </div>
          
          <div style="border-top: 4px solid #e22a2a; padding-top: 12px; text-align: center;">
            <p style="font-size: 12px; font-weight: 600; color: #64748b; letter-spacing: 1px; margin: 0;">
              TAX INVOICE • Invoice Number: ${order.orderNumber}
            </p>
          </div>
        </div>
      </div>
    `;
  };

  

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Online orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencySymbol}{summary.totalAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">Gross sales amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="size-4 mr-2" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={paymentStatusFilter}
            onValueChange={setPaymentStatusFilter}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={orderStatusFilter}
            onValueChange={setOrderStatusFilter}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Order Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Order Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <p className="text-muted-foreground">Loading online sales...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8">
                  <p className="text-muted-foreground">No online sales found</p>
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{sale.orderNumber}</div>
                      {sale.invoiceNumber && (
                        <div className="text-xs text-muted-foreground">
                          {sale.invoiceNumber}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(sale.saleDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{sale.customerName || 'Guest'}</div>
                      {sale.customerEmail && (
                        <div className="text-xs text-muted-foreground">
                          {sale.customerEmail}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{sale.itemCount} items</TableCell>
                  <TableCell>
                    {currencySymbol}
                    {sale.subtotal.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    {currencySymbol}
                    {sale.tax.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    {sale.discount > 0 || (sale.couponDiscount && sale.couponDiscount > 0)
                      ? `${currencySymbol}${(sale.discount + (sale.couponDiscount || 0)).toLocaleString("en-IN")}`
                      : "-"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {currencySymbol}
                    {sale.total.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>{sale.paymentMethod}</TableCell>
                  <TableCell>
                    <Badge variant={paymentStatusColors[sale.paymentStatus]}>
                      {sale.paymentStatus.charAt(0).toUpperCase() +
                        sale.paymentStatus.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={orderStatusColors[sale.orderStatus]}>
                      {sale.orderStatus.charAt(0).toUpperCase() +
                        sale.orderStatus.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="View details"
                        onClick={() => handleViewDetails(sale)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Download PDF"
                        onClick={() => handleDownloadPDF(sale)}
                        disabled={downloadingPDF === sale.orderNumber}
                      >
                        {downloadingPDF === sale.orderNumber ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Download className="size-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalSales)} of{" "}
            {totalSales} sales
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {getPageNumbers().map((page, index) => (
                <PaginationItem key={index}>
                  {page === "ellipsis-start" || page === "ellipsis-end" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(page as number)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Invoice View Modal */}
      <InvoiceView
        order={selectedSale as unknown as Parameters<typeof InvoiceView>[0]['order']}
        companySettings={companySettings}
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
      />
    </div>
  );
}
