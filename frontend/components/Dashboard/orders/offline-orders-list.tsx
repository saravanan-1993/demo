"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Search, Download, ChevronDown } from "lucide-react";
import { posOrderService, POSOrder } from "@/services/posOrderService";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import Barcode from "react-barcode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { POSInvoiceView } from "./POSInvoiceView";
import axiosInstance from "@/lib/axios";

interface POSOrderItemWithBarcodes {
  productId: string;
  productName: string;
  productSku?: string;
  barcodes?: string[];
  unitPrice: number;
  quantity: number;
  discount: number;
  subtotal: number;
  total: number;
  gstPercentage: number;
  gstAmount: number;
  priceBeforeGst: number;
}

export function OfflineOrdersList() {
  const [orders, setOrders] = useState<POSOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    limit: 20,
  });
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<POSOrder | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);

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

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  

  const currencySymbol = useCurrency();

  useEffect(() => {
    fetchOrders();
    loadCompanySettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, paymentMethodFilter]);

  const loadCompanySettings = async () => {
    try {
      // Fetch both web settings (for logo) and admin settings (for company details)
      const [webSettingsResponse, adminResponse] = await Promise.all([
        axiosInstance.get("/api/web/web-settings"),
        axiosInstance.get("/api/auth/admin/settings")
      ]);
      
      if (webSettingsResponse.data.success || adminResponse.data.success) {
        const adminData = adminResponse.data.data || {};
        
        // Combine both settings
        setCompanySettings({
          companyName: adminData.companyName || 'Company',
          logoUrl: webSettingsResponse.data.data?.logoUrl || '', // Logo from web settings
          address: adminData.address || '',
          city: adminData.city || '',
          state: adminData.state || '',
          zipCode: adminData.zipCode || '',
          country: adminData.country || '',
          phone: '', // Admin settings doesn't have phone
          email: '', // Admin settings doesn't have email
          gstNumber: adminData.gstNumber || '',
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit: 20,
      };

      if (statusFilter !== "all") params.orderStatus = statusFilter;
      if (paymentMethodFilter !== "all") params.paymentMethod = paymentMethodFilter;
     

      const response = await posOrderService.getOrders(params);
      
      // Filter by search on client side (order number or customer name)
      let filteredOrders = response.data;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredOrders = response.data.filter(
          (order) =>
            order.orderNumber.toLowerCase().includes(searchLower) ||
            (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
            (order.customerPhone && order.customerPhone.includes(search))
        );
      }

      setOrders(filteredOrders);
      setPagination(response.pagination);
    } catch (error: unknown) {
      console.error("Error fetching orders:", error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : "Failed to fetch orders";
      toast.error(errorMessage || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const handleDownloadPDF = async (orderNumber: string) => {
    setDownloadingPDF(orderNumber);
    try {
      // Find the order
      const order = orders.find(o => o.orderNumber === orderNumber);
      if (!order) {
        toast.error('Order not found');
        return;
      }

      // Create a temporary hidden div with the professional invoice design
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.top = '0';
      tempDiv.style.left = '0';
      tempDiv.style.zIndex = '-9999';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.width = '210mm'; // A4 width
      tempDiv.style.minHeight = '297mm'; // A4 height
      
      // Create the professional invoice HTML
      tempDiv.innerHTML = generateProfessionalInvoiceHTML(order);
      document.body.appendChild(tempDiv);

      // Ensure logo is CORS-friendly for html2canvas
      const logoImg = tempDiv.querySelector('img') as HTMLImageElement;
      if (logoImg && companySettings?.logoUrl) {
        logoImg.crossOrigin = "anonymous";
        logoImg.referrerPolicy = "no-referrer";
        logoImg.src = companySettings.logoUrl;
        // Wait for logo to load
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate PDF using html2canvas and jsPDF
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

      // Remove temporary div
      document.body.removeChild(tempDiv);

      // Create PDF with A4 dimensions
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

      // Scale to fit on single page
      if (imgHeight > pdfHeight) {
        const scale = pdfHeight / imgHeight;
        const scaledWidth = imgWidth * scale;
        const scaledHeight = pdfHeight;
        const xOffset = (pdfWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, 0, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }

      // Download the PDF
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

  const generateProfessionalInvoiceHTML = (order: POSOrder): string => {
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

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; padding: 0; margin: 0;">
        <!-- Top Red Border -->
        <div style="height: 8px; background-color: #e22a2a; width: 100%;"></div>
        
        <!-- Header with Beige Background -->
        <div style="background-color: #e8e4d9; padding: 32px; border-bottom: 1px solid #d4cdb8;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
            <!-- Logo Section -->
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
            
            <!-- Title and Details -->
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
                  <span style="font-size: 12px; color: #64748b;">Time</span>
                  <span style="font-size: 12px; color: black;">${new Date(order.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Address Section -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 48px;">
            <!-- Bill From -->
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
            
            <!-- Bill To -->
            <div>
              <p style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px;">BILL TO</p>
              <div>
                <p style="font-weight: bold; color: black; font-size: 16px; margin-bottom: 8px;">${order.customerName || 'Walk-in Customer'}</p>
                ${order.customerPhone ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">Phone: ${order.customerPhone}</p>` : ''}
                ${order.createdBy ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5;">Cashier: ${order.createdBy}</p>` : ''}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 32px;">
          <!-- Items Table -->
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
                      ${item.productSku ? `<div style="font-size: 11px; color: #9ca3af;">SKU: ${item.productSku}</div>` : ''}
                    </td>
                    <td style="padding: 12px 8px; text-align: center; font-weight: 600; color: #1f2937;">${item.quantity}</td>
                    <td style="padding: 12px 8px; text-align: right; color: #64748b;">${formatCurrency(item.unitPrice)}</td>
                    <td style="padding: 12px 8px; text-align: center; font-weight: 600; color: #1f2937;">${item.gstPercentage ? `${Math.round(item.gstPercentage)}%` : '0%'}</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #1f2937;">${formatCurrency(item.total)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <!-- Summary -->
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
              <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                <span style="color: #64748b;">Tax (GST)</span>
                <span style="font-weight: 600; color: #1f2937;">${formatCurrency(order.tax)}</span>
              </div>
              ${(order.roundingOff ?? 0) !== 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                  <span style="color: #64748b;">Rounding Off</span>
                  <span style="font-weight: 600; color: #1f2937;">${formatCurrency(order.roundingOff)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding-top: 16px; border-top: 2px solid #1f2937; margin-top: 8px;">
                <span style="font-weight: bold; font-size: 18px; color: #e22a2a;">TOTAL</span>
                <span style="font-weight: bold; font-size: 24px; color: #e22a2a;">${formatCurrency(order.total)}</span>
              </div>
              ${order.amountReceived ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; margin-top: 8px;">
                  <span style="color: #64748b;">Amount Received</span>
                  <span style="font-weight: 600; color: #1f2937;">${formatCurrency(order.amountReceived)}</span>
                </div>
              ` : ''}
              ${(order.changeGiven ?? 0) > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                  <span style="color: #64748b;">Change Given</span>
                  <span style="font-weight: 600; color: #16a34a;">${formatCurrency(order.changeGiven)}</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Payment Info -->
          <div style="margin-bottom: 32px; padding: 16px; background-color: #f8fafc; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 14px; color: #64748b;">Payment Method:</span>
              <span style="font-size: 14px; font-weight: 600; color: #1f2937; text-transform: uppercase;">${order.paymentMethod}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 14px; color: #64748b;">Payment Status:</span>
              <span style="font-size: 14px; font-weight: 600; text-transform: uppercase; color: ${
                order.paymentStatus === 'completed' ? '#16a34a' : 
                order.paymentStatus === 'pending' ? '#ca8a04' : '#dc2626'
              };">${order.paymentStatus}</span>
            </div>
          </div>
          
          <!-- Signature -->
          <div style="margin-bottom: 40px;">
            <div style="border-top: 2px solid #1f2937; width: 250px; padding-top: 8px;">
              <p style="font-weight: bold; color: #1f2937; margin: 0;">Authorized Signatory</p>
              <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Account Manager</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="border-top: 4px solid #e22a2a; padding-top: 12px; text-align: center;">
            <p style="font-size: 12px; font-weight: 600; color: #64748b; letter-spacing: 1px; margin: 0;">
              TAX INVOICE • Invoice Number: ${order.orderNumber}
            </p>
          </div>
        </div>
      </div>
    `;
  };

  const handlePreviewPDF = async (orderNumber: string) => {
    try {
      await posOrderService.previewInvoicePDF(orderNumber);
    } catch (error: unknown) {
      console.error('Error previewing PDF:', error);
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = axiosError.response?.data?.message || axiosError.message || 'Unknown error';
      toast.error(`Failed to preview PDF: ${errorMessage}`);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPaymentMethodFilter("all");
   
    setPage(1);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-500 text-white",
      pending: "bg-yellow-500 text-white",
      cancelled: "bg-red-500 text-white",
      refunded: "bg-gray-500 text-white",
    };
    return colors[status] || "bg-gray-500 text-white";
  };

  const getPaymentMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      cash: "bg-blue-500 text-white",
      card: "bg-purple-500 text-white",
      upi: "bg-green-500 text-white",
    };
    return colors[method] || "bg-gray-500 text-white";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (pagination.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= pagination.totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) pages.push("ellipsis-start");
      const start = Math.max(2, page - 1);
      const end = Math.min(pagination.totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (page < pagination.totalPages - 2) pages.push("ellipsis-end");
      pages.push(pagination.totalPages);
    }
    return pages;
  };

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="flex gap-2">
              <Input
                placeholder="Search by order number, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} size="sm">
                <Search size={16} />
              </Button>
            </div>
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Order Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>

          {/* Payment Method Filter */}
          <Select
            value={paymentMethodFilter}
            onValueChange={setPaymentMethodFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
            </SelectContent>
          </Select>

        </div>

        {/* Clear Filters Button */}
        {(search || statusFilter !== "all" || paymentMethodFilter !== "all") && (
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">No POS orders found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Items</TableHead>
                  {/* <TableHead>Barcodes</TableHead> */}
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      {order.customerName || "Walk-in Customer"}
                    </TableCell>
                    <TableCell>{order.customerPhone || "-"}</TableCell>
                    <TableCell>{order.items?.length || 0} items</TableCell>
                    {/* <TableCell>
                      {order.items && order.items.length > 0 ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                              View Barcodes
                              <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-80">
                            {order.items.map((item: POSOrderItemWithBarcodes, index: number) => (
                              <div key={index} className="p-2 border-b last:border-b-0">
                                <div className="font-medium text-sm mb-1">{item.productName}</div>
                                {item.barcodes && item.barcodes.length > 0 ? (
                                  <div className="space-y-2">
                                    {item.barcodes.map((barcode: string, bIndex: number) => (
                                      <div key={bIndex} className="flex items-center justify-between gap-2">
                                        <div className="flex-1 bg-white p-2 rounded border">
                                          <Barcode value={barcode} width={1} height={30} fontSize={10} />
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const canvas = document.createElement('canvas');
                                            const ctx = canvas.getContext('2d');
                                            if (!ctx) return;
                                            
                                            const tempDiv = document.createElement('div');
                                            tempDiv.style.position = 'fixed';
                                            tempDiv.style.left = '-9999px';
                                            document.body.appendChild(tempDiv);
                                            
                                            import('react-dom/client').then(({ createRoot }) => {
                                              const root = createRoot(tempDiv);
                                              root.render(<Barcode value={barcode} />);
                                              
                                              setTimeout(() => {
                                                const svg = tempDiv.querySelector('svg');
                                                if (svg) {
                                                  const svgData = new XMLSerializer().serializeToString(svg);
                                                  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                                                  const url = URL.createObjectURL(svgBlob);
                                                  const link = document.createElement('a');
                                                  link.href = url;
                                                  link.download = `barcode-${barcode}.svg`;
                                                  document.body.appendChild(link);
                                                  link.click();
                                                  document.body.removeChild(link);
                                                  URL.revokeObjectURL(url);
                                                  toast.success('Barcode downloaded');
                                                }
                                                root.unmount();
                                                document.body.removeChild(tempDiv);
                                              }, 100);
                                            });
                                          }}
                                          title="Download barcode"
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No barcode</p>
                                )}
                              </div>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell> */}
                    <TableCell className="font-semibold">
                      {currencySymbol}
                      {(order.total || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.orderStatus)}>
                        {order.orderStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getPaymentMethodColor(order.paymentMethod)}
                      >
                        {order.paymentMethod.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              // Fetch full order details to get GST data
                              const response = await axiosInstance.get(`/api/pos/orders/${order.id}`);
                              console.log('POS Order Data:', response.data.data); // Debug log
                              if (response.data.success) {
                                const orderData = response.data.data;
                                // Ensure tax field exists
                                if (!orderData.tax && orderData.items) {
                                  // Calculate total tax from items if not present
                                  orderData.tax = orderData.items.reduce((sum: number, item: POSOrderItemWithBarcodes) => {
                                    return sum + (item.gstAmount || 0);
                                  }, 0);
                                }
                                console.log('Order with tax:', orderData); // Debug log
                                setSelectedOrder(orderData);
                                setShowInvoiceModal(true);
                              } else {
                                toast.error('Failed to fetch order details');
                              }
                            } catch (error) {
                              console.error('Error fetching order details:', error);
                              toast.error('Failed to fetch order details');
                            }
                          }}
                          title="View invoice"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewPDF(order.orderNumber)}
                          title="Preview PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </Button> */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(order.orderNumber)}
                          disabled={downloadingPDF === order.orderNumber}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total} orders
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={
                          page === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {getPageNumbers().map((pageNum, index) => (
                      <PaginationItem key={index}>
                        {pageNum === "ellipsis-start" ||
                        pageNum === "ellipsis-end" ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={() => setPage(pageNum as number)}
                            isActive={page === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setPage((p) => Math.min(pagination.totalPages, p + 1))
                        }
                        className={
                          page === pagination.totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* Invoice Modal */}
      <POSInvoiceView
        order={selectedOrder}
        companySettings={companySettings}
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
      />
    </div>
  );
}
