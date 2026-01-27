"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Printer,
  Download,
  Edit,
  ArrowLeft, 
  MapPin,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import type { PurchaseOrder } from "@/services/purchaseService";
import { useCurrency } from "@/hooks/useCurrency";
import { useRef, useEffect, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { getPurchaseWebSettings, type WebSettings } from "@/services/purchase-services/webSettingsService";
import { useReactToPrint } from "react-to-print";
import { usePDFGenerator } from "./pdf-view-download";

// Helper function to safely format dates
const safeFormatDate = (
  dateStr: string | undefined | null,
  formatStr: string = "MMM dd, yyyy"
): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return format(date, formatStr);
  } catch {
    return "-";
  }
};

interface PurchaseDetailsProps {
  purchaseOrder: PurchaseOrder;
}

export default function PurchaseDetails({
  purchaseOrder,
}: PurchaseDetailsProps) {
  const router = useRouter();
  const currencySymbol = useCurrency();
  const invoiceRef = useRef<HTMLDivElement | null>(null);
  const [webSettings, setWebSettings] = useState<WebSettings | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);
  const [logoError, setLogoError] = useState(false);

  // Determine if this is an inter-state transaction (IGST)
  const isInterState = purchaseOrder.totalIGST > 0;

  useEffect(() => {
    const fetchWebSettings = async () => {
      try {
        setIsLoadingLogo(true);
        const response = await getPurchaseWebSettings();
        if (response.success && response.data.logoUrl) {
          setWebSettings(response.data);
        } else {
          setLogoError(true);
        }
      } catch (error) {
        console.error("Failed to fetch web settings:", error);
        setLogoError(true);
      } finally {
        setIsLoadingLogo(false);
      }
    };

    fetchWebSettings();
  }, []);

  const handleEdit = () => {
    router.push(
      `/dashboard/purchase-orders/purchases-list/${purchaseOrder.id}`
    );
  };

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `PO-${purchaseOrder.poId}`,
    onAfterPrint: () => console.log("Printed successfully"),
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .invoice-bg-beige {
          background-color: #e8e4d9 !important;
        }
        .invoice-footer-beige {
          background-color: #c4b89a !important;
        }
      }
    `
  });

  const { handleDownloadPDF, handleViewPDF } = usePDFGenerator({
    invoiceRef,
    poId: purchaseOrder.poId,
    webSettings
  });

  const canEdit =
    purchaseOrder.poStatus !== "completed" &&
    purchaseOrder.poStatus !== "cancelled";

  return (
    <div className="flex-1 overflow-auto bg-slate-100/50 min-h-screen print:min-h-0 print:bg-white print:overflow-visible">
      {/* Add Print Page Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 5mm;
            size: A4 portrait;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          [data-invoice] {
            page-break-inside: avoid;
            page-break-after: avoid;
          }
        }
        .invoice-bg-beige {
          background-color: #e8e4d9;
        }
        .invoice-footer-beige {
          background-color: #c4b89a;
        }
      `}</style>

      <div className="max-w-5xl mx-auto p-6 space-y-6 print:p-0 print:space-y-0 print:max-w-none">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="text-muted-foreground hover:bg-white"
            >
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-slate-800">Purchase Order #{purchaseOrder.poId}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              if (handlePrint) {
                handlePrint();
              } else {
                console.error("Print handler not ready");
                toast.error("Print service not ready");
              }
            }} className="bg-white shadow-sm">
              <Printer className="size-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleViewPDF} className="bg-white shadow-sm">
              <Eye className="size-4 mr-2" />
              View PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="bg-white shadow-sm">
              <Download className="size-4 mr-2" />
              Download PDF
            </Button>
            {canEdit && (
              <Button size="sm" onClick={handleEdit} className="bg-primary text-primary-foreground shadow-sm">
                <Edit className="size-4 mr-2" />
                Edit PO
              </Button>
            )}
          </div>
        </div>

        {/* Invoice Paper */}
        <div 
          className="bg-white shadow-lg rounded-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0 print:rounded-none select-text" 
          data-invoice
          ref={invoiceRef}
        >
          {/* Top Accent Border for PDF & Screen */}
          <div className="h-2 w-full bg-[#e22a2a] print:h-3" />
          {/* Header with beige background */}
          <div className="invoice-bg-beige p-8 print:p-6 border-b border-[#d4cdb8]" data-invoice-header>
            
            {/* HEADER SECTION - Clean & Minimal */}
            <div className="flex justify-between items-start mb-8 print:mb-6">
               {/* Left: Logo Only */}
               <div className="space-y-6">
                  <div className="relative w-40 h-20 flex items-center justify-start overflow-hidden" data-logo-container>
                    {isLoadingLogo ? (
                      <div className="bg-white/60 text-slate-600 flex items-center justify-center font-bold text-xl tracking-tight px-4 py-2 rounded">
                        LOGO
                      </div>
                    ) : logoError || !webSettings?.logoUrl ? (
                      <div className="bg-white/60 text-slate-600 flex items-center justify-center font-bold text-xl tracking-tight px-4 py-2 rounded" data-fallback-logo>
                        LOGO
                      </div>
                    ) : (
                      <Image 
                        src={webSettings.logoUrl} 
                        alt="Company Logo" 
                        fill
                        sizes="160px"
                        className="object-contain"
                        priority={true}
                        quality={90}
                        onError={() => {
                          console.warn("Logo failed to load, using fallback");
                          setLogoError(true);
                        }}
                      />
                    )}
                  </div>
               </div>

               {/* Right: Title & PO Details */}
               <div className="text-right space-y-6">
                 <h1 className="text-4xl font-bold text-black tracking-[0.2em]">PURCHASE ORDER</h1>
                <div className="space-y-3 min-w-[220px] text-left">
                  <div className="border-b border-[#a89b7e] pb-3">
                    <div className="flex items-baseline justify-between gap-8 mb-2">
                      <span className="text-sm font-medium text-slate-700">PO Number</span>
                      <span className="text-sm font-bold text-black text-right whitespace-nowrap">{purchaseOrder.poId}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-8 mb-2">
                      <span className="text-sm font-medium text-slate-700 whitespace-nowrap">PO Date</span>
                      <span className="text-sm font-medium text-black text-right whitespace-nowrap">
                        {safeFormatDate(purchaseOrder.poDate)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-8">
                      <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Expected Delivery</span>
                      <span className="text-sm font-medium text-black text-right whitespace-nowrap">
                        {safeFormatDate(purchaseOrder.expectedDeliveryDate)}
                      </span>
                    </div>
                  </div>
                </div>
               </div>
            </div>

            {/* ADDRESS SECTION - Two Column Clean Layout */}
            <div className="grid grid-cols-2 gap-12 mt-4">
              {/* Vendor */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-4">Vendor To</p>
                <div className="space-y-2">
                   <p className="font-bold text-black text-base">{purchaseOrder.supplierName}</p>
                   {purchaseOrder.contactPersonName && <p className="text-sm text-slate-700">{purchaseOrder.contactPersonName}</p>}
                   <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {purchaseOrder.billingAddress}
                   </p>
                   <div className="pt-2 space-y-1 text-sm text-slate-700">
                     {purchaseOrder.supplierGSTIN && <p>GSTIN: {purchaseOrder.supplierGSTIN}</p>}
                     <p>Phone: {purchaseOrder.supplierPhone}</p>
                     <p>Email: {purchaseOrder.supplierEmail}</p>
                   </div>
                </div>
              </div>

              {/* Ship To */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-4">Ship To</p>
                <div className="space-y-2">
                   <p className="font-bold text-black text-base">{purchaseOrder.warehouseName}</p>
                   <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {purchaseOrder.shippingAddress}
                   </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="p-8 print:p-6">

            {/* ITEMS TABLE - Clean Minimal Design */}
            <div className="mb-8">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-slate-900">
                    <TableHead className="text-xs font-bold text-slate-900 uppercase tracking-wider py-3">#</TableHead>
                    <TableHead className="text-xs font-bold text-slate-900 uppercase tracking-wider">Item Description</TableHead>
                    <TableHead className="text-xs font-bold text-slate-900 uppercase tracking-wider text-center">HSN</TableHead>
                    <TableHead className="text-xs font-bold text-slate-900 uppercase tracking-wider text-center">Qty</TableHead>
                    <TableHead className="text-xs font-bold text-slate-900 uppercase tracking-wider text-right">Rate</TableHead>
                    <TableHead className="text-xs font-bold text-slate-900 uppercase tracking-wider text-right">GST</TableHead>
                    <TableHead className="text-xs font-bold text-slate-900 uppercase tracking-wider text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrder.items.map((item, index) => {
                    // Use gstPercentage from the item data
                    const gstPercentage = item.gstPercentage || 0;

                    return (
                      <TableRow key={item.id} className="border-b border-slate-100">
                        <TableCell className="py-3 text-slate-500 font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="py-3">
                          <p className="font-semibold text-slate-900">{item.productName}</p>
                          
                          {item.sku && <p className="text-xs text-slate-400 mt-0.5">SKU: {item.sku}</p>}
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <span className="text-sm text-slate-700">{item.hsnCode || '-'}</span>
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <span className="font-semibold text-slate-900">{item.quantity}</span>
                          <span className="text-xs text-slate-400 ml-1">{item.uom}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-700 py-3">
                          {currencySymbol}{item.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <span className="font-semibold text-slate-900">{Math.round(gstPercentage)}%</span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900 py-3">
                          {currencySymbol}{item.totalPrice.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* SUMMARY - Right Aligned Clean Design */}
            <div className="flex justify-end mb-8">
              <div className="w-80 space-y-2">
                 <div className="flex justify-between items-center text-sm py-1.5">
                   <span className="font-medium text-slate-600 whitespace-nowrap">Subtotal</span>
                   <span className="font-semibold text-slate-900">{currencySymbol}{purchaseOrder.subTotal.toFixed(2)}</span>
                 </div>
                 
                 {purchaseOrder.discount > 0 && (
                   <div className="flex justify-between items-center text-sm py-1.5">
                     <span className="font-medium text-slate-600 whitespace-nowrap">Discount</span>
                     <span className="font-semibold text-red-600">- {currencySymbol}{purchaseOrder.discount.toFixed(2)}</span>
                   </div>
                 )}

                 {isInterState ? (
                    <div className="flex justify-between items-center text-sm py-1.5">
                      <span className="font-medium text-slate-600 whitespace-nowrap">IGST</span>
                      <span className="font-semibold text-slate-900">{currencySymbol}{purchaseOrder.totalIGST.toFixed(2)}</span>
                    </div>
                 ) : (
                    <>
                      <div className="flex justify-between items-center text-sm py-1.5">
                         <span className="font-medium text-slate-600 whitespace-nowrap">CGST</span>
                         <span className="font-semibold text-slate-900">{currencySymbol}{purchaseOrder.totalCGST.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm py-1.5">
                         <span className="font-medium text-slate-600 whitespace-nowrap">SGST</span>
                         <span className="font-semibold text-slate-900">{currencySymbol}{purchaseOrder.totalSGST.toFixed(2)}</span>
                      </div>
                    </>
                 )}
                 
                 {purchaseOrder.otherCharges > 0 && (
                   <div className="flex justify-between items-center text-sm py-1.5">
                     <span className="font-medium text-slate-600 whitespace-nowrap">Other Charges</span>
                     <span className="font-semibold text-slate-900">{currencySymbol}{purchaseOrder.otherCharges.toFixed(2)}</span>
                   </div>
                 )}

                 <div className="flex justify-between items-center pt-4 border-t-2 border-slate-900">
                   <span className="font-bold text-lg text-[#e22a2a]">TOTAL</span>
                   <span className="font-bold text-2xl text-[#e22a2a]">
                     {currencySymbol}{purchaseOrder.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                   </span>
                 </div>
              </div>
            </div>

            {/* SIGNATURE */}
            <div className="space-y-8">
              <div className="flex justify-start">
                <div className="text-left">
                  <div className="border-t-2 border-slate-900 pt-2 w-64">
                    <p className="font-bold text-slate-900">Authorized Signatory</p>
                    <p className="text-xs text-slate-600 mt-1">Account Manager</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Accent Border with Centered PO Number */}
            <div className="mt-10 border-t-4 border-[#e22a2a] pt-3 text-center">
              <p className="text-xs font-semibold text-slate-700 tracking-wide">
                PURCHASE ORDER&nbsp;•&nbsp;PO Number: {purchaseOrder.poId}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}