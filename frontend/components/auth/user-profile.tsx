"use client";

import React, { useState } from "react";
import { AxiosError } from "axios";

import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneInput } from "@/components/ui/phone-input";
import { CountryStateCitySelect } from "@/components/ui/country-state-city-select";
import { ZipCodeInput } from "@/components/ui/zipcode-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

import {
  Mail,
  User as UserIcon,
  MapPin,
  Calendar as CalendarIcon,
  Phone,
  Edit,
  CheckCircle,
  Shield,
} from "lucide-react";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";

interface UserProfileProps {
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ className }) => {
  const { user, updateUser } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    image: user?.image || "",
    phoneNumber: user?.phoneNumber || "",
    address: user?.address || "",
    city: user?.city || "",
    state: user?.state || "",
    zipCode: user?.zipCode || "",
    country: user?.country || "",
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth) : undefined as Date | undefined,
  });

  if (!user) {
    return null;
  }

  const isAdmin = user.role === "admin";

  // Redirect admins away from user profile
  if (isAdmin) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <UserIcon className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Admin Account</h3>
                <p className="text-muted-foreground">
                  Admin profiles are managed through the dashboard settings.
                </p>
              </div>
              <Button asChild>
                <a href="/dashboard/settings">Go to Dashboard Settings</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Prepare data with proper date formatting
      const submitData = {
        ...formData,
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth.toISOString() : undefined,
      };

      const response = await axiosInstance.put("/api/auth/profile", submitData);

      if (response.data.success) {
        updateUser(response.data.data);
        setIsEditing(false);
        toast.success("Profile updated successfully");
      }
    } catch (error: unknown) {
      console.error("Profile update error:", error);
      if (error instanceof AxiosError) {
        toast.error(
          (error.response?.data as { error: string })?.error ||
            "Failed to update profile"
        );
      } else {
        toast.error("Failed to update profile");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      image: user.image || "",
      phoneNumber: user.phoneNumber || "",
      address: user.address || "",
      city: user.city || "",
      state: user.state || "",
      zipCode: user.zipCode || "",
      country: user.country || "",
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : undefined,
    });
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === "admin" ? "destructive" : "secondary";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    return format(new Date(dateString), "MMMM d, yyyy");
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback className="text-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-bold">{user.name}</h2>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
                <div className="flex items-center space-x-4">
                  {user.isVerified && (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Member since {formatDate(user.createdAt || "")}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Manage your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <PhoneInput
                    key={`phone-${formData.country}`}
                    id="phoneNumber"
                    country={formData.country || "India"}
                    value={formData.phoneNumber}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        phoneNumber: value,
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="md:col-span-2">
                  <CountryStateCitySelect
                    value={{
                      country: formData.country || "",
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
                    disabled={!isEditing}
                    showLabels
                    countryLabel="Country"
                    stateLabel="State"
                    cityLabel="City"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                  <ZipCodeInput
                    id="zipCode"
                    country={formData.country}
                    state={formData.state}
                    city={formData.city}
                    value={formData.zipCode}
                    onChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        zipCode: value,
                      }));
                    }}
                    onLocationSelect={(location) => {
                      setFormData((prev) => ({
                        ...prev,
                        city: location.city || prev.city,
                        state: location.state || prev.state,
                      }));
                    }}
                    disabled={!isEditing}
                    placeholder="Enter postal code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <div className="flex gap-0">
                    {/* Day Dropdown */}
                    <Select
                      value={formData.dateOfBirth ? formData.dateOfBirth.getDate().toString() : ""}
                      onValueChange={(value) => {
                        const currentDate = formData.dateOfBirth || new Date(2000, 0, 1);
                        const newDate = new Date(currentDate);
                        newDate.setDate(parseInt(value));
                        setFormData((prev) => ({ ...prev, dateOfBirth: newDate }));
                      }}
                      disabled={!isEditing}
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
                      value={formData.dateOfBirth ? formData.dateOfBirth.getMonth().toString() : ""}
                      onValueChange={(value) => {
                        const currentDate = formData.dateOfBirth || new Date(2000, 0, 1);
                        const newDate = new Date(currentDate);
                        newDate.setMonth(parseInt(value));
                        setFormData((prev) => ({ ...prev, dateOfBirth: newDate }));
                      }}
                      disabled={!isEditing}
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
                      value={formData.dateOfBirth ? formData.dateOfBirth.getFullYear().toString() : ""}
                      onValueChange={(value) => {
                        const currentDate = formData.dateOfBirth || new Date(2000, 0, 1);
                        const newDate = new Date(currentDate);
                        newDate.setFullYear(parseInt(value));
                        setFormData((prev) => ({ ...prev, dateOfBirth: newDate }));
                      }}
                      disabled={!isEditing}
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
                  {formData.dateOfBirth && !isNaN(formData.dateOfBirth.getTime()) && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {format(formData.dateOfBirth, "MMMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                {!isEditing ? (
                  <Button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Profile Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Profile Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {user.phoneNumber || "No phone number"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {user.dateOfBirth
                    ? format(new Date(user.dateOfBirth), "MMMM d, yyyy")
                    : "Not set"}
                </span>
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {user.address
                    ? `${user.address}, ${user.city || ""} ${
                        user.state || ""
                      } ${user.zipCode || ""}, ${user.country || ""}`
                        .replace(/\s+/g, " ")
                        .trim()
                    : "No address provided"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your account details and security information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Email address cannot be changed for security reasons.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Account Details</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Role:</span>
                    <Badge
                      variant={getRoleBadgeVariant(user.role)}
                      className="ml-2"
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <Badge
                      variant={user.isVerified ? "default" : "secondary"}
                      className="ml-2"
                    >
                      {user.isVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Member since:
                    </span>
                    <span className="ml-2">
                      {formatDate(user.createdAt || "")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last login:</span>
                    <span className="ml-2">
                      {formatDate(user.lastLogin || "")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
