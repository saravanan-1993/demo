"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductFormState } from "@/types/product";
import {
  gstRateService,
  GSTRate,
} from "@/services/online-services/gstRateService";
import { useCurrency } from "@/hooks/useCurrency";
import { Info } from "lucide-react";
import { toast } from "sonner";

interface PricingTaxTabProps {
  formData: ProductFormState;
  onChange: (field: keyof ProductFormState, value: unknown) => void;
}

export function PricingTaxTab({ formData, onChange }: PricingTaxTabProps) {
  const [gstRates, setGstRates] = useState<GSTRate[]>([]);
  const currencySymbol = useCurrency();
  const [isLoadingGST, setIsLoadingGST] = useState(false);

  useEffect(() => {
    fetchGSTRates();
  }, []);

  const fetchGSTRates = async () => {
    try {
      setIsLoadingGST(true);
      const response = await gstRateService.getActiveGSTRates();
      if (response.success) {
        setGstRates(response.data);
      }
    } catch (error: unknown) {
      console.error("Error fetching GST rates:", error);
      toast.error("Failed to load GST rates");
    } finally {
      setIsLoadingGST(false);
    }
  };
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
          Pricing & Tax Information
        </h3>
        <div className="flex items-start gap-2 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4 sm:mb-6">
          <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-blue-900">
            Pricing fields are auto-filled from the default variant and are read-only. To change prices, edit them in the Variants tab. HSN Code and GST can be edited here.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* HSN Code */}
        <div>
          <Label htmlFor="hsnCode">HSN Code</Label>
          <Input
            id="hsnCode"
            value={formData.hsnCode}
            onChange={(e) => onChange("hsnCode", e.target.value)}
            placeholder="Enter HSN code"
            className="mt-2"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Harmonized System of Nomenclature code for tax purposes
          </p>
        </div>

        {/* GST Percentage */}
        <div>
          <Label htmlFor="gstPercentage">GST %</Label>
          <Select
            value={formData.gstPercentage?.toString() || ""}
            onValueChange={(value) =>
              onChange("gstPercentage", parseFloat(value))
            }
            disabled={isLoadingGST}
          >
            <SelectTrigger className="mt-2">
              <SelectValue
                placeholder={
                  isLoadingGST ? "Loading GST rates..." : "Select GST rate"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">NIL (0%)</SelectItem>
              {gstRates
                .filter((rate) => rate.gstPercentage !== 0)
                .map((rate) => (
                  <SelectItem
                    key={rate.id}
                    value={rate.gstPercentage.toString()}
                  >
                    {rate.name} - {rate.gstPercentage}%
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-filled from default variant, can be changed
          </p>
        </div>

        {/* Default MRP */}
        <div>
          <Label htmlFor="defaultMRP">
            Default MRP <span className="text-red-500">*</span>
          </Label>
          <Input
            id="defaultMRP"
            type="number"
            step="0.01"
            min="0"
            value={formData.defaultMRP}
            readOnly
            disabled
            className="mt-2 bg-gray-100 cursor-not-allowed"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Auto-filled from default variant (read-only)
          </p>
        </div>

        {/* Default Selling Price */}
        <div>
          <Label htmlFor="defaultSellingPrice">
            Default Selling Price <span className="text-red-500">*</span>
          </Label>
          <Input
            id="defaultSellingPrice"
            type="number"
            step="0.01"
            min="0"
            value={formData.defaultSellingPrice}
            readOnly
            disabled
            className="mt-2 bg-gray-100 cursor-not-allowed"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Auto-filled from default variant (read-only)
          </p>
        </div>

        {/* Default Purchase Price */}
        <div>
          <Label htmlFor="defaultPurchasePrice">Default Purchase Price</Label>
          <Input
            id="defaultPurchasePrice"
            type="number"
            step="0.01"
            min="0"
            value={formData.defaultPurchasePrice}
            readOnly
            disabled
            className="mt-2 bg-gray-100 cursor-not-allowed"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Auto-filled from default variant (read-only)
          </p>
        </div>

        {/* Discount Type */}
        <div>
          <Label htmlFor="discountType">Discount Type</Label>
          <select
            id="discountType"
            value={formData.discountType || "Percent"}
            disabled
            className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-gray-100 cursor-not-allowed"
          >
            <option value="Percent">Percent (%)</option>
            <option value="Flat">Flat ({currencySymbol})</option>
          </select>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-filled from default variant (read-only)
          </p>
        </div>

        {/* Default Discount Value */}
        <div>
          <Label htmlFor="defaultDiscountValue">Default Discount Value</Label>
          <Input
            id="defaultDiscountValue"
            type="number"
            step="0.01"
            min="0"
            max={formData.discountType === "Percent" ? 100 : undefined}
            value={formData.defaultDiscountValue}
            readOnly
            disabled
            className="mt-2 bg-gray-100 cursor-not-allowed"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Auto-filled from default variant (read-only)
          </p>
        </div>
      </div>

      {/* Delivery Options */}
      <div className="border-t pt-4 sm:pt-6 lg:col-span-2">
        <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">
          Delivery Options
        </h4>

        <div className="space-y-3 sm:space-y-4">
          {/* COD Available */}
          <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg gap-3">
            <div className="flex-1 min-w-0">
              <Label
                htmlFor="isCODAvailable"
                className="text-sm sm:text-base font-medium"
              >
                Cash on Delivery (COD)
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Allow customers to pay on delivery
              </p>
            </div>
            <Switch
              id="isCODAvailable"
              checked={formData.isCODAvailable}
              onCheckedChange={(checked) => onChange("isCODAvailable", checked)}
              className="flex-shrink-0"
            />
          </div>

          {/* Free Shipping */}
          <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg gap-3">
            <div className="flex-1 min-w-0">
              <Label
                htmlFor="freeShipping"
                className="text-sm sm:text-base font-medium"
              >
                Free Shipping / Delivery
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Offer free shipping for this product
              </p>
            </div>
            <Switch
              id="freeShipping"
              checked={formData.freeShipping}
              onCheckedChange={(checked) => onChange("freeShipping", checked)}
              className="flex-shrink-0"
            />
          </div>

          {/* Shipping Charge */}
          {!formData.freeShipping && (
            <div>
              <Label htmlFor="shippingCharge">Shipping / Delivery Charge</Label>
              <Input
                id="shippingCharge"
                type="number"
                step="0.01"
                min="0"
                value={formData.shippingCharge}
                onChange={(e) =>
                  onChange("shippingCharge", parseFloat(e.target.value) || 0)
                }
                placeholder="Enter shipping charge"
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Additional charge for delivery
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Summary */}
      {formData.defaultMRP > 0 && formData.defaultSellingPrice > 0 && (
        <div className="border-t pt-4 sm:pt-6 lg:col-span-2">
          <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">
            Pricing Summary
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground">MRP</p>
              <p className="text-base sm:text-lg font-semibold">
                {currencySymbol}
                {formData.defaultMRP.toFixed(2)}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Selling Price
              </p>
              <p className="text-base sm:text-lg font-semibold">
                {currencySymbol}
                {formData.defaultSellingPrice.toFixed(2)}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Discount Applied
              </p>
              <p className="text-base sm:text-lg font-semibold text-green-600">
                {formData.discountType === "Percent"
                  ? `${formData.defaultDiscountValue.toFixed(1)}%`
                  : `${currencySymbol}${formData.defaultDiscountValue.toFixed(
                      2
                    )}`}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Effective Discount
              </p>
              <p className="text-base sm:text-lg font-semibold text-green-600">
                {(
                  (1 - formData.defaultSellingPrice / formData.defaultMRP) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>
            {formData.defaultPurchasePrice > 0 && (
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg col-span-2 lg:col-span-1">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Margin
                </p>
                <p className="text-base sm:text-lg font-semibold text-blue-600">
                  {currencySymbol}
                  {(
                    formData.defaultSellingPrice - formData.defaultPurchasePrice
                  ).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
