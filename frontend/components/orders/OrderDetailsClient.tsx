"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { getOrderByNumber, Order } from "@/services/orderService";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import {
  IconPackage,
  IconTruck,
  IconCheck,
  IconX,
  IconClock,
  IconChevronLeft,
  IconReceipt,
  IconMapPin,
  IconPhone,
  IconMail,
  IconCalendar,
  IconDownload,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import axiosInstance from "@/lib/axios";

interface OrderDetailsClientProps {
  orderNumber: string;
}

export default function OrderDetailsClient({
  orderNumber,
}: OrderDetailsClientProps) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthContext();
  const currencySymbol = useCurrency();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user?.id) {
      toast.error("Please login to view order details");
      router.push("/signin?redirect=/my-orders");
      return;
    }

    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, authLoading, orderNumber]);

  const loadOrder = async () => {
    try {
      setIsLoading(true);
      const response = await getOrderByNumber(orderNumber, user!.id);

      // Verify the order belongs to the logged-in user
      if (response.data.userId !== user?.id) {
        toast.error("Order not found");
        router.push("/my-orders");
        return;
      }

      setOrder(response.data);
    } catch (error: any) {
      console.error("Error loading order:", error);
      if (error.response?.status === 404) {
        toast.error("Order not found");
        router.push("/my-orders");
      } else {
        toast.error("Failed to load order details");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-700 border-green-200";
      case "shipped":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "confirmed":
      case "packing":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <IconCheck size={20} />;
      case "shipped":
        return <IconTruck size={20} />;
      case "confirmed":
      case "packing":
        return <IconPackage size={20} />;
      case "cancelled":
        return <IconX size={20} />;
      default:
        return <IconClock size={20} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownloadInvoice = async () => {
    if (!order || !user?.id) return;

    setIsDownloadingInvoice(true);
    try {
      // Use the correct my-orders API endpoint to generate and download the PDF
      const response = await axiosInstance.get(
        `/api/online/my-orders/${order.orderNumber}/invoice/download?userId=${user.id}`,
        {
          responseType: 'blob', // Important: Tell axios to expect binary data
        }
      );

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded successfully!');
      
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(`Failed to download invoice: ${errorMessage}`);
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  const canDownloadInvoice = () => {
    if (!order) return false;
    // Allow invoice download for confirmed, packing, shipped, and delivered orders
    return ['confirmed', 'packing', 'shipped', 'delivered'].includes(order.orderStatus);
  };

  const getOrderTimeline = () => {
    if (!order) return [];

    // If order is cancelled, show only placed and cancelled
    if (order.orderStatus === "cancelled") {
      return [
        {
          status: "Order Placed",
          date: order.createdAt,
          completed: true,
          icon: IconReceipt,
        },
        {
          status: "Cancelled",
          date: order.cancelledAt || order.updatedAt,
          completed: true,
          icon: IconX,
        },
      ];
    }

    // Define the order status hierarchy
    const statusHierarchy = [
      "pending",
      "confirmed",
      "packing",
      "shipped",
      "delivered",
    ];
    const currentStatusIndex = statusHierarchy.indexOf(order.orderStatus);

    // Build complete timeline with all statuses
    const timeline = [
      {
        status: "Order Placed",
        date: order.createdAt,
        completed: true,
        icon: IconReceipt,
      },
      {
        status: "Order Confirmed",
        date: order.confirmedAt,
        completed: currentStatusIndex >= 1,
        icon: IconCheck,
      },
      {
        status: "Packing",
        date: order.packingAt,
        completed: currentStatusIndex >= 2,
        icon: IconPackage,
      },
      {
        status: "Shipped",
        date: order.shippedAt,
        completed: currentStatusIndex >= 3,
        icon: IconTruck,
      },
      {
        status: "Delivered",
        date: order.deliveredAt,
        completed: currentStatusIndex >= 4,
        icon: IconCheck,
      },
    ];

    return timeline;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-6 bg-gray-200" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full rounded-lg bg-gray-200" />
              <Skeleton className="h-96 w-full rounded-lg bg-gray-200" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-lg bg-gray-200" />
              <Skeleton className="h-48 w-full rounded-lg bg-gray-200" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const timeline = getOrderTimeline();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href="/my-orders"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#e63946] mb-6 transition-colors"
        >
          <IconChevronLeft size={20} />
          Back to Orders
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Order Details
              </h1>
              <p className="text-gray-600">Order #{order.orderNumber}</p>
              {order.invoiceNumber && (
                <p className="text-sm text-gray-500 mt-1">
                  Invoice: {order.invoiceNumber}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Download Invoice Button */}
              {/* {canDownloadInvoice() && (
                <Button
                  onClick={handleDownloadInvoice}
                  disabled={isDownloadingInvoice}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <IconDownload size={16} />
                  {isDownloadingInvoice ? 'Downloading...' : 'Download Invoice'}
                </Button>
              )} */}
              
              {/* Order Status Badge */}
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(
                  order.orderStatus
                )}`}
              >
                {getStatusIcon(order.orderStatus)}
                <span className="capitalize">{order.orderStatus}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div key="order-date">
              <p className="text-sm text-gray-500 mb-1">Order Date</p>
              <p className="font-medium text-gray-900">
                {formatDate(order.createdAt)}
              </p>
            </div>
            <div key="payment-method">
              <p className="text-sm text-gray-500 mb-1">Payment Method</p>
              <p className="font-medium text-gray-900 uppercase">
                {order.paymentMethod}
              </p>
            </div>
            <div key="payment-status">
              <p className="text-sm text-gray-500 mb-1">Payment Status</p>
              <p
                className={`font-medium capitalize ${
                  order.paymentStatus === "completed"
                    ? "text-green-600"
                    : order.paymentStatus === "pending"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {order.paymentStatus}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Timeline */}
            {timeline.length > 0 && (
              <div
                key="order-timeline"
                className="bg-white rounded-lg shadow-sm p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Timeline
                </h2>
                <div className="space-y-4">
                  {timeline.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={`${item.status}-${index}`}
                        className="flex gap-4"
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              item.completed
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            <Icon size={20} />
                          </div>
                          {index < timeline.length - 1 && (
                            <div
                              className={`w-0.5 h-12 my-1 ${
                                item.completed ? "bg-green-200" : "bg-gray-200"
                              }`}
                            />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p
                            className={`font-medium ${
                              item.completed ? "text-gray-900" : "text-gray-500"
                            }`}
                          >
                            {item.status}
                          </p>
                          {item.date ? (
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(item.date)}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400 mt-1">
                              {item.completed ? "In progress" : "Pending"}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order Items */}
            <div
              key="order-items"
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Items ({order.items.length})
              </h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="flex gap-4 pb-4 border-b border-gray-200 last:border-0 last:pb-0"
                  >
                    <Image
                      src={item.productImage || "/placeholder-product.png"}
                      alt={item.productName}
                      width={100}
                      height={100}
                      className="rounded-lg object-contain bg-gray-50"
                      unoptimized
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">{item.brand}</p>
                      <h4 className="font-medium text-gray-900">
                        {item.productName}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.displayName || item.variantName}
                      </p>
                      {item.selectedCuttingStyle && (
                        <p className="text-sm text-gray-500 mt-1">
                          Cutting Style: {item.selectedCuttingStyle}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <p className="text-sm text-gray-700">
                          Qty: {item.quantity}
                        </p>
                        <p className="text-sm text-gray-700">
                          Unit Price: {currencySymbol}
                          {(item.unitPrice || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {currencySymbol}
                        {(item.total || (item.unitPrice * item.quantity) || 0).toFixed(2)}
                      </p>
                      {item.mrp > item.unitPrice && (
                        <p className="text-sm text-gray-400 line-through">
                          {currencySymbol}
                          {((item.mrp || 0) * (item.quantity || 0)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Delivery Address */}
            <div
              key="delivery-address"
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <IconMapPin size={20} className="text-[#e63946]" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Delivery Address
                </h2>
              </div>
              <div className="space-y-2">
                <p key="name" className="font-medium text-gray-900">
                  {order.deliveryAddress.name}
                </p>
                <p key="address1" className="text-gray-700">
                  {order.deliveryAddress.addressLine1}
                </p>
                {order.deliveryAddress.addressLine2 && (
                  <p key="address2" className="text-gray-700">
                    {order.deliveryAddress.addressLine2}
                  </p>
                )}
                {order.deliveryAddress.landmark && (
                  <p key="landmark" className="text-sm text-gray-600">
                    Landmark: {order.deliveryAddress.landmark}
                  </p>
                )}
                <p key="city-state" className="text-gray-700">
                  {order.deliveryAddress.city}, {order.deliveryAddress.state} -{" "}
                  {order.deliveryAddress.pincode}
                </p>
                <p key="country" className="text-gray-700">
                  {order.deliveryAddress.country}
                </p>
                <div
                  key="contact"
                  className="pt-3 border-t border-gray-200 mt-3"
                >
                  <div className="flex items-center gap-2 text-gray-700">
                    <IconPhone size={16} />
                    <span>{order.deliveryAddress.phone}</span>
                  </div>
                  {order.deliveryAddress.alternatePhone && (
                    <div className="flex items-center gap-2 text-gray-600 text-sm mt-1">
                      <IconPhone size={14} />
                      <span>{order.deliveryAddress.alternatePhone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* GST Information (if available) */}
            {/* {order.gstType && (order.adminState || order.customerState) && (
              <div
                key="gst-info"
                className="bg-blue-50 rounded-lg shadow-sm p-4 border border-blue-200"
              >
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  GST Information
                </h3>
                <div className="space-y-1 text-xs text-blue-800">
                  {order.adminState && (
                    <div className="flex justify-between">
                      <span>Company State:</span>
                      <span className="font-medium">{order.adminState}</span>
                    </div>
                  )}
                  {order.customerState && (
                    <div className="flex justify-between">
                      <span>Delivery State:</span>
                      <span className="font-medium">{order.customerState}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST Type:</span>
                    <span className="font-medium uppercase">
                      {order.gstType === 'cgst_sgst' ? 'CGST + SGST' : 'IGST'}
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 mt-2 italic">
                    {order.gstType === 'cgst_sgst' 
                      ? 'Same state transaction - CGST & SGST applicable'
                      : 'Inter-state transaction - IGST applicable'
                    }
                  </div>
                </div>
              </div>
            )} */}

            {/* Order Summary */}
            <div
              key="order-summary"
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h2>
              <div className="space-y-3">
                <div
                  key="subtotal"
                  className="flex justify-between text-gray-700"
                >
                  <span>Subtotal</span>
                  <span>
                    {currencySymbol}
                    {(order.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                {order.discount > 0 && (
                  <div
                    key="discount"
                    className="flex justify-between text-green-600"
                  >
                    <span>Discount</span>
                    <span>
                      -{currencySymbol}
                      {(order.discount || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                {order.couponDiscount > 0 && (
                  <div
                    key="coupon-discount"
                    className="flex justify-between text-green-600"
                  >
                    <span>
                      Coupon Discount{" "}
                      {order.couponCode && `(${order.couponCode})`}
                    </span>
                    <span>
                      -{currencySymbol}
                      {(order.couponDiscount || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                <div
                  key="shipping"
                  className="flex justify-between text-gray-700"
                >
                  <span>Shipping Charge</span>
                  <span>
                    {(order.shippingCharge || 0) === 0
                      ? "FREE"
                      : `${currencySymbol}${(order.shippingCharge || 0).toFixed(2)}`}
                  </span>
                </div>
                
                {/* GST Breakdown */}
                {/* {order.gstType === 'cgst_sgst' ? (
                  <>
                    {(order.cgstAmount || 0) > 0 && (
                      <div key="cgst" className="flex justify-between text-gray-700">
                        <span>CGST</span>
                        <span>
                          {currencySymbol}
                          {(order.cgstAmount || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(order.sgstAmount || 0) > 0 && (
                      <div key="sgst" className="flex justify-between text-gray-700">
                        <span>SGST</span>
                        <span>
                          {currencySymbol}
                          {(order.sgstAmount || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {(order.igstAmount || 0) > 0 && (
                      <div key="igst" className="flex justify-between text-gray-700">
                        <span>IGST</span>
                        <span>
                          {currencySymbol}
                          {(order.igstAmount || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                )} */}
                
                {/* Fallback for orders without GST breakdown */}
                {!order.gstType && (order.tax || 0) > 0 && (
                  <div key="tax" className="flex justify-between text-gray-700">
                    <span>Tax ({(order.taxRate || 0).toFixed(2)}%)</span>
                    <span>
                      {currencySymbol}
                      {(order.tax || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                
                {/* Total GST Amount (if available) */}
                {(order.totalGstAmount || 0) > 0 && order.gstType && (
                  <div key="total-gst" className="flex justify-between text-gray-600 text-sm border-t border-gray-100 pt-2">
                    <span>Total GST</span>
                    <span>
                      {currencySymbol}
                      {(order.totalGstAmount || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                <div key="total" className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">
                      Total
                    </span>
                    <span className="text-lg font-bold text-[#e63946]">
                      {currencySymbol}
                      {(order.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
