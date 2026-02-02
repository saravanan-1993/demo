"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { ZipCodeInput } from "@/components/ui/zipcode-input";
import { CountryStateCitySelect } from "@/components/ui/country-state-city-select";

interface SupplierData {
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
}

interface SupplierWithId extends SupplierData {
  id: string;
}

interface AddSupplierProps {
  supplier?: SupplierWithId | null;
  onSubmit: (data: SupplierData, file?: File | null) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function AddSupplier({
  supplier,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AddSupplierProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  
  const [formData, setFormData] = useState<SupplierData>(() => {
    if (supplier) {
      return {
        name: (supplier.name || "").trim(),
        supplierType: supplier.supplierType || "manufacturer",
        contactPersonName: (supplier.contactPersonName || "").trim(),
        phone: (supplier.phone || "").trim(),
        alternatePhone: (supplier.alternatePhone || "").trim(),
        email: (supplier.email || "").trim(),
        billingAddressLine1: (supplier.billingAddressLine1 || "").trim(),
        billingAddressLine2: (supplier.billingAddressLine2 || "").trim(),
        city: (supplier.city || "").trim(),
        state: (supplier.state || "").trim(),
        postalCode: (supplier.postalCode || "").trim(),
        country: (supplier.country || "").trim(),
        shippingAddressSameAsBilling:
          supplier.shippingAddressSameAsBilling ?? true,
        shippingAddressLine1: (supplier.shippingAddressLine1 || "").trim(),
        shippingAddressLine2: (supplier.shippingAddressLine2 || "").trim(),
        shippingCity: (supplier.shippingCity || "").trim(),
        shippingState: (supplier.shippingState || "").trim(),
        shippingPostalCode: (supplier.shippingPostalCode || "").trim(),
        shippingCountry: (supplier.shippingCountry || "").trim(),

        taxId: (supplier.taxId || "").trim(),
        remarks: (supplier.remarks || "").trim(),
        attachments: supplier.attachments || "",
        status: supplier.status || "active",
      };
    }
    return {
      name: "",
      supplierType: "manufacturer",
      contactPersonName: "",
      phone: "",
      alternatePhone: "",
      email: "",
      billingAddressLine1: "",
      billingAddressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      shippingAddressSameAsBilling: true,
      shippingAddressLine1: "",
      shippingAddressLine2: "",
      shippingCity: "",
      shippingState: "",
      shippingPostalCode: "",
      shippingCountry: "",
      taxId: "",
      remarks: "",
      attachments: "",
      status: "active",
    };
  });

  useEffect(() => {
    if (supplier) {
      // Set form data from supplier
      setFormData({
        name: (supplier.name || "").trim(),
        supplierType: supplier.supplierType || "manufacturer",
        contactPersonName: (supplier.contactPersonName || "").trim(),
        phone: (supplier.phone || "").trim(),
        alternatePhone: (supplier.alternatePhone || "").trim(),
        email: (supplier.email || "").trim(),
        billingAddressLine1: (supplier.billingAddressLine1 || "").trim(),
        billingAddressLine2: (supplier.billingAddressLine2 || "").trim(),
        city: (supplier.city || "").trim(),
        state: (supplier.state || "").trim(),
        postalCode: (supplier.postalCode || "").trim(),
        country: (supplier.country || "").trim(),
        shippingAddressSameAsBilling:
          supplier.shippingAddressSameAsBilling ?? true,
        shippingAddressLine1: (supplier.shippingAddressLine1 || "").trim(),
        shippingAddressLine2: (supplier.shippingAddressLine2 || "").trim(),
        shippingCity: (supplier.shippingCity || "").trim(),
        shippingState: (supplier.shippingState || "").trim(),
        shippingPostalCode: (supplier.shippingPostalCode || "").trim(),
        shippingCountry: (supplier.shippingCountry || "").trim(),

        taxId: (supplier.taxId || "").trim(),
        remarks: (supplier.remarks || "").trim(),
        attachments: supplier.attachments || "",
        status: supplier.status || "active",
      });

      // Reset file-related states
      setSelectedFile(null);
      setRemoveAttachment(false);
    }
  }, [supplier]);

  const handleChange = (field: keyof SupplierData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRemoveAttachment = () => {
    setRemoveAttachment(true);
    setSelectedFile(null);
    handleChange("attachments", "");
    // Reset file input
    const fileInput = document.getElementById(
      "attachments"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.name.trim()) {
      alert("Please enter Supplier Company Name");
      return;
    }
    if (!formData.email || !formData.email.trim()) {
      alert("Please enter Email ID");
      return;
    }
    if (!formData.phone || !formData.phone.trim()) {
      alert("Please enter Mobile Number");
      return;
    }
    
    // If removeAttachment is true, pass a special flag
    if (removeAttachment) {
      onSubmit({ ...formData, attachments: "" }, null);
    } else {
      onSubmit(formData, selectedFile);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {/* Supplier Name */}
          <div>
            <Label htmlFor="name">
              Supplier Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter supplier company name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>

          {/* Supplier Type */}
          <div>
            <Label htmlFor="supplierType">
              Supplier Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.supplierType}
              onValueChange={(value) => handleChange("supplierType", value)}
            >
              <SelectTrigger id="supplierType">
                <SelectValue placeholder="Select supplier type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manufacturer">Manufacturer</SelectItem>
                <SelectItem value="distributor">Distributor</SelectItem>
                <SelectItem value="wholesaler">Wholesaler</SelectItem>
                <SelectItem value="retailer">Retailer</SelectItem>
                <SelectItem value="service_provider">
                  Service Provider
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contact Person Name */}
          <div>
            <Label htmlFor="contactPersonName">
              Contact Person Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contactPersonName"
              placeholder="Enter contact person name"
              value={formData.contactPersonName}
              onChange={(e) =>
                handleChange("contactPersonName", e.target.value)
              }
              required
            />
          </div>

          {/* Mobile Number */}
          <div>
            <Label htmlFor="phone">
              Mobile Number <span className="text-destructive">*</span>
            </Label>
            <PhoneInput
              id="phone"
              country={formData.country}
              value={formData.phone}
              onChange={(value) => handleChange("phone", value)}
            />
          </div>

          {/* Alternate Mobile Number */}
          <div>
            <Label htmlFor="alternatePhone">Alternate Mobile Number</Label>
            <PhoneInput
              id="alternatePhone"
              country={formData.country}
              value={formData.alternatePhone}
              onChange={(value) => handleChange("alternatePhone", value)}
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">
              Email ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="supplier@example.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      {/* Billing Address */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Billing Address
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {/* Billing Address Line 1 */}
          <div className="space-y-2 col-span-2">
            <Label htmlFor="billingAddressLine1">
              Address Line 1 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="billingAddressLine1"
              placeholder="Street address, building number"
              value={formData.billingAddressLine1}
              onChange={(e) =>
                handleChange("billingAddressLine1", e.target.value)
              }
              required
            />
          </div>

          {/* Billing Address Line 2 */}
          <div className="space-y-2 col-span-2">
            <Label htmlFor="billingAddressLine2">Address Line 2</Label>
            <Input
              id="billingAddressLine2"
              placeholder="Apartment, suite, unit, etc."
              value={formData.billingAddressLine2}
              onChange={(e) =>
                handleChange("billingAddressLine2", e.target.value)
              }
            />
          </div>

          {/* Country, State, City */}
          <div className="col-span-2">
            <CountryStateCitySelect
              value={{
                country: formData.country,
                state: formData.state,
                city: formData.city,
              }}
              onChange={(value) => {
                setFormData((prev) => ({
                  ...prev,
                  country: value.country,
                  state: value.state,
                  city: value.city,
                }));
              }}
              required
            />
          </div>

          {/* Pincode */}
          <div className="space-y-2">
            <Label htmlFor="postalCode">
              Pincode <span className="text-destructive">*</span>
            </Label>
            <ZipCodeInput
              id="postalCode"
              country={formData.country}
              state={formData.state}
              city={formData.city}
              value={formData.postalCode}
              onChange={(value) => handleChange("postalCode", value)}
              onLocationSelect={(location) => {
                setFormData((prev) => ({
                  ...prev,
                  city: location.city || prev.city,
                  state: location.state || prev.state,
                }));
              }}
            />
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Shipping Address
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="shippingAddressSameAsBilling"
              checked={formData.shippingAddressSameAsBilling}
              onChange={(e) =>
                handleChange("shippingAddressSameAsBilling", e.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label
              htmlFor="shippingAddressSameAsBilling"
              className="cursor-pointer"
            >
              Same as Billing Address
            </Label>
          </div>
        </div>

        {!formData.shippingAddressSameAsBilling && (
          <div className="grid grid-cols-2 gap-2">
            {/* Shipping Address Line 1 */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="shippingAddressLine1">
                Address Line 1 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="shippingAddressLine1"
                placeholder="Street address, building number"
                value={formData.shippingAddressLine1}
                onChange={(e) =>
                  handleChange("shippingAddressLine1", e.target.value)
                }
                required={!formData.shippingAddressSameAsBilling}
              />
            </div>

            {/* Shipping Address Line 2 */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="shippingAddressLine2">Address Line 2</Label>
              <Input
                id="shippingAddressLine2"
                placeholder="Apartment, suite, unit, etc."
                value={formData.shippingAddressLine2}
                onChange={(e) =>
                  handleChange("shippingAddressLine2", e.target.value)
                }
              />
            </div>

            {/* Shipping Country, State, City */}
            <div className="col-span-2">
              <CountryStateCitySelect
                value={{
                  country: formData.shippingCountry,
                  state: formData.shippingState,
                  city: formData.shippingCity,
                }}
                onChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    shippingCountry: value.country,
                    shippingState: value.state,
                    shippingCity: value.city,
                  }));
                }}
                required
              />
            </div>

            {/* Shipping Pincode */}
            <div className="space-y-2">
              <Label htmlFor="shippingPostalCode">
                Pincode <span className="text-destructive">*</span>
              </Label>
              <ZipCodeInput
                id="shippingPostalCode"
                country={formData.shippingCountry}
                state={formData.shippingState}
                city={formData.shippingCity}
                value={formData.shippingPostalCode}
                onChange={(value) => handleChange("shippingPostalCode", value)}
                onLocationSelect={(location) => {
                  setFormData((prev) => ({
                    ...prev,
                    shippingCity: location.city || prev.shippingCity,
                    shippingState: location.state || prev.shippingState,
                  }));
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Business Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Business Information
        </h3>
        <div className="grid grid-cols-2 gap-2">

          {/* Tax ID */}
          <div className="space-y-2">
            <Label htmlFor="taxId">Tax ID / GST Number</Label>
            <Input
              id="taxId"
              placeholder="Enter tax ID or GST number"
              value={formData.taxId}
              onChange={(e) => handleChange("taxId", e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">
              Status <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange("status", value)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Remarks */}
          <div className="space-y-2 col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="Enter any additional remarks or notes"
              value={formData.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
              rows={3}
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2 col-span-2">
            <Label htmlFor="attachments">Attachments</Label>

            {formData.attachments && !removeAttachment && supplier ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      Current attachment:
                    </p>
                    {formData.attachments.startsWith("http") ? (
                      <a
                        href={formData.attachments}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View File
                      </a>
                    ) : (
                      <span className="text-sm text-green-600">
                        {formData.attachments.split("/").pop() ||
                          formData.attachments}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveAttachment}
                  >
                    Remove
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click &quot;Remove&quot; to delete the current attachment, or
                  upload a new file to replace it.
                </p>
              </div>
            ) : (
              <>
                <Input
                  id="attachments"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      setSelectedFile(files[0]);
                      handleChange("attachments", files[0].name);
                      setRemoveAttachment(false);
                    }
                  }}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Upload relevant documents (contracts, certificates, etc.) -
                  Max 20MB
                </p>
                {selectedFile && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-green-600">
                      Selected: {selectedFile.name}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : supplier
            ? "Update Supplier"
            : "Add Supplier"}
        </Button>
      </div>
    </form>
  );
}
