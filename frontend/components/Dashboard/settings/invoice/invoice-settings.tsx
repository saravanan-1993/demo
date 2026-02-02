"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Loader2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import axiosInstance from "@/lib/axios";

export const InvoiceSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    invoicePrefix: "INV",
    invoiceSequenceLength: 4,
    financialYearStart: new Date().toISOString(),
    financialYearEnd: new Date().toISOString(),
    autoFinancialYear: true,
    manualFinancialYear: "",
    currentSequenceNo: 1,
    invoiceFormat: "{PREFIX}-{FY}-{SEQ}",
    isActive: true,
    createdAt: "",
    updatedAt: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/finance/invoice-settings");
      if (response.data.success) {
        const data = response.data.data;
        setSettings({
          invoicePrefix: data.invoicePrefix,
          invoiceSequenceLength: data.invoiceSequenceLength,
          financialYearStart: data.financialYearStart,
          financialYearEnd: data.financialYearEnd,
          autoFinancialYear: data.autoFinancialYear,
          manualFinancialYear: data.manualFinancialYear || "",
          currentSequenceNo: data.currentSequenceNo,
          invoiceFormat: data.invoiceFormat,
          isActive: data.isActive,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      }
    } catch (error: unknown) {
      console.error("Error fetching invoice settings:", error);
      toast.error("Failed to load invoice settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await axiosInstance.put("/api/finance/invoice-settings", settings);
      if (response.data.success) {
        toast.success("Invoice settings saved successfully");
        fetchSettings(); // Refresh settings
      }
    } catch (error: unknown) {
      console.error("Error saving invoice settings:", error);
      const errorMessage = (error as any).response?.data?.error || "Failed to save invoice settings";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-generate invoice format preview - memoized for reactivity
  const invoicePreview = useMemo(() => {
    const prefix = settings.invoicePrefix || "INV";
    const seq = String(settings.currentSequenceNo || 1).padStart(settings.invoiceSequenceLength, "0");
    
    let fy = "";
    if (settings.autoFinancialYear) {
      const fyStartDate = new Date(settings.financialYearStart);
      const startYear = fyStartDate.getFullYear();
      const endYear = startYear + 1;
      fy = `${startYear}-${endYear.toString().slice(-2)}`;
    } else {
      fy = settings.manualFinancialYear || "2024-25";
    }

    return settings.invoiceFormat
      .replace(/\{PREFIX\}|\[PREFIX\]/gi, prefix)
      .replace(/\{FY\}|\[FY\]/gi, fy)
      .replace(/\{SEQ\}|\[SEQ\]/gi, seq);
  }, [settings.invoicePrefix, settings.invoiceSequenceLength, settings.currentSequenceNo, settings.financialYearStart, settings.financialYearEnd, settings.autoFinancialYear, settings.manualFinancialYear, settings.invoiceFormat]);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    // Initialize dates from settings - now storing full dates
    if (settings.financialYearStart) {
      setStartDate(new Date(settings.financialYearStart));
    }
    if (settings.financialYearEnd) {
      setEndDate(new Date(settings.financialYearEnd));
    }
  }, [settings.financialYearStart, settings.financialYearEnd]);

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date) {
      // Store full date as ISO string
      handleChange("financialYearStart", date.toISOString());
      
      // Automatically calculate financial year end (one day before start date, next year)
      const endDateCalc = new Date(date);
      endDateCalc.setFullYear(endDateCalc.getFullYear() + 1);
      endDateCalc.setDate(endDateCalc.getDate() - 1);
      
      setEndDate(endDateCalc);
      handleChange("financialYearEnd", endDateCalc.toISOString());
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
    <div className="space-y-6">
      {/* Invoice Numbering Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Numbering</CardTitle>
          <CardDescription>
            Configure how invoice numbers are generated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Invoice Prefix *</Label>
              <Input
                id="invoicePrefix"
                value={settings.invoicePrefix}
                onChange={(e) => handleChange("invoicePrefix", e.target.value)}
                placeholder="INV"
              />
              <p className="text-xs text-muted-foreground">
                Prefix for all invoice numbers (e.g., INV, BILL)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceSequenceLength">Sequence Length *</Label>
              <Input
                id="invoiceSequenceLength"
                type="number"
                min="1"
                max="10"
                value={settings.invoiceSequenceLength}
                onChange={(e) => handleChange("invoiceSequenceLength", parseInt(e.target.value) || 4)}
                placeholder="4"
              />
              <p className="text-xs text-muted-foreground">
                Number of digits in sequence (e.g., 4 = 0001)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentSequenceNo">Current Sequence Number</Label>
            <Input
              id="currentSequenceNo"
              type="number"
              min="1"
              value={settings.currentSequenceNo}
              disabled
              className="bg-muted cursor-not-allowed"
              placeholder="1"
            />
            <p className="text-xs text-muted-foreground">
              Auto-incremented with each invoice. Cannot be manually edited.
            </p>
          </div>

        </CardContent>
      </Card>

      {/* Financial Year Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Year</CardTitle>
          <CardDescription>
            Configure financial year for invoice numbering
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Financial Year Start *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMMM dd, yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={handleStartDateChange}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Start date of your financial year (full date with year)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Financial Year End *</Label>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-muted cursor-default",
                  !endDate && "text-muted-foreground"
                )}
                disabled
              >
                <Calendar className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "MMMM dd, yyyy") : <span>Auto-calculated</span>}
              </Button>
              <p className="text-xs text-muted-foreground">
                Auto-calculated as one day before start date (next year)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Financial Year</Label>
              <p className="text-sm text-muted-foreground">
                Automatically determine financial year based on current date
              </p>
            </div>
            <Switch
              checked={settings.autoFinancialYear}
              onCheckedChange={(checked) => handleChange("autoFinancialYear", checked)}
            />
          </div>

          {!settings.autoFinancialYear && (
            <div className="space-y-2">
              <Label htmlFor="manualFinancialYear">Manual Financial Year</Label>
              <Input
                id="manualFinancialYear"
                value={settings.manualFinancialYear}
                onChange={(e) => handleChange("manualFinancialYear", e.target.value)}
                placeholder="2024-25"
              />
              <p className="text-xs text-muted-foreground">
                Enter financial year manually (e.g., 2024-25)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Format Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Format</CardTitle>
          <CardDescription>
            Auto-generated invoice number format based on your settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Format Template</Label>
            <Input
              id="invoiceFormat"
              value={settings.invoiceFormat}
              onChange={(e) => handleChange("invoiceFormat", e.target.value)}
              placeholder="{PREFIX}-{FY}-{SEQ}"
            />
            <p className="text-xs text-muted-foreground">
              Variables: {"{PREFIX}"} = Invoice Prefix, {"{FY}"} = Financial Year, {"{SEQ}"} = Sequence Number
            </p>
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
              <p className="text-lg font-mono font-semibold text-primary">
                {invoicePreview}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              This is how your next invoice number will look
            </p>
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
            "Save Settings"
          )}
        </Button>
      </div>
    </div>
  );
};
