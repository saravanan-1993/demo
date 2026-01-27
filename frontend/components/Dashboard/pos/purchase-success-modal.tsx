"use client";

import React, { useRef } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, CheckCircle } from "lucide-react";
import { CartItem, Customer } from "./pos-interface";

interface PurchaseSuccessModalProps {
  open: boolean;
  onClose: () => void;
  invoiceNumber: string;
  orderDate: string;
  cartItems: CartItem[];
  customer: Customer | null;
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
  subtotal: number;
  total: number;
  roundingOff: number;
  paymentMethod: string;
  formatCurrency: (amount: number, options?: { showSymbol?: boolean; showCode?: boolean; precision?: number }) => string;
}

export const PurchaseSuccessModal: React.FC<PurchaseSuccessModalProps> = ({
  open,
  onClose,
  invoiceNumber,
  orderDate,
  cartItems,
  customer,
  companySettings,
  subtotal,
  total,
  roundingOff,
  paymentMethod,
  formatCurrency,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Create proper thermal print HTML structure
    const itemsHtml = cartItems.map(item => {
      const itemTotal = item.price * item.quantity;
      let discountAmount = 0;
      if (item.discount && item.discount > 0) {
        if (item.discountType === "flat") {
          discountAmount = item.discount;
        } else {
          discountAmount = (itemTotal * item.discount) / 100;
        }
      }
      const finalAmount = itemTotal - discountAmount;
      
      // Calculate GST breakdown
      const gstPercentage = item.gstPercentage || 0;
      const priceBeforeGst = finalAmount / (1 + gstPercentage / 100);
      const gstAmount = finalAmount - priceBeforeGst;
      const unitPriceBeforeGst = priceBeforeGst / item.quantity;

      return `
        <div style="margin: 5px 0;">
          <div style="display: grid; grid-template-columns: 2fr 0.5fr 1fr 1.2fr 1fr; gap: 4px; font-size: 11px;">
            <span style="font-weight: bold;">${item.name}</span>
            <span style="text-align: center;">${item.quantity}</span>
            <span style="text-align: right;">${formatCurrency(unitPriceBeforeGst)}</span>
            <span style="text-align: right;">${gstPercentage > 0 ? `${formatCurrency(gstAmount)}(${gstPercentage}%)` : '-'}</span>
            <span style="text-align: right; font-weight: bold;">${formatCurrency(finalAmount)}</span>
          </div>
          ${item.discount && item.discount > 0 ? `
            <div style="font-size: 10px; color: #333; margin-left: 4px;">
              Disc: ${item.discountType === "flat" ? formatCurrency(item.discount) : `${item.discount}%`}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceNumber}</title>
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
                />
              </div>
            ` : `<h1>${companySettings?.companyName || 'LEATS'}</h1>`}
            ${companySettings?.address ? `<p>${companySettings.address}</p>` : ''}
            ${companySettings?.city || companySettings?.state || companySettings?.zipCode ? `<p>${[companySettings?.city, companySettings?.state, companySettings?.zipCode].filter(Boolean).join(', ')}</p>` : ''}
            ${companySettings?.gstNumber ? `<p>GSTIN: ${companySettings.gstNumber}</p>` : ''}
          </div>

          <!-- Invoice Info -->
          <div class="invoice-info">
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span>Invoice No:</span>
              <span style="font-weight: bold;">${invoiceNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span>Date:</span>
              <span>${orderDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span>Time:</span>
              <span>${new Date().toLocaleTimeString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span>Customer:</span>
              <span>${customer?.name || "Walk-in Customer"}</span>
            </div>
            ${customer?.phone ? `
              <div style="display: flex; justify-content: space-between; margin: 2px 0;">
                <span>Phone:</span>
                <span>${customer.phone}</span>
              </div>
            ` : ''}
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
              <span>${formatCurrency(subtotal)}</span>
            </div>
            ${subtotal !== total ? `
              <div class="total-row" style="color: #16a34a;">
                <span>Discount:</span>
                <span>-${formatCurrency(subtotal - total)}</span>
              </div>
            ` : ''}
            <div class="total-row">
              <span>Total:</span>
              <span>${formatCurrency(total)}</span>
            </div>
            ${roundingOff !== 0 ? `
              <div class="total-row">
                <span>Rounding Off:</span>
                <span style="color: ${roundingOff >= 0 ? '#16a34a' : '#dc2626'};">
                  ${roundingOff >= 0 ? '+' : ''}${formatCurrency(Math.abs(roundingOff))}
                </span>
              </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>FINAL TOTAL:</span>
              <span>${formatCurrency(total + roundingOff)}</span>
            </div>
          </div>

          <!-- Payment Method -->
          <div style="margin-top: 10px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; margin: 2px 0;">
              <span>Payment:</span>
              <span style="font-weight: bold; text-transform: uppercase;">${paymentMethod}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="font-weight: bold; margin: 3px 0;">Thank You, Please Come Again!</p>
            <p style="margin: 3px 0;">${companySettings?.companyName || 'LEATS'}</p>
            <p style="margin: 3px 0;">Powered by POS System</p>
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
    const printContent = printRef.current;
    if (!printContent) {
      alert('Receipt content not found');
      return;
    }

    try {
      // Dynamically import libraries
      const jsPDF = (await import('jspdf')).jsPDF;

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 297], // 80mm width, A4 height
      });

      // Set font
      pdf.setFont('courier');
      pdf.setFontSize(10);

      let yPos = 10;
      const lineHeight = 5;
      const pageWidth = 80;

      // Helper function to add centered text
      const addCenteredText = (text: string, fontSize = 10, bold = false) => {
        pdf.setFontSize(fontSize);
        const textWidth = pdf.getTextWidth(text);
        const x = (pageWidth - textWidth) / 2;
        pdf.text(text, x, yPos);
        yPos += lineHeight;
      };

      // Helper function to add line
      const addLine = (text: string, value: string) => {
        pdf.setFontSize(9);
        pdf.text(text, 5, yPos);
        const valueWidth = pdf.getTextWidth(value);
        pdf.text(value, pageWidth - valueWidth - 5, yPos);
        yPos += lineHeight;
      };

      // Header
      pdf.setFontSize(14);
      addCenteredText(companySettings?.companyName || 'LEATS', 14);
      pdf.setFontSize(8);
      if (companySettings?.address) {
        addCenteredText(companySettings.address, 8);
      }
      if (companySettings?.city || companySettings?.state || companySettings?.zipCode) {
        addCenteredText([companySettings?.city, companySettings?.state, companySettings?.zipCode].filter(Boolean).join(', '), 8);
      }
      if (companySettings?.gstNumber) {
        addCenteredText(`GSTIN: ${companySettings.gstNumber}`, 8);
      }
      
      yPos += 3;
      pdf.line(5, yPos, pageWidth - 5, yPos);
      yPos += 5;

      // Invoice Info
      addLine('Invoice No:', invoiceNumber);
      addLine('Date:', orderDate);
      addLine('Time:', new Date().toLocaleTimeString());
      addLine('Customer:', customer?.name || 'Walk-in');
      if (customer?.phone) {
        addLine('Phone:', customer.phone);
      }

      yPos += 3;
      pdf.line(5, yPos, pageWidth - 5, yPos);
      yPos += 5;

      // Items Header
      pdf.setFontSize(7);
      pdf.text('Item', 5, yPos);
      pdf.text('Qty', 35, yPos);
      pdf.text('Price', 43, yPos);
      pdf.text('GST', 55, yPos);
      pdf.text('Total', 70, yPos);
      yPos += 3;
      pdf.line(5, yPos, pageWidth - 5, yPos);
      yPos += 4;

      // Items
      cartItems.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        let discountAmount = 0;
        if (item.discount && item.discount > 0) {
          if (item.discountType === 'flat') {
            discountAmount = item.discount;
          } else {
            discountAmount = (itemTotal * item.discount) / 100;
          }
        }
        const finalAmount = itemTotal - discountAmount;

        // Calculate GST breakdown
        const gstPercentage = item.gstPercentage || 0;
        const priceBeforeGst = finalAmount / (1 + gstPercentage / 100);
        const gstAmount = finalAmount - priceBeforeGst;
        const unitPriceBeforeGst = priceBeforeGst / item.quantity;

        // Item name (truncate if too long)
        const itemName = item.name.length > 14 ? item.name.substring(0, 14) + '...' : item.name;
        pdf.setFontSize(7);
        pdf.text(itemName, 5, yPos);
        pdf.text(item.quantity.toString(), 36, yPos, { align: 'center' });
        
        // Format price without currency symbol for better fit
        const priceText = unitPriceBeforeGst.toFixed(2);
        pdf.text(priceText, 43, yPos);
        
        // GST text with amount and percentage
        const gstText = gstPercentage > 0 ? `${gstAmount.toFixed(2)}(${gstPercentage}%)` : '-';
        pdf.setFontSize(7);
        pdf.text(gstText, 55, yPos);
        
        // Total
        pdf.setFontSize(7);
        const totalText = finalAmount.toFixed(2);
        const totalWidth = pdf.getTextWidth(totalText);
        pdf.text(totalText, pageWidth - 5 - totalWidth, yPos);
        yPos += 4;

        // Show discount if any
        if (discountAmount > 0) {
          pdf.setFontSize(6);
          pdf.text(`  Disc: ${item.discountType === 'flat' ? formatCurrency(item.discount!) : item.discount + '%'}`, 5, yPos);
          yPos += 3;
        }
      });

      yPos += 2;
      pdf.line(5, yPos, pageWidth - 5, yPos);
      yPos += 5;

      // Totals
      pdf.setFontSize(9);
      addLine('Subtotal:', formatCurrency(subtotal));
      if (subtotal !== total) {
        addLine('Discount:', '-' + formatCurrency(subtotal - total));
      }
      addLine('Total:', formatCurrency(total));
      if (roundingOff !== 0) {
        const roundingText = roundingOff >= 0 ? '+' + formatCurrency(Math.abs(roundingOff)) : '-' + formatCurrency(Math.abs(roundingOff));
        addLine('Rounding Off:', roundingText);
      }
      
      yPos += 2;
      pdf.line(5, yPos, pageWidth - 5, yPos);
      yPos += 5;
      
      pdf.setFontSize(11);
      addLine('FINAL TOTAL:', formatCurrency(total + roundingOff));

      yPos += 5;
      pdf.setFontSize(9);
      addLine('Payment:', paymentMethod.toUpperCase());

      yPos += 5;
      pdf.line(5, yPos, pageWidth - 5, yPos);
      yPos += 5;

      // Footer
      pdf.setFontSize(9);
      addCenteredText('Thank You, Please Come Again!', 9);
      addCenteredText(companySettings?.companyName || 'LEATS', 8);

      // Download PDF
      pdf.save(`Invoice-${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-6 h-6" />
            Purchase Completed Successfully
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
              {companySettings?.logoUrl ? (
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
              ) : (
                <h1 className="text-lg font-bold mb-1">{companySettings?.companyName || 'LEATS'}</h1>
              )}
              {companySettings?.address && <p className="text-xs leading-tight">{companySettings.address}</p>}
              {(companySettings?.city || companySettings?.state || companySettings?.zipCode) && (
                <p className="text-xs leading-tight">
                  {[companySettings?.city, companySettings?.state, companySettings?.zipCode].filter(Boolean).join(', ')}
                </p>
              )}
              {companySettings?.gstNumber && <p className="text-xs leading-tight">GSTIN: {companySettings.gstNumber}</p>}
            </div>

            {/* Invoice Info */}
            <div className="mb-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Invoice No:</span>
                <span className="font-semibold">{invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{orderDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{customer?.name || "Walk-in Customer"}</span>
              </div>
              {customer?.phone && (
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{customer.phone}</span>
                </div>
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
              {cartItems.map((item, index) => {
                const itemTotal = item.price * item.quantity;
                let discountAmount = 0;
                if (item.discount && item.discount > 0) {
                  if (item.discountType === "flat") {
                    discountAmount = item.discount;
                  } else {
                    discountAmount = (itemTotal * item.discount) / 100;
                  }
                }
                const finalAmount = itemTotal - discountAmount;
                
                // Calculate GST breakdown
                const gstPercentage = item.gstPercentage || 0;
                const priceBeforeGst = finalAmount / (1 + gstPercentage / 100);
                const gstAmount = finalAmount - priceBeforeGst;
                const unitPriceBeforeGst = priceBeforeGst / item.quantity;
                
                return (
                  <div key={index} className="mb-2">
                    <div className="grid grid-cols-[2fr_0.5fr_1fr_1.2fr_1fr] gap-1 text-xs">
                      <span className="font-semibold text-left">{item.name}</span>
                      <span className="text-center">{item.quantity}</span>
                      <span className="text-right">{formatCurrency(unitPriceBeforeGst)}</span>
                      <span className="text-right">{gstPercentage > 0 ? `${formatCurrency(gstAmount)}(${gstPercentage}%)` : '-'}</span>
                      <span className="text-right font-semibold">{formatCurrency(finalAmount)}</span>
                    </div>
                    {item.discount && item.discount > 0 && (
                      <div className="text-xs text-gray-600 ml-1">
                        Disc: {item.discountType === "flat" ? formatCurrency(item.discount) : `${item.discount}%`}
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
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {subtotal !== total && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(subtotal - total)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {roundingOff !== 0 && (
                <div className="flex justify-between text-xs">
                  <span>Rounding Off:</span>
                  <span className={roundingOff >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {roundingOff >= 0 ? '+' : ''}{formatCurrency(Math.abs(roundingOff))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t-2 border-gray-800 pt-2 mt-2">
                <span>FINAL TOTAL:</span>
                <span>{formatCurrency(total + roundingOff)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mt-3 text-xs">
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="font-bold uppercase">{paymentMethod}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-4 pt-3 border-t-2 border-dashed border-gray-800">
              <p className="text-xs font-bold mb-1">Thank You, Please Come Again!</p>
              <p className="text-xs">{companySettings?.companyName || 'LEATS'}</p>
              <p className="text-xs mt-2">Powered by POS System</p>
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
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
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
};
