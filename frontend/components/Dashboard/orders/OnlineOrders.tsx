"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  IconSearch,
  IconEye,
  IconPackage,
  IconTruck,
  IconCheck,
  IconX,
  IconClock,
  IconFileText,
  IconDownload,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/hooks/useCurrency";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import Barcode from "react-barcode";
import axiosInstance from "@/lib/axios";
import { InvoiceView } from "./InvoiceView";

interface OrderItem {
  productName: string;
  variantName?: string;
  displayName?: string;
  selectedCuttingStyle?: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
  totalPrice?: number; // API returns this field
  gstPercentage?: number;
  gstAmount?: number;
  sku?: string;
  itemCode?: string;
  hsnCode?: string;
  barcodes?: string[]; // Array of barcodes for variants
}

interface OnlineOrder {
  id: string;
  orderNumber: string;
  invoiceNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress?: {
    name?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  items: OrderItem[];
  subtotal: number;
  tax: number;
  taxRate?: number;
  
  // GST Breakdown (based on admin and customer states)
  gstType?: string; // "cgst_sgst" or "igst"
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalGstAmount?: number;
  
  // State Information for GST calculation
  adminState?: string;
  customerState?: string;
  
  discount: number;
  couponCode?: string;
  couponDiscount: number;
  shippingCharge: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

export function OnlineOrders() {
  const currencySymbol = useCurrency();
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
  });

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

  useEffect(() => {
    loadOrders();
    loadCompanySettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, paymentStatusFilter, paymentMethodFilter]);

  const loadCompanySettings = async () => {
    try {
      // Fetch both web settings (for logo) and admin settings (for company details)
      const [webSettingsResponse, adminResponse] = await Promise.all([
        axiosInstance.get("/api/web/web-settings"),
        axiosInstance.get("/api/auth/admin/settings")
      ]);
      
      if (webSettingsResponse.data.success || adminResponse.data.success) {
        console.log('Settings loaded:', { 
          webSettings: webSettingsResponse.data.data,
          admin: adminResponse.data.data 
        });
        
        const adminData = adminResponse.data.data || {};
        
        // Combine both settings - use Admin model data for all company details
        setCompanySettings({
          companyName: adminData.companyName || 'Company',
          logoUrl: webSettingsResponse.data.data?.logoUrl || '', // Logo from web settings
          address: adminData.address || '',
          city: adminData.city || '',
          state: adminData.state || '',
          zipCode: adminData.zipCode || '',
          country: adminData.country || '',
          phone: adminData.phoneNumber || '', // Phone from Admin model
          email: adminData.email || '', // Email from Admin model
          gstNumber: adminData.gstNumber || '',
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit,
      };

      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      if (paymentStatusFilter !== "all")
        params.paymentStatus = paymentStatusFilter;
      if (paymentMethodFilter !== "all")
        params.paymentMethod = paymentMethodFilter;

      const response = await axiosInstance.get("/api/online/admin/orders", {
        params,
      });

      if (response.data.success) {
        setOrders(response.data.data);
        setTotal(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);
        setStats(response.data.summary);
      }
    } catch (error: unknown) {
      console.error("Error loading orders:", error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error 
        : "Failed to load orders";
      toast.error(errorMessage || "Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadOrders();
  };

  const handleDownloadPDF = async (order: OnlineOrder) => {
    setDownloadingPDF(order.orderNumber);
    
    // Debug: Log order data
    console.log('📄 PDF Generation - Order Data:', {
      orderNumber: order.orderNumber,
      hasDeliveryAddress: !!order.deliveryAddress,
      deliveryAddress: order.deliveryAddress,
      gstType: order.gstType,
      cgstAmount: order.cgstAmount,
      sgstAmount: order.sgstAmount,
      igstAmount: order.igstAmount,
      totalGstAmount: order.totalGstAmount,
      tax: order.tax,
      adminState: order.adminState,
      customerState: order.customerState
    });
    
    try {
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

      // Create PDF
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
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingPDF(null);
    }
  };

  const generateProfessionalInvoiceHTML = (order: OnlineOrder): string => {
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
              <h1 style="font-size: 48px; font-weight: bold; color: black; letter-spacing: 8px; margin: 0 0 24px 0;">INVOICE</h1>
              <div style="background: white; border: 1px solid #a89b7e; padding: 16px; min-width: 220px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 12px; color: #64748b;">Invoice Number</span>
                  <span style="font-size: 12px; font-weight: bold; color: black;">${order.invoiceNumber || order.orderNumber}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 12px; color: #64748b;">Invoice Date</span>
                  <span style="font-size: 12px; color: black;">${new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 12px; color: #64748b;">Order Number</span>
                  <span style="font-size: 12px; color: black;">${order.orderNumber}</span>
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
                <p style="font-weight: bold; color: black; font-size: 16px; margin-bottom: 8px;">${order.customerName}</p>
                ${order.deliveryAddress?.name && order.deliveryAddress.name !== order.customerName ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">Recipient: ${order.deliveryAddress.name}</p>` : ''}
                ${order.deliveryAddress?.addressLine1 ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">${order.deliveryAddress.addressLine1}</p>` : ''}
                ${order.deliveryAddress?.addressLine2 ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">${order.deliveryAddress.addressLine2}</p>` : ''}
                ${order.deliveryAddress?.landmark ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">Near: ${order.deliveryAddress.landmark}</p>` : ''}
                ${order.deliveryAddress?.city || order.deliveryAddress?.state || order.deliveryAddress?.pincode ? 
                  `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">${[order.deliveryAddress?.city, order.deliveryAddress?.state, order.deliveryAddress?.pincode].filter(Boolean).join(', ')}</p>` : ''}
                ${order.deliveryAddress?.country ? `<p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">${order.deliveryAddress.country}</p>` : ''}
                ${!order.deliveryAddress?.addressLine1 && !order.deliveryAddress?.city ? `<p style="font-size: 14px; color: #dc2626; line-height: 1.5; margin-bottom: 4px; font-style: italic;">Address not available</p>` : ''}
                <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 4px;">Phone: ${order.deliveryAddress?.phone || order.customerPhone || 'N/A'}</p>
                <p style="font-size: 14px; color: #64748b; line-height: 1.5;">Email: ${order.customerEmail}</p>
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
                <th style="text-align: center; padding: 12px 8px; font-size: 12px; font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 1px;">HSN</th>
                <th style="text-align: center; padding: 12px 8px; font-size: 12px; font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 1px;">Qty</th>
                <th style="text-align: right; padding: 12px 8px; font-size: 12px; font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 1px;">Rate</th>
                <th style="text-align: center; padding: 12px 8px; font-size: 12px; font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 1px;">GST</th>
                <th style="text-align: right; padding: 12px 8px; font-size: 12px; font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 1px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item, index) => {
                const unitPrice = item.unitPrice || 0;
                const totalAmount = item.totalPrice || item.total || (item.quantity * unitPrice);
                const gstPercentage = item.gstPercentage || 0;
                
                return `
                  <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                    <td style="padding: 12px 8px; color: #64748b; text-align: center;">${index + 1}</td>
                    <td style="padding: 12px 8px;">
                      <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${item.displayName || item.variantName || item.productName}</div>
                      ${item.selectedCuttingStyle ? `<div style="font-size: 11px; color: #9ca3af;">Cutting: ${item.selectedCuttingStyle}</div>` : ''}
                      ${(item.sku || item.itemCode) ? `<div style="font-size: 11px; color: #9ca3af;">SKU: ${item.sku || item.itemCode}</div>` : ''}
                    </td>
                    <td style="padding: 12px 8px; text-align: center; color: #64748b;">${item.hsnCode || '-'}</td>
                    <td style="padding: 12px 8px; text-align: center; font-weight: 600; color: #1f2937;">${item.quantity}</td>
                    <td style="padding: 12px 8px; text-align: right; color: #64748b;">${currencySymbol}${unitPrice.toFixed(2)}</td>
                    <td style="padding: 12px 8px; text-align: center; font-weight: 600; color: #1f2937;">${Math.round(gstPercentage)}%</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #1f2937;">${currencySymbol}${totalAmount.toFixed(2)}</td>
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
                <span style="font-weight: 600; color: #1f2937;">${currencySymbol}${order.subtotal.toFixed(2)}</span>
              </div>
              ${order.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                  <span style="color: #64748b;">Discount</span>
                  <span style="font-weight: 600; color: #dc2626;">-${currencySymbol}${order.discount.toFixed(2)}</span>
                </div>
              ` : ''}
              ${order.couponDiscount > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                  <span style="color: #64748b;">Coupon Discount</span>
                  <span style="font-weight: 600; color: #dc2626;">-${currencySymbol}${order.couponDiscount.toFixed(2)}</span>
                </div>
              ` : ''}
              ${(() => {
                // Determine GST type and amounts
                const igstAmount = order.igstAmount || 0;
                const cgstAmount = order.cgstAmount || 0;
                const sgstAmount = order.sgstAmount || 0;
                const totalTax = order.totalGstAmount || order.tax || 0;
                
                const hasIGST = igstAmount > 0;
                const hasCGST = cgstAmount > 0;
                const hasSGST = sgstAmount > 0;
                
                if (hasIGST) {
                  // Inter-state: Show IGST
                  return `
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                      <span style="color: #64748b;">IGST</span>
                      <span style="font-weight: 600; color: #1f2937;">${currencySymbol}${igstAmount.toFixed(2)}</span>
                    </div>
                  `;
                } else if (hasCGST || hasSGST) {
                  // Intra-state: Show CGST + SGST
                  let html = '';
                  if (hasCGST) {
                    html += `
                      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                        <span style="color: #64748b;">CGST</span>
                        <span style="font-weight: 600; color: #1f2937;">${currencySymbol}${cgstAmount.toFixed(2)}</span>
                      </div>
                    `;
                  }
                  if (hasSGST) {
                    html += `
                      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                        <span style="color: #64748b;">SGST</span>
                        <span style="font-weight: 600; color: #1f2937;">${currencySymbol}${sgstAmount.toFixed(2)}</span>
                      </div>
                    `;
                  }
                  return html;
                } else if (totalTax > 0) {
                  // Fallback: Split tax equally between CGST and SGST
                  const halfTax = totalTax / 2;
                  return `
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                      <span style="color: #64748b;">CGST</span>
                      <span style="font-weight: 600; color: #1f2937;">${currencySymbol}${halfTax.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                      <span style="color: #64748b;">SGST</span>
                      <span style="font-weight: 600; color: #1f2937;">${currencySymbol}${halfTax.toFixed(2)}</span>
                    </div>
                  `;
                }
                return '';
              })()}
              ${order.shippingCharge > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                  <span style="color: #64748b;">Shipping</span>
                  <span style="font-weight: 600; color: #1f2937;">${currencySymbol}${order.shippingCharge.toFixed(2)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding-top: 16px; border-top: 2px solid #1f2937; margin-top: 8px;">
                <span style="font-weight: bold; font-size: 18px; color: #e22a2a;">TOTAL</span>
                <span style="font-weight: bold; font-size: 24px; color: #e22a2a;">${currencySymbol}${order.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
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
              INVOICE • Invoice Number: ${order.invoiceNumber || order.orderNumber}
            </p>
          </div>
        </div>
      </div>
    `;
  };

  const handleViewThermalInvoice = (order: OnlineOrder) => {
    // Use the existing thermal print design for viewing
    setSelectedOrder(order);
    setShowInvoiceModal(true);
  };

  const handleStatusChange = async (orderId: string, newStatus: string, currentStatus: string) => {
    if (newStatus === currentStatus) return;

    try {
      setIsUpdatingStatus(orderId);
      const response = await axiosInstance.patch(
        `/api/online/admin/orders/${orderId}/status`,
        { status: newStatus }
      );

      if (response.data.success) {
        toast.success(
          `Order status updated from "${currentStatus}" to "${newStatus}"`,
          {
            description: response.data.message || "Status updated successfully"
          }
        );
        loadOrders();
      }
    } catch (error: unknown) {
      console.error("Error updating status:", error);
      
      // Show specific error message from backend
      const axiosError = error as { response?: { data?: { error?: string; message?: string } } };
      const errorMessage = axiosError.response?.data?.error || "Failed to update status";
      const errorDescription = axiosError.response?.data?.message || "";
      
      toast.error(errorMessage, {
        description: errorDescription,
        duration: 5000
      });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const getStatusDropdown = (order: OnlineOrder) => {
    const isUpdating = isUpdatingStatus === order.id;
    
    // Define status hierarchy for forward-only workflow
    const statusHierarchy: Record<string, number> = {
      'pending': 0,
      'confirmed': 1,
      'packing': 2,
      'shipped': 3,
      'delivered': 4,
      'cancelled': 5
    };

    // Get available next statuses based on current status
    const getAvailableStatuses = (currentStatus: string): string[] => {
      // Cannot change from delivered or cancelled
      if (currentStatus === 'delivered' || currentStatus === 'cancelled') {
        return [currentStatus];
      }

      const currentLevel = statusHierarchy[currentStatus];
      const availableStatuses: string[] = [];

      // Add next status in sequence
      const nextStatus = Object.keys(statusHierarchy).find(
        key => statusHierarchy[key] === currentLevel + 1
      );
      if (nextStatus && nextStatus !== 'cancelled') {
        availableStatuses.push(nextStatus);
      }

      // Always allow cancellation (except for delivered)
      if (currentStatus !== 'delivered') {
        availableStatuses.push('cancelled');
      }

      return availableStatuses;
    };

    const availableStatuses = getAvailableStatuses(order.orderStatus);
    
    // If only current status is available, disable the dropdown
    const isDisabled = isUpdating || availableStatuses.length === 1;
    
    return (
      <Select
        value={order.orderStatus}
        onValueChange={(newStatus) => handleStatusChange(order.id, newStatus, order.orderStatus)}
        disabled={isDisabled}
      >
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue>
            <div className="flex items-center gap-1">
              {isUpdating ? (
                <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                getStatusIcon(order.orderStatus)
              )}
              <span className="capitalize">{order.orderStatus}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Current status (disabled) */}
          <SelectItem value={order.orderStatus} disabled>
            <div className="flex items-center gap-2">
              {getStatusIcon(order.orderStatus)}
              <span className="capitalize">{order.orderStatus} (Current)</span>
            </div>
          </SelectItem>
          
          {/* Available next statuses */}
          {availableStatuses.filter(s => s !== order.orderStatus).map((status) => (
            <SelectItem key={status} value={status}>
              <div className="flex items-center gap-2">
                {getStatusIcon(status)}
                <span className="capitalize">{status}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <IconCheck size={14} className="text-green-600" />;
      case "shipped":
        return <IconTruck size={14} className="text-blue-600" />;
      case "confirmed":
        return <IconCheck size={14} className="text-yellow-600" />;
      case "packing":
        return <IconPackage size={14} className="text-yellow-600" />;
      case "cancelled":
        return <IconX size={14} className="text-red-600" />;
      default:
        return <IconClock size={14} className="text-gray-600" />;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      failed: "bg-red-100 text-red-700",
      refunded: "bg-gray-100 text-gray-700",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          colors[status] || colors.pending
        }`}
      >
        {status}
      </span>
    );
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

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) pages.push("ellipsis-start");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("ellipsis-end");
      pages.push(totalPages);
    }
    return pages;
  };

  if (isLoading && orders.length === 0) {
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="flex gap-2">
              <Input
                placeholder="Search by order number, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} size="sm">
                <IconSearch size={16} />
              </Button>
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Order Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="packing">Packing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={paymentStatusFilter}
            onValueChange={setPaymentStatusFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={paymentMethodFilter}
            onValueChange={setPaymentMethodFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cod">COD</SelectItem>
              <SelectItem value="razorpay">Razorpay</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              {/* <TableHead>Barcodes</TableHead> */}
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-gray-500"
                >
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.orderNumber}
                    {order.invoiceNumber && (
                      <p className="text-xs text-gray-500">
                        {order.invoiceNumber}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {order.customerEmail}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{order.items.length} items</TableCell>
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
                          {order.items.map((item: OrderItem, index: number) => (
                            <div key={index} className="p-2 border-b last:border-b-0">
                              <div className="font-medium text-sm mb-1">
                                {item.displayName || item.variantName || item.productName}
                              </div>
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
                                        <IconDownload size={16} />
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
                    <div className="space-y-1">
                      <p className="text-xs uppercase">{order.paymentMethod}</p>
                      {getPaymentStatusBadge(order.paymentStatus)}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusDropdown(order)}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDetailsModal(true);
                        }}
                        title="View order details"
                      >
                        <IconEye size={16} />
                      </Button>
                      {order.invoiceNumber && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewThermalInvoice(order)}
                            title="View invoice (thermal print design)"
                          >
                            <IconFileText size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPDF(order)}
                            disabled={downloadingPDF === order.orderNumber}
                            title="Download PDF (professional design)"
                          >
                            <IconDownload size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-gray-600">
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, total)} of {total} orders
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
                    {pageNum === "ellipsis-start" || pageNum === "ellipsis-end" ? (
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
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    className={
                      page === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order Number</p>
                  <p className="font-medium">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-medium">
                    {selectedOrder.invoiceNumber || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                  <p className="text-xs text-gray-500">
                    {selectedOrder.customerEmail}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">
                    {selectedOrder.customerPhone || "N/A"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between p-2 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="font-medium">{item.displayName || item.variantName || item.productName}</p>
                        {item.selectedCuttingStyle && (
                          <p className="text-xs text-gray-500">
                            Cutting: {item.selectedCuttingStyle}
                          </p>
                        )}
                        <p className="text-sm">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">
                        {currencySymbol}
                        {(item.totalPrice || item.total || 0).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>
                      {currencySymbol}
                      {(selectedOrder.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>
                        -{currencySymbol}
                        {(selectedOrder.discount || 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {selectedOrder.couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon Discount</span>
                      <span>
                        -{currencySymbol}
                        {(selectedOrder.couponDiscount || 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>
                      {(selectedOrder.shippingCharge || 0) === 0
                        ? "FREE"
                        : `${currencySymbol}${(selectedOrder.shippingCharge || 0).toFixed(
                            2
                          )}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>
                      {currencySymbol}
                      {(selectedOrder.tax || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>
                      {currencySymbol}
                      {(selectedOrder.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice View Modal */}
      <InvoiceView
        order={selectedOrder}
        companySettings={companySettings}
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
      />
    </div>
  );
}
