"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Building2, Mail, Phone, MapPin, Globe } from "lucide-react";
import axiosInstance from "@/lib/axios";

interface CompanyInfo {
  companyName: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website: string;
  mapIframe: string;
  socialMedia: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };
}

export const CompanySettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    companyName: "",
    tagline: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    website: "",
    mapIframe: "",
    socialMedia: {
      facebook: "",
      twitter: "",
      instagram: "",
      linkedin: "",
      youtube: "",
    },
  });

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/web/company");
      if (response.data.success) {
        setCompanyInfo(response.data.data || companyInfo);
      }
    } catch (error: unknown) {
      console.error("Error fetching company info:", error);
      toast.error("Failed to load company information");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    if (field.startsWith("socialMedia.")) {
      const socialField = field.split(".")[1];
      setCompanyInfo((prev) => ({
        ...prev,
        socialMedia: {
          ...prev.socialMedia,
          [socialField]: value,
        },
      }));
    } else {
      setCompanyInfo((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await axiosInstance.post("/api/web/company", companyInfo);
      if (response.data.success) {
        toast.success("Company information saved successfully");
        fetchCompanyInfo();
      }
    } catch (error: unknown) {
      console.error("Error saving company info:", error);
      const errorMessage = (error as any).response?.data?.error || "Failed to save company information";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Company details displayed on your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={companyInfo.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input
                value={companyInfo.tagline}
                onChange={(e) => handleChange("tagline", e.target.value)}
                placeholder="Your company tagline"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={companyInfo.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Brief description about your company"
              rows={4}
            />
          </div>

         
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>
            How customers can reach you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </Label>
              <Input
                type="email"
                value={companyInfo.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="contact@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone *
              </Label>
              <Input
                type="tel"
                value={companyInfo.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website
            </Label>
            <Input
              type="url"
              value={companyInfo.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://www.company.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address Information
          </CardTitle>
          <CardDescription>
            Physical location of your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Street Address</Label>
            <Input
              value={companyInfo.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={companyInfo.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label>State/Province</Label>
              <Input
                value={companyInfo.state}
                onChange={(e) => handleChange("state", e.target.value)}
                placeholder="State"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ZIP/Postal Code</Label>
              <Input
                value={companyInfo.zipCode}
                onChange={(e) => handleChange("zipCode", e.target.value)}
                placeholder="12345"
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={companyInfo.country}
                onChange={(e) => handleChange("country", e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Google Maps Iframe Embed Code</Label>
            <Textarea
              value={companyInfo.mapIframe}
              onChange={(e) => handleChange("mapIframe", e.target.value)}
              placeholder='<iframe src="https://www.google.com/maps/embed?pb=..." width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>'
              rows={4}
              className="w-full break-all"
            />
            <p className="text-xs text-muted-foreground">
              Paste the complete iframe embed code from Google Maps. This will be displayed on the contact page.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card>
        <CardHeader>
          <CardTitle>Social Media Links</CardTitle>
          <CardDescription>
            Connect your social media profiles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input
                value={companyInfo.socialMedia.facebook}
                onChange={(e) => handleChange("socialMedia.facebook", e.target.value)}
                placeholder="https://facebook.com/yourpage"
              />
            </div>
            <div className="space-y-2">
              <Label>Twitter</Label>
              <Input
                value={companyInfo.socialMedia.twitter}
                onChange={(e) => handleChange("socialMedia.twitter", e.target.value)}
                placeholder="https://twitter.com/yourhandle"
              />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input
                value={companyInfo.socialMedia.instagram}
                onChange={(e) => handleChange("socialMedia.instagram", e.target.value)}
                placeholder="https://instagram.com/yourprofile"
              />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <Input
                value={companyInfo.socialMedia.linkedin}
                onChange={(e) => handleChange("socialMedia.linkedin", e.target.value)}
                placeholder="https://linkedin.com/company/yourcompany"
              />
            </div>
            <div className="space-y-2">
              <Label>YouTube</Label>
              <Input
                value={companyInfo.socialMedia.youtube}
                onChange={(e) => handleChange("socialMedia.youtube", e.target.value)}
                placeholder="https://youtube.com/@yourchannel"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Company Information"
          )}
        </Button>
      </div>
    </div>
  );
};
