"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, Download } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

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
  totalGstAmount?: number; // Total GST for the item
  igstAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
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
}

interface InvoiceViewProps {
  order: OnlineOrder | null;
  companySettings: {
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
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceView({ order, companySettings, isOpen, onClose }: InvoiceViewProps) {
  const currencySymbol = useCurrency();
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!order) return null;

  const formatCurrency = (amount: number | undefined) => {
    const value = amount ?? 0;
    return `${currencySymbol}${value.toFixed(2)}`;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Create proper thermal print HTML structure
    const deliveryAddressHtml = order.deliveryAddress ? `
      <div style="display: flex; justify-content: space-between; margin: 2px 0;">
        <span>Delivery:</span>
        <span>${order.deliveryAddress.name || order.customerName}</span>
      </div>
      <div style="font-size: 10px; color: #333; margin: 2px 0;">
        <div>${order.deliveryAddress.addressLine1}</div>
        ${order.deliveryAddress.addressLine2 ? `<div>${order.deliveryAddress.addressLine2}</div>` : ''}
        <div>${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}</div>
      </div>
    ` : '';

    const itemsHtml = order.items.map(item => `
      <div style="margin: 5px 0;">
        <div style="display: grid; grid-template-columns: 2fr 0.5fr 1fr 1.2fr 1fr; gap: 4px; font-size: 11px;">
          <span style="font-weight: bold;">${item.displayName || item.variantName || item.productName}</span>
          <span style="text-align: center;">${item.quantity}</span>
          <span style="text-align: right;">${formatCurrency(item.unitPrice)}</span>
          <span style="text-align: right;">${item.gstPercentage ? `${formatCurrency(item.totalGstAmount || item.igstAmount || item.gstAmount || 0)}(${item.gstPercentage}%)` : '-'}</span>
          <span style="text-align: right; font-weight: bold;">${formatCurrency(item.totalPrice || item.total)}</span>
        </div>
        ${item.selectedCuttingStyle ? `
          <div style="font-size: 10px; color: #333; margin-left: 4px;">
            Cutting: ${item.selectedCuttingStyle}
          </div>
        ` : ''}
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${order.invoiceNumber || order.orderNumber}</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              background: #fff;
              width: 80mm;
              margin: 0 auto;
              padding: 10px;
            }
            .invoice-header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .invoice-header h1 {
              font-size: 18px;
              font-weight: bold;
              margin: 0 0 5px 0;
            }
            .invoice-header p {
              margin: 2px 0;
              font-size: 11px;
            }
            .invoice-info {
              margin-bottom: 10px;
              font-size: 11px;
            }
            .invoice-info div {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .items-table {
              width: 100%;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 5px 0;
              margin: 10px 0;
            }
            .items-header {
              display: grid;
              grid-template-columns: 2fr 0.5fr 1fr 1.2fr 1fr;
              gap: 4px;
              font-size: 11px;
              font-weight: bold;
              border-bottom: 1px dashed #000;
              padding-bottom: 3px;
              margin-bottom: 5px;
            }
            .totals {
              margin-top: 10px;
              border-top: 1px dashed #000;
              padding-top: 5px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
              font-size: 11px;
            }
            .total-row.grand-total {
              font-size: 14px;
              font-weight: bold;
              border-top: 2px solid #000;
              padding-top: 5px;
              margin-top: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 2px dashed #000;
              font-size: 10px;
            }
            .footer p {
              margin: 3px 0;
            }
          </style>
        </head>
        <body>
          <!-- Invoice Header -->
          <div class="invoice-header">
            ${companySettings?.logoUrl ? `
              <div style="position: relative; width: 160px; height: 80px; margin: 0 auto; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <img 
                  src="${companySettings.logoUrl}" 
                  alt="Company Logo" 
                  style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain;" 
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                /'}
              </div>
            ` : ''}
          </div>

          <!-- Invoice Info -->
          <div class="invoice-info">
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span>Invoice No:</span>
              <span style="font-weight: bold;">${order.invoiceNumber || order.orderNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span>Order No:</span>
              <span>${order.orderNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span>Date:</span>
              <span>${formatDate(order.createdAt)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span>Time:</span>
              <span>${new Date(order.createdAt).toLocaleTimeString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span>Customer:</span>
              <span>${order.customerName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span>Phone:</span>
              <span>${order.customerPhone}</span>
            </div>
            ${deliveryAddressHtml}
          </div>

          <!-- Items Table -->
          <div class="items-table">
            <div class="items-header">
              <span>Item</span>
              <span style="text-align: center;">Qty</span>
              <span style="text-align: right;">Price</span>
              <span style="text-align: right;">GST</span>
              <span style="text-align: right;">Total</span>
            </div>
            ${itemsHtml}
          </div>

          <!-- Totals -->
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(order.subtotal)}</span>
            </div>
            ${(order.discount ?? 0) > 0 ? `
              <div class="total-row" style="color: #16a34a;">
                <span>Discount:</span>
                <span>-${formatCurrency(order.discount)}</span>
              </div>
            ` : ''}
            ${(order.couponDiscount ?? 0) > 0 ? `
              <div class="total-row" style="color: #16a34a;">
                <span>Coupon Discount:</span>
                <span>-${formatCurrency(order.couponDiscount)}</span>
              </div>
            ` : ''}
            <div class="total-row">
              <span>Shipping:</span>
              <span>${(order.shippingCharge ?? 0) === 0 ? 'FREE' : formatCurrency(order.shippingCharge)}</span>
            </div>
            
            ${order.gstType === 'cgst_sgst' ? `
              ${(order.cgstAmount || 0) > 0 ? `
                <div class="total-row">
                  <span>CGST:</span>
                  <span>${formatCurrency(order.cgstAmount)}</span>
                </div>
              ` : ''}
              ${(order.sgstAmount || 0) > 0 ? `
                <div class="total-row">
                  <span>SGST:</span>
                  <span>${formatCurrency(order.sgstAmount)}</span>
                </div>
              ` : ''}
            ` : `
              ${(order.igstAmount || 0) > 0 ? `
                <div class="total-row">
                  <span>IGST:</span>
                  <span>${formatCurrency(order.igstAmount)}</span>
                </div>
              ` : ''}
            `}
            
            ${!order.gstType && (order.tax || 0) > 0 ? `
              <div class="total-row">
                <span>Tax (GST):</span>
                <span>${formatCurrency(order.tax)}</span>
              </div>
            ` : ''}
            
            <div class="total-row grand-total">
              <span>FINAL TOTAL:</span>
              <span>${formatCurrency(order.total)}</span>
            </div>
          </div>

          <!-- Payment Method -->
          <div style="margin-top: 10px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span>Payment:</span>
              <span style="font-weight: bold; text-transform: uppercase;">${order.paymentMethod}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span>Status:</span>
              <span style="font-weight: bold; text-transform: uppercase; color: ${
                order.paymentStatus === 'completed' ? '#16a34a' : 
                order.paymentStatus === 'pending' ? '#ca8a04' : '#dc2626'
              };">${order.paymentStatus}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="font-weight: bold; margin: 3px 0;">Thank You, Please Come Again!</p>
            <p style="margin: 3px 0;">${companySettings?.companyName || 'LEATS'}</p>
            <p style="margin: 3px 0;">Powered by E-Commerce System</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = async () => {
    if (!order) return;

    setIsDownloading(true);
    try {
      // Create a temporary hidden div with the thermal print design
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.top = '0';
      tempDiv.style.left = '0';
      tempDiv.style.zIndex = '-9999';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.width = '80mm'; // Thermal print width
      tempDiv.style.fontFamily = "'Courier New', monospace";
      tempDiv.style.fontSize = '12px';
      tempDiv.style.lineHeight = '1.4';
      tempDiv.style.color = '#000';
      tempDiv.style.padding = '10px';
      
      // Create the thermal print HTML
      tempDiv.innerHTML = generateThermalPrintHTML(order);
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
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        width: tempDiv.scrollWidth,
        height: tempDiv.scrollHeight,
      });

      // Remove temporary div
      document.body.removeChild(tempDiv);

      // Create PDF with thermal print dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, Math.max(200, (canvas.height * 80) / canvas.width)], // Dynamic height based on content
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // Add image to PDF
      if (imgHeight > pdfHeight) {
        // If content is too tall, scale it down
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
      
    } catch (error: unknown) {
      console.error('Error downloading PDF:', error);
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = axiosError.response?.data?.message || axiosError.message || 'Unknown error';
      alert(`Failed to download PDF: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const generateThermalPrintHTML = (order: OnlineOrder): string => {
    const deliveryAddressHtml = order.deliveryAddress ? `
      <div style="display: flex; justify-content: space-between; margin: 2px 0;">
        <span>Delivery:</span>
        <span>${order.deliveryAddress.name || order.customerName}</span>
      </div>
      <div style="font-size: 10px; color: #333; margin: 2px 0;">
        <div>${order.deliveryAddress.addressLine1}</div>
        ${order.deliveryAddress.addressLine2 ? `<div>${order.deliveryAddress.addressLine2}</div>` : ''}
        <div>${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}</div>
      </div>
    ` : '';

    const itemsHtml = order.items.map(item => `
      <div style="margin: 5px 0;">
        <div style="display: grid; grid-template-columns: 2fr 0.5fr 1fr 1.2fr 1fr; gap: 4px; font-size: 11px;">
          <span style="font-weight: bold;">${item.displayName || item.variantName || item.productName}</span>
          <span style="text-align: center;">${item.quantity}</span>
          <span style="text-align: right;">${formatCurrency(item.unitPrice)}</span>
          <span style="text-align: right;">${item.gstPercentage ? `${formatCurrency(item.totalGstAmount || item.igstAmount || item.gstAmount || 0)}(${item.gstPercentage}%)` : '-'}</span>
          <span style="text-align: right; font-weight: bold;">${formatCurrency(item.totalPrice || item.total)}</span>
        </div>
        ${item.selectedCuttingStyle ? `
          <div style="font-size: 10px; color: #333; margin-left: 4px;">
            Cutting: ${item.selectedCuttingStyle}
          </div>
        ` : ''}
      </div>
    `).join('');

    return `
      <!-- Invoice Header -->
      <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
        ${companySettings?.logoUrl ? `
          <div style="position: relative; width: 160px; height: 80px; margin: 0 auto; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <img 
              src="${companySettings.logoUrl}" 
              alt="Company Logo" 
              style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain;" 
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
            />
          </div>
        ` : ''}
      </div>

      <!-- Invoice Info -->
      <div style="margin-bottom: 10px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Invoice No:</span>
          <span style="font-weight: bold;">${order.invoiceNumber || order.orderNumber}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Order No:</span>
          <span>${order.orderNumber}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Date:</span>
          <span>${formatDate(order.createdAt)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Time:</span>
          <span>${new Date(order.createdAt).toLocaleTimeString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Customer:</span>
          <span>${order.customerName}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Phone:</span>
          <span>${order.customerPhone}</span>
        </div>
        ${deliveryAddressHtml}
      </div>

      <!-- Items Table -->
      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin: 10px 0;">
        <div style="display: grid; grid-template-columns: 2fr 0.5fr 1fr 1.2fr 1fr; gap: 4px; font-size: 11px; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 3px; margin-bottom: 5px;">
          <span style="text-align: left;">Item</span>
          <span style="text-align: center;">Qty</span>
          <span style="text-align: right;">Price</span>
          <span style="text-align: right;">GST</span>
          <span style="text-align: right;">Total</span>
        </div>
        ${itemsHtml}
      </div>

      <!-- Totals -->
      <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px;">
        <div style="display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px;">
          <span>Subtotal:</span>
          <span>${formatCurrency(order.subtotal)}</span>
        </div>
        ${(order.discount ?? 0) > 0 ? `
          <div style="display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; color: #16a34a;">
            <span>Discount:</span>
            <span>-${formatCurrency(order.discount)}</span>
          </div>
        ` : ''}
        ${(order.couponDiscount ?? 0) > 0 ? `
          <div style="display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; color: #16a34a;">
            <span>Coupon Discount:</span>
            <span>-${formatCurrency(order.couponDiscount)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px;">
          <span>Shipping:</span>
          <span>${(order.shippingCharge ?? 0) === 0 ? 'FREE' : formatCurrency(order.shippingCharge)}</span>
        </div>
        
        ${order.gstType === 'cgst_sgst' ? `
          ${(order.cgstAmount || 0) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px;">
              <span>CGST:</span>
              <span>${formatCurrency(order.cgstAmount)}</span>
            </div>
          ` : ''}
          ${(order.sgstAmount || 0) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px;">
              <span>SGST:</span>
              <span>${formatCurrency(order.sgstAmount)}</span>
            </div>
          ` : ''}
        ` : `
          ${(order.igstAmount || 0) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px;">
              <span>IGST:</span>
              <span>${formatCurrency(order.igstAmount)}</span>
            </div>
          ` : ''}
        `}
        
        ${!order.gstType && (order.tax || 0) > 0 ? `
          <div style="display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px;">
            <span>Tax (GST):</span>
            <span>${formatCurrency(order.tax)}</span>
          </div>
        ` : ''}
        
        <div style="display: flex; justify-content: space-between; margin: 3px 0; font-size: 14px; font-weight: bold; border-top: 2px solid #000; padding-top: 5px; margin-top: 5px;">
          <span>FINAL TOTAL:</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
      </div>

      <!-- Payment Method -->
      <div style="margin-top: 10px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Payment:</span>
          <span style="font-weight: bold; text-transform: uppercase;">${order.paymentMethod}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Status:</span>
          <span style="font-weight: bold; text-transform: uppercase; color: ${
            order.paymentStatus === 'completed' ? '#16a34a' : 
            order.paymentStatus === 'pending' ? '#ca8a04' : '#dc2626'
          };">${order.paymentStatus}</span>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 2px dashed #000; font-size: 10px;">
        <p style="font-weight: bold; margin: 3px 0;">Thank You, Please Come Again!</p>
        
      </div>
    `;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Invoice View
          </DialogTitle>
        </DialogHeader>

        {/* Thermal Print Preview */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b">
            <p className="text-xs text-gray-600 text-center">Thermal Print Preview (80mm)</p>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto" style={{ fontFamily: "'Courier New', monospace", fontSize: "12px", lineHeight: "1.4" }}>
            <div ref={printRef}>
              {/* Invoice Header */}
              <div className="text-center border-b-2 border-dashed border-gray-800 pb-3 mb-3">
                {companySettings?.logoUrl && (
                  <div className="relative w-40 h-20 flex items-center justify-center overflow-hidden mx-auto">
                    <Image 
                      src={companySettings.logoUrl} 
                      alt="Company Logo" 
                      fill
                      sizes="160px"
                      className="object-contain"
                      priority={true}
                      quality={90}
                    />
                  </div>
                )}
              </div>

              {/* Invoice Info */}
              <div className="mb-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Invoice No:</span>
                  <span className="font-semibold">{order.invoiceNumber || order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order No:</span>
                  <span>{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{order.customerPhone}</span>
                </div>
                {order.deliveryAddress && (
                  <>
                    <div className="flex justify-between">
                      <span>Delivery:</span>
                      <span>{order.deliveryAddress.name || order.customerName}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      <div>{order.deliveryAddress.addressLine1}</div>
                      {order.deliveryAddress.addressLine2 && (
                        <div>{order.deliveryAddress.addressLine2}</div>
                      )}
                      <div>{order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}</div>
                    </div>
                  </>
                )}
              </div>

              {/* Items Table */}
              <div className="border-t border-b border-dashed border-gray-800 py-2 my-3">
                <div className="grid grid-cols-[2fr_0.5fr_1fr_1.2fr_1fr] gap-1 text-xs font-bold border-b border-gray-800 pb-1 mb-2">
                  <span className="text-left">Item</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">GST</span>
                  <span className="text-right">Total</span>
                </div>
                {order.items.map((item, index) => {
                  return (
                    <div key={index} className="mb-2">
                      <div className="grid grid-cols-[2fr_0.5fr_1fr_1.2fr_1fr] gap-1 text-xs">
                        <span className="font-semibold text-left">{item.displayName || item.variantName || item.productName}</span>
                        <span className="text-center">{item.quantity}</span>
                        <span className="text-right">{formatCurrency(item.unitPrice)}</span>
                        <span className="text-right">{item.gstPercentage ? `${item.gstPercentage}%` : '-'}</span>
                        <span className="text-right font-semibold">{formatCurrency(item.totalPrice || item.total)}</span>
                      </div>
                      {item.selectedCuttingStyle && (
                        <div className="text-xs text-gray-600 ml-1">
                          Cutting: {item.selectedCuttingStyle}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {(order.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                {(order.couponDiscount ?? 0) > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Coupon Discount:</span>
                    <span>-{formatCurrency(order.couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span>Shipping:</span>
                  <span>{(order.shippingCharge ?? 0) === 0 ? 'FREE' : formatCurrency(order.shippingCharge)}</span>
                </div>
                
                {/* GST Breakdown */}
                {order.gstType === 'cgst_sgst' ? (
                  <>
                    {(order.cgstAmount || 0) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>CGST:</span>
                        <span>{formatCurrency(order.cgstAmount)}</span>
                      </div>
                    )}
                    {(order.sgstAmount || 0) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>SGST:</span>
                        <span>{formatCurrency(order.sgstAmount)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {(order.igstAmount || 0) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>IGST:</span>
                        <span>{formatCurrency(order.igstAmount)}</span>
                      </div>
                    )}
                  </>
                )}
                
                {/* Fallback for orders without GST breakdown */}
                {!order.gstType && (order.tax || 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>Tax (GST):</span>
                    <span>{formatCurrency(order.tax)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm font-bold border-t-2 border-gray-800 pt-2 mt-2">
                  <span>FINAL TOTAL:</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mt-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span className="font-bold uppercase">{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`font-bold uppercase ${
                    order.paymentStatus === 'completed' ? 'text-green-600' : 
                    order.paymentStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-4 pt-3 border-t-2 border-dashed border-gray-800">
                <p className="text-xs font-bold mb-1">Thank You, Please Come Again!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={handlePrint}
            className="flex-1"
            variant="default"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </Button>
          <Button
            onClick={handleDownload}
            className="flex-1"
            variant="outline"
            disabled={isDownloading}
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download PDF'}
          </Button>
        </div>

        <Button
          onClick={onClose}
          variant="ghost"
          className="w-full mt-2"
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}