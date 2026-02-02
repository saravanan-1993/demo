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
import { PhoneInput } from "@/components/ui/phone-input";
import { ZipCodeInput } from "@/components/ui/zipcode-input";
import { CountryStateCitySelect } from "@/components/ui/country-state-city-select";

interface WarehouseData {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  manager: string;
  phone: string;
  status: string;
}

interface AddWarehouseProps {
  warehouse?: WarehouseData | null;
  onSubmit: (data: WarehouseData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function AddWarehouse({
  warehouse,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AddWarehouseProps) {
  const [formData, setFormData] = useState(() => {
    if (warehouse) {
      return {
        name: (warehouse.name || "").trim(),
        address: (warehouse.address || "").trim(),
        city: (warehouse.city || "").trim(),
        state: (warehouse.state || "").trim(),
        postalCode: (warehouse.postalCode || "").trim(),
        country: (warehouse.country || "").trim(),
        manager: (warehouse.manager || "").trim(),
        phone: (warehouse.phone || "").trim(),
        status: warehouse.status || "active",
      };
    }
    return {
      name: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      manager: "",
      phone: "",
      status: "active",
    };
  });

  // Update form data if warehouse prop changes (though key prop usually handles this)
  useEffect(() => {
    if (warehouse) {
      setFormData({
        name: (warehouse.name || "").trim(),
        address: (warehouse.address || "").trim(),
        city: (warehouse.city || "").trim(),
        state: (warehouse.state || "").trim(),
        postalCode: (warehouse.postalCode || "").trim(),
        country: (warehouse.country || "").trim(),
        manager: (warehouse.manager || "").trim(),
        phone: (warehouse.phone || "").trim(),
        status: warehouse.status || "active",
      });
    }
  }, [warehouse]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Warehouse Name */}
        <div className="space-y-2 col-span-2">
          <Label htmlFor="name">
            Warehouse Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Enter warehouse name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
          />
        </div>

        {/* Address */}
        <div className="space-y-2 col-span-2">
          <Label htmlFor="address">
            Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="address"
            placeholder="Street address, building number"
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            required
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
              if (location.city && !formData.city) {
                handleChange("city", location.city);
              }
              if (location.state && !formData.state) {
                handleChange("state", location.state);
              }
            }}
          />
        </div>

        {/* Manager Name */}
        <div className="space-y-2">
          <Label htmlFor="manager">
            Manager Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="manager"
            placeholder="Enter manager name"
            value={formData.manager}
            onChange={(e) => handleChange("manager", e.target.value)}
            required
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">
            Contact Number <span className="text-destructive">*</span>
          </Label>
          <PhoneInput
            id="phone"
            country={formData.country}
            value={formData.phone}
            onChange={(value) => handleChange("phone", value)}
          />
        </div>
        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">
            Status <span className="text-destructive">*</span>
          </Label>
          <Select
            key={formData.status}
            value={formData.status}
            onValueChange={(value) => handleChange("status", value)}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue>
                {formData.status === "active" ? "Active" : "Inactive"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : warehouse ? "Update Warehouse" : "Add Warehouse"}
        </Button>
      </div>
    </form>
  );
}
