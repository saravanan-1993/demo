"use client";

import { Badge } from "@/components/ui/badge";
import { MapPin, User, Phone, Mail, CreditCard, FileText } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  supplierType: string;
  contactPersonName: string;
  phone: string;
  alternatePhone: string;
  email: string;
  billingAddressLine1: string;
  billingAddressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  shippingAddressSameAsBilling: boolean;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;

  taxId: string;
  remarks: string;
  attachments: string;
  status: string;
  createdAt?: string;
}

interface SupplierViewDetailProps {
  supplier: Supplier;
}

export default function SupplierViewDetail({
  supplier,
}: SupplierViewDetailProps) {
  const formatAddress = (
    line1?: string,
    line2?: string,
    city?: string,
    state?: string,
    postalCode?: string,
    country?: string
  ) => {
    const parts = [line1, line2, city, state, postalCode, country].filter(
      Boolean
    );
    return parts.join(", ");
  };

  const billingAddress = formatAddress(
    supplier.billingAddressLine1,
    supplier.billingAddressLine2,
    supplier.city,
    supplier.state,
    supplier.postalCode,
    supplier.country
  );

  const shippingAddress = supplier.shippingAddressSameAsBilling
    ? billingAddress
    : formatAddress(
        supplier.shippingAddressLine1,
        supplier.shippingAddressLine2,
        supplier.shippingCity,
        supplier.shippingState,
        supplier.shippingPostalCode,
        supplier.shippingCountry
      );

  return (
    <div className="bg-muted/30 border rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">{supplier.name}</h2>
          {supplier.supplierType && (
            <p className="text-sm text-muted-foreground mt-1">
              {supplier.supplierType}
            </p>
          )}
        </div>
        <Badge variant={supplier.status === "active" ? "default" : "secondary"}>
          {supplier.status === "active" ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
        {/* Contact Information */}
        <div className="space-y-3">
          <h3 className="font-medium text-base mb-3">Contact Information</h3>

          <div className="flex items-start gap-2">
            <User className="size-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Contact Person</p>
              <p className="font-medium">{supplier.contactPersonName}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            {" "}
            <Phone className="size-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Primary Phone</p>
              <p className="font-medium">{supplier.phone}</p>
              {supplier.alternatePhone && (
                <p className="text-xs text-muted-foreground mt-1">
                  Alt: {supplier.alternatePhone}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Mail className="size-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{supplier.email}</p>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-3">
          <h3 className="font-medium text-base mb-3">Address Information</h3>

          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Billing Address</p>
              <p className="font-medium leading-relaxed">{billingAddress}</p>
            </div>
          </div>

          {!supplier.shippingAddressSameAsBilling && (
            <div className="flex items-start gap-2">
              <MapPin className="size-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Shipping Address
                </p>
                <p className="font-medium leading-relaxed">{shippingAddress}</p>
              </div>
            </div>
          )}
        </div>

        {/* Business Information */}
        <div className="space-y-3">
          <h3 className="font-medium text-base mb-3">Business Information</h3>



          {supplier.taxId && (
            <div className="flex items-start gap-2">
              <FileText className="size-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">GST Number</p>
                <p className="font-medium font-mono">{supplier.taxId}</p>
              </div>
            </div>
          )}

          {supplier.remarks && (
            <div className="flex items-start gap-2">
              <FileText className="size-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Remarks</p>
                <p className="font-medium leading-relaxed">
                  {supplier.remarks}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
