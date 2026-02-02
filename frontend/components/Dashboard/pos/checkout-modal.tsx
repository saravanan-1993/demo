"use client";

import React, { useState } from "react";
import { CartItem, Customer } from "./pos-interface";

// Extend Customer interface for phoneNumber compatibility
interface CustomerData extends Customer {
  phoneNumber?: string;
}
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { posOrderService } from "@/services/posOrderService";
import { CustomerSelector } from "./customer-selector";

export interface CheckoutModalProps {
  cartItems: CartItem[];
  customer: Customer | null;
  onCustomerChange: (customer: Customer | null) => void;
  subtotal: number;
  total: number;
  totalDiscount: number;
  orderDiscountType: "percentage" | "flat";
  roundingOff: number;
  finalTotal: number;
  onClose: () => void;
  onComplete: (paymentMethod: string, order: any) => void;
  formatCurrency: (amount: number, options?: { showSymbol?: boolean; showCode?: boolean; precision?: number }) => string;
}

type PaymentMethod = "cash" | "card" | "upi" | null;

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  cartItems,
  customer,
  onCustomerChange,
  subtotal,
  total,
  totalDiscount,
  orderDiscountType,
  roundingOff,
  finalTotal,
  onClose,
  onComplete,
  formatCurrency,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  const change =
    amountReceived && parseFloat(amountReceived) > finalTotal
      ? parseFloat(amountReceived) - finalTotal
      : 0;

  const handlePayment = async () => {
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (!amountReceived || parseFloat(amountReceived) < finalTotal) {
      toast.error("Amount must be greater than or equal to final total");
      return;
    }

    setProcessing(true);

    try {
      // Prepare customer data with proper phone field
      const customerData = customer ? {
        id: customer.id,
        name: customer.name,
        email: customer.email || undefined,
        phone: customer.phone || customer.phoneNumber || undefined,
      } : null;

      // Calculate total discount amount
      const orderDiscountAmount = orderDiscountType === "flat" 
        ? totalDiscount 
        : (subtotal * totalDiscount) / 100;

      // Create order in order service
      const orderData = {
        customer: customerData,
        items: posOrderService.transformCartItems(cartItems),
        subtotal,
        tax: 0,
        taxRate: 0,
        discount: orderDiscountAmount,
        total: finalTotal,
        roundingOff,
        paymentMethod,
        amountReceived: parseFloat(amountReceived),
        changeGiven: change,
      };

      const order = await posOrderService.createOrder(orderData);
      
      console.log("Order created successfully:", order);
      
      setProcessing(false);
      onComplete(paymentMethod, order);
      
      toast.success("Payment completed successfully!", {
        description: `Order #${order.orderNumber}`,
      });
    } catch (error) {
      console.error("Error creating order:", error);
      setProcessing(false);
      toast.error("Payment failed", {
        description: "Failed to create order. Please try again.",
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Complete Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Selection */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Customer
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {customer ? customer.name : "Walk-in Customer"}
              </p>
            </div>
            <CustomerSelector
              selectedCustomer={customer}
              onSelectCustomer={onCustomerChange}
            />
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
              Order Summary
            </h3>
            <div className="space-y-2 max-h-48 overflow-auto">
              {cartItems.map((item) => {
                const itemTotal = item.price * item.quantity;
                
                // Calculate discount based on type
                let discountAmount = 0;
                if (item.discount && item.discount > 0) {
                  if (item.discountType === "flat") {
                    discountAmount = item.discount;
                  } else {
                    // percentage
                    discountAmount = (itemTotal * item.discount) / 100;
                  }
                }
                
                const finalPrice = itemTotal - discountAmount;

                return (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      {item.name} x {item.quantity}
                      {item.discount && item.discount > 0 && (
                        <span className="text-green-600 ml-1">
                          ({item.discountType === "flat" 
                            ? `${formatCurrency(item.discount)} off` 
                            : `${item.discount}% off`})
                        </span>
                      )}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(finalPrice)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 mt-3 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Subtotal
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 dark:text-green-400">
                    Order Discount {orderDiscountType === "flat" ? "" : `(${totalDiscount}%)`}
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    -{formatCurrency(orderDiscountType === "flat" ? totalDiscount : (subtotal * totalDiscount) / 100)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(total)}</span>
              </div>
              {roundingOff !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Rounding Off</span>
                  <span className={`font-medium ${roundingOff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {roundingOff >= 0 ? '+' : ''}{formatCurrency(Math.abs(roundingOff))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">Final Total</span>
                <span className="text-primary">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          {customer && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                Customer Information
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {customer.name}
              </p>
              {customer.email && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {customer.email}
                </p>
              )}
              {(customer.phone || customer.phoneNumber) && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {customer.phone || customer.phoneNumber}
                </p>
              )}
            </div>
          )}

          {/* Payment Method Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Select Payment Method
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === "cash"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 dark:border-gray-700 hover:border-primary"
                }`}
              >
                <svg
                  className="w-8 h-8 mx-auto mb-2 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="font-medium text-sm">Cash</p>
              </button>

              <button
                onClick={() => setPaymentMethod("card")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === "card"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 dark:border-gray-700 hover:border-primary"
                }`}
              >
                <svg
                  className="w-8 h-8 mx-auto mb-2 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <p className="font-medium text-sm">Card</p>
              </button>

              <button
                onClick={() => setPaymentMethod("upi")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === "upi"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 dark:border-gray-700 hover:border-primary"
                }`}
              >
                <svg
                  className="w-8 h-8 mx-auto mb-2 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <p className="font-medium text-sm">UPI</p>
              </button>
            </div>
          </div>

          {/* Payment Details */}
          {paymentMethod && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="amountReceived">
                  {paymentMethod === "cash" ? "Amount Received" : "Amount to Pay"}
                </Label>
                <Input
                  id="amountReceived"
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder={finalTotal.toFixed(2)}
                  className="text-lg h-12"
                />
                {paymentMethod !== "cash" && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter the exact amount: {formatCurrency(finalTotal)}
                  </p>
                )}
              </div>
              {paymentMethod === "cash" && change > 0 && amountReceived && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Change to return
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(change)}
                  </p>
                </div>
              )}
              {paymentMethod === "cash" && amountReceived && parseFloat(amountReceived) < finalTotal && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Insufficient amount. Need {formatCurrency(finalTotal - parseFloat(amountReceived))} more.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 h-12"
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              className="flex-1 h-12 text-lg font-semibold"
              disabled={!paymentMethod || processing}
            >
              {processing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                `Complete Payment - ${formatCurrency(finalTotal)}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
