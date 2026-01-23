"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axiosInstance from "@/lib/axios";
import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";

interface WebSettings {
  logoUrl: string | null;
  faviconUrl: string | null;
  logoKey: string | null;
  faviconKey: string | null;
}

export default function LogoSettings() {
  const [settings, setSettings] = useState<WebSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Temporary state for uploads (not saved until Save button clicked)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string>("");
  
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/web/web-settings");
      setSettings(response.data.data);
      setLogoPreview(response.data.data.logoUrl || "");
      setFaviconPreview(response.data.data.faviconUrl || "");
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PNG, JPG, or SVG.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setHasChanges(true);
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/x-icon", "image/vnd.microsoft.icon"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PNG or ICO.");
      return;
    }

    // Validate file size (1MB)
    if (file.size > 1 * 1024 * 1024) {
      toast.error("File size must be less than 1MB");
      return;
    }

    setFaviconFile(file);
    setFaviconPreview(URL.createObjectURL(file));
    setHasChanges(true);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    setHasChanges(true);
  };

  const handleRemoveFavicon = () => {
    setFaviconFile(null);
    setFaviconPreview("");
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Upload logo if changed
      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        await axiosInstance.post("/api/web/web-settings/logo", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else if (!logoPreview && settings?.logoKey) {
        // Delete logo if removed
        await axiosInstance.delete("/api/web/web-settings/logo");
      }

      // Upload favicon if changed
      if (faviconFile) {
        const formData = new FormData();
        formData.append("favicon", faviconFile);
        await axiosInstance.post("/api/web/web-settings/favicon", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else if (!faviconPreview && settings?.faviconKey) {
        // Delete favicon if removed
        await axiosInstance.delete("/api/web/web-settings/favicon");
      }

      toast.success("Settings saved successfully");
      setHasChanges(false);
      setLogoFile(null);
      setFaviconFile(null);
      
      // Refresh settings
      await fetchSettings();
    } catch (error) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error 
        : "Failed to save settings";
      toast.error(errorMessage || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLogoFile(null);
    setFaviconFile(null);
    setLogoPreview(settings?.logoUrl || "");
    setFaviconPreview(settings?.faviconUrl || "");
    setHasChanges(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600 dark:text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Logo & Favicon</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage your website logo and favicon
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {hasChanges ? "Save Changes" : "Saved"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" aria-hidden="true" />
              Website Logo
            </CardTitle>
            <CardDescription>
              Recommended size: 200x60px. Supports PNG, JPG, SVG (Max 5MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview Area */}
            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 bg-slate-50 dark:bg-slate-900/50">
              {logoPreview ? (
                <div className="relative">
                  <div className="flex items-center justify-center min-h-[120px]">
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      width={200}
                      height={60}
                      className="max-h-[120px] w-auto object-contain"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[120px] text-center">
                  <ImageIcon className="h-12 w-12 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No logo uploaded
                  </p>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div>
              <input
                type="file"
                id="logo-upload"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleLogoChange}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById("logo-upload")?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {logoPreview ? "Change Logo" : "Upload Logo"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Favicon Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" aria-hidden="true" />
              Favicon
            </CardTitle>
            <CardDescription>
              Recommended size: 32x32px or 16x16px. Supports PNG, ICO (Max 1MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview Area */}
            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 bg-slate-50 dark:bg-slate-900/50">
              {faviconPreview ? (
                <div className="relative">
                  <div className="flex items-center justify-center min-h-[120px]">
                    <Image
                      src={faviconPreview}
                      alt="Favicon preview"
                      width={64}
                      height={64}
                      className="max-h-[64px] w-auto object-contain"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveFavicon}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[120px] text-center">
                  <ImageIcon className="h-12 w-12 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No favicon uploaded
                  </p>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div>
              <input
                type="file"
                id="favicon-upload"
                accept="image/png,image/x-icon,image/vnd.microsoft.icon"
                onChange={handleFaviconChange}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById("favicon-upload")?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {faviconPreview ? "Change Favicon" : "Upload Favicon"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
