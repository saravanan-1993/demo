"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CurrencySelect } from "@/components/ui/currency-select";
import { PhoneInput } from "@/components/ui/phone-input";
import { ZipCodeInput } from "@/components/ui/zipcode-input";
import { CountryStateCitySelect } from "@/components/ui/country-state-city-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthContext } from "@/components/providers/auth-provider";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";
import {
  User,
  Settings,
  Edit,
  Save,
  X,
  DollarSign,
  Clock,
  MapPin,
} from "lucide-react";
import { getCurrencyByCode, getCurrencySymbol } from "@/lib/currency";
import { Checkbox } from "@/components/ui/checkbox";

interface WorkingHours {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface AdminData {
  id: string;
  email: string;
  name: string;
  image?: string;
  isActive: boolean;
  isVerified: boolean;
  googleId?: string;
  provider: string;
  lastLogin?: string;
  resetToken?: string;
  resetTokenExpiry?: string;
  verificationToken?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: string;
  currency?: string;
  companyName?: string;
  gstNumber?: string;
  onboardingCompleted?: boolean;
  // TEMPORARILY HIDDEN - timezone and dateFormat
  // timezone?: string;
  // dateFormat?: string;
  workingHours?: WorkingHours[];
  createdAt: string;
  updatedAt: string;
}

export const GeneralSettings = () => {
  const { user, updateUser } = useAuthContext();
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    dateOfBirth: undefined as Date | undefined,
    currency: "",
    companyName: "",
    gstNumber: "",
  });

  // Country and State management - removed, now handled by CountryStateCitySelect component

  // Working Hours State - 24 hours by default
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([
    { day: "Monday", enabled: true, startTime: "00:00", endTime: "23:59" },
    { day: "Tuesday", enabled: true, startTime: "00:00", endTime: "23:59" },
    { day: "Wednesday", enabled: true, startTime: "00:00", endTime: "23:59" },
    { day: "Thursday", enabled: true, startTime: "00:00", endTime: "23:59" },
    { day: "Friday", enabled: true, startTime: "00:00", endTime: "23:59" },
    { day: "Saturday", enabled: true, startTime: "00:00", endTime: "23:59" },
    { day: "Sunday", enabled: true, startTime: "00:00", endTime: "23:59" },
  ]);

  // Fetch admin data on component mount
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Fetch directly without waiting for user context
        const response = await axiosInstance.get("/api/auth/admin/me");
        if (response.data.success) {
          setAdminData(response.data.data);

          // Initialize edit form with current data
          setEditForm({
            name: response.data.data.name || "",
            phoneNumber: response.data.data.phoneNumber || "",
            address: response.data.data.address || "",
            city: response.data.data.city || "",
            state: response.data.data.state || "",
            zipCode: response.data.data.zipCode || "",
            country: response.data.data.country,
            dateOfBirth: response.data.data.dateOfBirth
              ? new Date(response.data.data.dateOfBirth)
              : undefined,
            currency: response.data.data.currency || "INR",
            companyName: response.data.data.companyName || "",
            gstNumber: response.data.data.gstNumber || "",
          });

          // Set working hours if available
          if (
            response.data.data.workingHours &&
            response.data.data.workingHours.length > 0
          ) {
            setWorkingHours(response.data.data.workingHours);
          }
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
        toast.error("Failed to fetch admin data");
      }
    };

    fetchAdminData();
  }, []); // Remove user dependency

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original data
    if (adminData) {
      setEditForm({
        name: adminData.name || "",
        phoneNumber: adminData.phoneNumber || "",
        address: adminData.address || "",
        city: adminData.city || "",
        state: adminData.state || "",
        zipCode: adminData.zipCode || "",
        country: adminData.country || "",
        dateOfBirth: adminData.dateOfBirth
          ? new Date(adminData.dateOfBirth)
          : undefined,
        currency: adminData.currency || "INR",
        companyName: adminData.companyName || "",
        gstNumber: adminData.gstNumber || "",
      });
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Validate required fields
      if (!editForm.country || !editForm.state) {
        toast.error("Missing Required Fields", {
          description: "Country and State are required for GST calculations",
        });
        setIsLoading(false);
        return;
      }

      // Validate GST number if provided
      if (editForm.gstNumber && !validateGSTNumber(editForm.gstNumber)) {
        toast.error("Invalid GST Number", {
          description:
            "Please enter a valid 15-character GST number (e.g., 22AAAAA0000A1Z5)",
        });
        setIsLoading(false);
        return;
      }

      // Validate zipcode matches city/state for India
      if (editForm.country  && editForm.zipCode && editForm.zipCode.length === 6) {
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${editForm.zipCode}`);
          const data = await response.json();
          
          if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice) {
            const postOffices: Array<{ State: string; District: string; [key: string]: string | number | boolean }> = data[0].PostOffice;
            const matchesState = postOffices.some((po) => 
              po.State.toLowerCase() === editForm.state.toLowerCase()
            );
            
            if (!matchesState) {
              toast.error("Invalid ZIP Code", {
                description: `ZIP code ${editForm.zipCode} does not belong to ${editForm.state}`,
              });
              setIsLoading(false);
              return;
            }

            if (editForm.city) {
              const matchesCity = postOffices.some((po) => 
                po.District.toLowerCase() === editForm.city.toLowerCase()
              );
              
              if (!matchesCity) {
                toast.error("Invalid ZIP Code", {
                  description: `ZIP code ${editForm.zipCode} does not belong to ${editForm.city}, ${editForm.state}`,
                });
                setIsLoading(false);
                return;
              }
            }
          } else {
            toast.error("Invalid ZIP Code", {
              description: "Please enter a valid Indian pincode",
            });
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error validating zipcode:", error);
          // Continue with save if validation API fails
        }
      }

      const updateData: Record<string, string | number | boolean | WorkingHours[] | undefined> = {
        name: editForm.name,
        phoneNumber: editForm.phoneNumber,
        address: editForm.address,
        city: editForm.city,
        state: editForm.state,
        zipCode: editForm.zipCode,
        dateOfBirth: editForm.dateOfBirth ? editForm.dateOfBirth.toISOString() : undefined,
        companyName: editForm.companyName,
        gstNumber: editForm.gstNumber,
        workingHours,
      };

      // Only include currency and country if onboarding is not completed
      if (adminData && !adminData.onboardingCompleted) {
        updateData.currency = editForm.currency;
        updateData.country = editForm.country;
      }

      const response = await axiosInstance.put(
        "/api/auth/admin/profile",
        updateData
      );
      if (response.data.success) {
        setAdminData(response.data.data);
        setIsEditing(false);

        // Update user context with new data
        if (user) {
          const updatedUser = {
            ...user,
            ...response.data.data,
            currency: response.data.data.currency,
            companyName: response.data.data.companyName,
            state: response.data.data.state,
            country: response.data.data.country,
          };
          updateUser(updatedUser);

          // Trigger a custom event to notify other providers of the update
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("userDataUpdated", {
                detail: updatedUser,
              })
            );
          }
        }

        toast.success("Profile updated successfully", {
          description: editForm.state
            ? `GST will be calculated based on ${editForm.state}`
            : undefined,
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile", {
        description: "Please check all fields and try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // GST Number validation
  const validateGSTNumber = (gstNumber: string): boolean => {
    if (!gstNumber) return true; // Optional field

    // GST number format: 15 characters, alphanumeric
    // Format: 22AAAAA0000A1Z5 (2 digits state code + 10 chars PAN + 1 char entity + 1 char Z + 1 check digit)
    const gstRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gstNumber);
  };

  // Working Hours Functions
  const updateWorkingHours = (
    dayName: string,
    field: keyof WorkingHours,
    value: boolean | string
  ) => {
    setWorkingHours((prev) =>
      prev.map((day) =>
        day.day === dayName ? { ...day, [field]: value } : day
      )
    );
  };

  if (!adminData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Administrator Profile
          </CardTitle>
          <CardDescription>
            Current administrator account information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={adminData?.image} alt={adminData?.name} />
              <AvatarFallback className="text-lg">
                {getInitials(adminData?.name || "Admin")}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold">{adminData?.name}</h3>
                <Badge variant="destructive">Administrator</Badge>
                {adminData?.isVerified && (
                  <Badge variant="outline" className="text-xs">
                    ✓ Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {adminData?.email}
              </p>
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>
                  Last Login:{" "}
                  {adminData?.lastLogin
                    ? new Date(adminData.lastLogin).toLocaleDateString()
                    : "N/A"}
                </span>
                <span>•</span>
                <span>
                  Member since:{" "}
                  {adminData?.createdAt
                    ? new Date(adminData.createdAt).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Administrator Details
              </CardTitle>
              <CardDescription>
                Complete administrator information from database
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-1" />
                    {isLoading ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator className="my-4" />

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Name</Label>
                {isEditing ? (
                  <Input
                    value={editForm.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter name"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {adminData.name}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Phone Number</Label>
                {isEditing ? (
                  <PhoneInput
                    id="phoneNumber"
                    country={editForm.country}
                    value={editForm.phoneNumber}
                    onChange={(value) =>
                      handleInputChange("phoneNumber", value)
                    }
                    className="h-9"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {adminData.phoneNumber || "Not provided"}
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Address</Label>
                {isEditing ? (
                  <Input
                    value={editForm.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    placeholder="Enter address"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {adminData.address || "Not provided"}
                  </p>
                )}
              </div>

              {/* Country, State, City - Using reusable component */}
              {isEditing ? (
                <div className="col-span-2">
                  <CountryStateCitySelect
                    value={{
                      country: editForm.country,
                      state: editForm.state,
                      city: editForm.city,
                    }}
                    onChange={(value) => {
                      setEditForm((prev) => ({
                        ...prev,
                        country: value.country,
                        state: value.state,
                        city: value.city,
                      }));
                    }}
                    required
                    countryDisabled={adminData.onboardingCompleted}
                    countryLabel={
                      adminData.onboardingCompleted
                        ? "Country (Cannot be changed)"
                        : "Country"
                    }
                  />
                </div>
              ) : (
                <>
                  {/* Country - Read Only */}
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Country <span className="text-destructive">*</span>
                      {adminData.onboardingCompleted && (
                        <Badge variant="secondary" className="text-xs">
                          Cannot be changed
                        </Badge>
                      )}
                    </Label>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {adminData.country || "Not provided"}
                      </p>
                      {adminData.onboardingCompleted && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          This setting was locked during initial setup
                        </p>
                      )}
                    </div>
                  </div>

                  {/* State - Read Only */}
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">
                      State <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {adminData.state || "Not provided"}
                    </p>
                  </div>

                  {/* City - Read Only */}
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">City</Label>
                    <p className="text-sm text-muted-foreground">
                      {adminData.city || "Not provided"}
                    </p>
                  </div>
                </>
              )}

              {/* ZIP Code */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">ZIP Code</Label>
                {isEditing ? (
                  <ZipCodeInput
                    id="zipCode"
                    country={editForm.country}
                    state={editForm.state}
                    city={editForm.city}
                    value={editForm.zipCode}
                    onChange={(value) => handleInputChange("zipCode", value)}
                    onLocationSelect={(location) => {
                      if (location.city && !editForm.city) {
                        handleInputChange("city", location.city);
                      }
                      if (location.state && !editForm.state) {
                        handleInputChange("state", location.state);
                      }
                    }}
                    className="h-9"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {adminData.zipCode || "Not provided"}
                  </p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Date of Birth</Label>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex gap-0">
                      {/* Day Dropdown */}
                      <Select
                        value={editForm.dateOfBirth ? editForm.dateOfBirth.getDate().toString() : ""}
                        onValueChange={(value) => {
                          const currentDate = editForm.dateOfBirth || new Date(2000, 0, 1);
                          const newDate = new Date(currentDate);
                          newDate.setDate(parseInt(value));
                          setEditForm((prev) => ({ ...prev, dateOfBirth: newDate }));
                        }}
                      >
                        <SelectTrigger className="rounded-r-none border-r-0">
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Month Dropdown */}
                      <Select
                        value={editForm.dateOfBirth ? editForm.dateOfBirth.getMonth().toString() : ""}
                        onValueChange={(value) => {
                          const currentDate = editForm.dateOfBirth || new Date(2000, 0, 1);
                          const newDate = new Date(currentDate);
                          newDate.setMonth(parseInt(value));
                          setEditForm((prev) => ({ ...prev, dateOfBirth: newDate }));
                        }}
                      >
                        <SelectTrigger className="rounded-none border-r-0">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"
                          ].map((month, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Year Dropdown */}
                      <Select
                        value={editForm.dateOfBirth ? editForm.dateOfBirth.getFullYear().toString() : ""}
                        onValueChange={(value) => {
                          const currentDate = editForm.dateOfBirth || new Date(2000, 0, 1);
                          const newDate = new Date(currentDate);
                          newDate.setFullYear(parseInt(value));
                          setEditForm((prev) => ({ ...prev, dateOfBirth: newDate }));
                        }}
                      >
                        <SelectTrigger className="rounded-l-none">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {editForm.dateOfBirth && !isNaN(editForm.dateOfBirth.getTime()) && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {editForm.dateOfBirth.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {adminData.dateOfBirth
                      ? new Date(adminData.dateOfBirth).toLocaleDateString()
                      : "Not provided"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Company Name</Label>
                {isEditing ? (
                  <Input
                    value={editForm.companyName}
                    onChange={(e) =>
                      handleInputChange("companyName", e.target.value)
                    }
                    placeholder="Enter company name"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {adminData.companyName || "Not provided"}
                  </p>
                )}
              </div>

              {/* GST Number */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">GST Number</Label>
                {isEditing ? (
                  <div className="space-y-1">
                    <Input
                      value={editForm.gstNumber}
                      onChange={(e) =>
                        handleInputChange(
                          "gstNumber",
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="Enter GST number (e.g., 22AAAAA0000A1Z5)"
                      maxLength={15}
                      className={
                        editForm.gstNumber &&
                        !validateGSTNumber(editForm.gstNumber)
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }
                    />
                    {editForm.gstNumber &&
                      !validateGSTNumber(editForm.gstNumber) && (
                        <p className="text-xs text-red-500">
                          Invalid GST format. Should be 15 characters (e.g.,
                          22AAAAA0000A1Z5)
                        </p>
                      )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {adminData.gstNumber || "Not provided"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <Separator />

          {/* Currency Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Currency Preferences
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preferred Currency */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  Preferred Currency
                  {adminData.onboardingCompleted && (
                    <Badge variant="secondary" className="text-xs ml-2">
                      Cannot be changed
                    </Badge>
                  )}
                </Label>
                {isEditing && !adminData.onboardingCompleted ? (
                  <CurrencySelect
                    value={editForm.currency}
                    onValueChange={(value) =>
                      handleInputChange("currency", value)
                    }
                    placeholder="Select currency"
                    className="w-full"
                  />
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {(() => {
                          const currency = getCurrencyByCode(
                            adminData.currency || "INR"
                          );
                          return currency ? (
                            <div className="flex items-center gap-2">
                              <span>{currency.flag}</span>
                              <span className="font-medium">
                                {currency.code}
                              </span>
                              <span>({currency.symbol})</span>
                              <span className="text-xs">- {currency.name}</span>
                            </div>
                          ) : (
                            adminData.currency || "INR"
                          );
                        })()}
                      </span>
                    </div>
                    {adminData.onboardingCompleted && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        This setting was locked during initial setup
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Currency Display Info */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Currency Symbol</Label>
                <p className="text-sm text-muted-foreground">
                  {getCurrencySymbol(adminData.currency || "INR")} - Used
                  throughout the system
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Working Hours */}
          {/* <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Working Hours
            </h3>
            <div className="space-y-3">
              {(() => {
                const dayOrder = [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ];

                const sortedWorkingHours = [...workingHours].sort((a, b) => {
                  return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
                });

                return sortedWorkingHours.map((day) => (
                  <div
                    key={day.day}
                    className="flex items-center gap-4 p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-2 min-w-[100px]">
                      {isEditing ? (
                        <Checkbox
                          checked={day.enabled}
                          onCheckedChange={(checked) =>
                            updateWorkingHours(
                              day.day,
                              "enabled",
                              checked === true
                            )
                          }
                        />
                      ) : null}
                      <Label className="text-sm font-medium">{day.day}</Label>
                    </div>

                    {day.enabled ? (
                      <div className="flex items-center gap-2 flex-1">
                        {isEditing ? (
                          <>
                            <Input
                              type="time"
                              value={day.startTime}
                              onChange={(e) =>
                                updateWorkingHours(
                                  day.day,
                                  "startTime",
                                  e.target.value
                                )
                              }
                              className="w-32"
                            />
                            <span className="text-muted-foreground">to</span>
                            <Input
                              type="time"
                              value={day.endTime}
                              onChange={(e) =>
                                updateWorkingHours(
                                  day.day,
                                  "endTime",
                                  e.target.value
                                )
                              }
                              className="w-32"
                            />
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {day.startTime} - {day.endTime}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground flex-1">
                        Closed
                      </span>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div> */}

          <Separator />
        </CardContent>
      </Card>

      {/* Loading or No Admin Data */}
      {user?.role === "admin" && !adminData && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      )}

      {/* Non-admin users */}
      {user?.role !== "admin" && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">
              Access restricted to administrators only.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
