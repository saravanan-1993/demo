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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Loader2, CalendarIcon, Info } from "lucide-react";
import {
  supplierService,
  warehouseService,
  categoryService,
  itemService,
  purchaseOrderService,
  gstRateService,
  type Supplier,
  type Warehouse,
  type Category,
  type Item,
  type GSTRate,
} from "@/services/purchaseService";
import { authService } from "@/services/authService";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/useCurrency";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

// GST Options removed - using gstType and gstPercentage directly

interface PurchaseOrderItem {
  id: string;
  itemId?: string;
  category: string;
  productName: string;
  sku: string;
  hsnCode: string;
  quantity: number;
  uom: string;
  price: number;
  gstRateId?: string; // GST Rate ID from finance service
  gstPercentage: number;
  gstType: "cgst_sgst" | "igst";
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  mrp: string;
  itemTotal: number;
  totalPrice: number;
}

interface GSTBreakdown {
  rate: number;
  gstType: "cgst_sgst" | "igst";
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

interface SupplierInfo {
  supplierId: string;
  supplierName: string;
  contactPersonName: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierGSTIN: string;
}

interface PurchaseOrderData {
  supplierInfo: SupplierInfo;
  billingAddress: string;
  shippingAddress: string;
  warehouseId: string;
  warehouseName: string;
  poId: string;
  poDate: string;
  expectedDeliveryDate: string;
  poStatus: string;
  poNotes: string;
  currency: string;
  currencySymbol: string;
  items: PurchaseOrderItem[];
  subTotal: number;
  totalQuantity: number;
  discount: number;
  discountType: "percentage" | "flat";
  gstBreakdown: GSTBreakdown[];
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalGST: number;
  otherCharges: number;
  roundingAdjustment: number;
  grandTotal: number;
}

interface PurchaseFormProps {
  initialData?: PurchaseOrderData | null;
  initialRowCategories?: Record<string, string>;
  onSubmit: (data: PurchaseOrderData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const formatAddress = (
  line1?: string,
  line2?: string,
  city?: string,
  state?: string,
  postalCode?: string,
  country?: string
): string => {
  const parts = [line1, line2, city, state, postalCode, country].filter(
    Boolean
  );
  return parts.join(", ");
};

export default function PurchaseForm({
  initialData,
  initialRowCategories: propInitialRowCategories,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: PurchaseFormProps) {
  const [formData, setFormData] = useState<PurchaseOrderData>({
    supplierInfo: {
      supplierId: "",
      supplierName: "",
      contactPersonName: "",
      supplierPhone: "",
      supplierEmail: "",
      supplierGSTIN: "",
    },
    billingAddress: "",
    shippingAddress: "",
    warehouseId: "",
    warehouseName: "",
    poId: "", // Will be auto-generated
    poDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    poStatus: "draft",
    poNotes: "",
    currency: "INR",
    currencySymbol: "",
    items: [],
    subTotal: 0,
    totalQuantity: 0,
    discount: 0,
    discountType: "flat",
    gstBreakdown: [],
    totalCGST: 0,
    totalSGST: 0,
    totalIGST: 0,
    totalGST: 0,
    otherCharges: 0,
    roundingAdjustment: 0,
    grandTotal: 0,
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [gstRates, setGstRates] = useState<GSTRate[]>([]);

  // Deduplicated GST rates by percentage (keep first occurrence)
  const uniqueGstRates = gstRates.reduce((acc, rate) => {
    if (!acc.find((r) => r.gstPercentage === rate.gstPercentage)) {
      acc.push(rate);
    }
    return acc;
  }, [] as GSTRate[]);

  // Admin state for GST calculation
  const [adminState, setAdminState] = useState<string>("");
  const [currentGSTType, setCurrentGSTType] = useState<
    "cgst_sgst" | "igst" | null
  >(null);

  // Track the ORIGINAL status from database (for determining available options)
  const [originalStatus, setOriginalStatus] = useState<string>("draft");

  // Track custom payment terms from selected supplier

  // Track selected category for each row
  const [rowCategories, setRowCategories] = useState<Record<string, string>>(
    propInitialRowCategories || {}
  );

  // Fetch PO number from backend
  const fetchPONumber = async (): Promise<string> => {
    try {
      const poNumber = await purchaseOrderService.getNextPONumber();
      return poNumber;
    } catch (error) {
      console.error("Error fetching PO number:", error);
      toast.error("Failed to generate PO number");
      return "";
    }
  };

  // GST Type determination utility
  const determineGSTType = (
    adminState: string,
    supplierState: string
  ): "cgst_sgst" | "igst" => {
    if (!adminState || !supplierState) return "cgst_sgst";

    // Normalize state names (remove spaces, lowercase)
    const normalizeState = (state: string) =>
      state.toLowerCase().trim().replace(/\s+/g, "");

    const admin = normalizeState(adminState);
    const supplier = normalizeState(supplierState);

    // Same state → CGST + SGST
    // Different state → IGST
    return admin === supplier ? "cgst_sgst" : "igst";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [
          suppliersData,
          warehousesData,
          categoriesData,
          itemsData,
          adminData,
          gstRatesData,
        ] = await Promise.all([
          supplierService.getAll(),
          warehouseService.getAll("active"),
          categoryService.getActive(),
          itemService.getAll(),
          authService.getCurrentAdmin(),
          gstRateService.getActive(),
        ]);

        setSuppliers(suppliersData);
        setWarehouses(warehousesData);
        setCategories(categoriesData);
        setItems(itemsData);
        setGstRates(gstRatesData);

        // Store admin state for GST calculation
        const adminStateValue = adminData.state || "";
        setAdminState(adminStateValue);

        // Get admin currency for form
        const adminCurrencyValue = adminData.currency || "INR";
        const currencySymbol =
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: adminCurrencyValue,
          })
            .formatToParts(0)
            .find((part) => part.type === "currency")?.value || "₹";

        if (!adminStateValue) {
          toast.warning("Admin State Not Configured", {
            description:
              "Please set your state in Settings for accurate GST calculations",
            duration: 5000,
          });
        }

        const adminAddress = formatAddress(
          adminData.address,
          undefined,
          adminData.city,
          adminData.state,
          adminData.zipCode,
          adminData.country
        );

        // Fetch PO number from backend if not editing
        const poNumber = initialData?.poId || (await fetchPONumber());

        setFormData((prev) => ({
          ...prev,
          poId: poNumber,
          billingAddress: adminAddress || "",
          currency: adminCurrencyValue,
          currencySymbol: currencySymbol,
        }));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialData?.poId]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      // Store the original status from database
      setOriginalStatus(initialData.poStatus);


      // Set row categories from initial data
      if (propInitialRowCategories) {
        setRowCategories(propInitialRowCategories);
      }
    }
  }, [initialData, propInitialRowCategories]);

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (supplier) {

      // Determine GST type based on states
      const supplierState = supplier.state || "";
      const gstType = determineGSTType(adminState, supplierState);
      setCurrentGSTType(gstType);

      // Show notification about GST type
      if (adminState && supplierState) {
        const isSameState = gstType === "cgst_sgst";
        toast.info(
          isSameState
            ? `Same State Transaction: ${adminState} ↔ ${supplierState}`
            : `Inter-State Transaction: ${adminState} ↔ ${supplierState}`,
          {
            description: isSameState
              ? "CGST + SGST will be applied to all items"
              : "IGST will be applied to all items",
            duration: 4000,
          }
        );
      } else if (!adminState) {
        toast.warning("Admin State Not Set", {
          description:
            "Please configure your state in Settings for automatic GST calculation",
          duration: 4000,
        });
      } else if (!supplierState) {
        toast.warning("Supplier State Not Set", {
          description:
            "This supplier doesn't have a state configured. Please update supplier details.",
          duration: 4000,
        });
      }

      setFormData((prev) => {
        // Update existing items with correct GST type and recalculate amounts
        const updatedItems = prev.items.map((item) => {
          const rate = item.gstPercentage;
          const halfRate = rate / 2;

          // Recalculate GST amounts with new type
          const itemTotal = item.quantity * item.price;
          const cgstAmount =
            gstType === "cgst_sgst" ? (itemTotal * halfRate) / 100 : 0;
          const sgstAmount =
            gstType === "cgst_sgst" ? (itemTotal * halfRate) / 100 : 0;
          const igstAmount = gstType === "igst" ? (itemTotal * rate) / 100 : 0;
          const totalGstAmount = cgstAmount + sgstAmount + igstAmount;
          const totalPrice = itemTotal + totalGstAmount;

          return {
            ...item,
            gstType: gstType,
            cgstPercentage: gstType === "cgst_sgst" ? halfRate : 0,
            sgstPercentage: gstType === "cgst_sgst" ? halfRate : 0,
            igstPercentage: gstType === "igst" ? rate : 0,
            cgstAmount: cgstAmount,
            sgstAmount: sgstAmount,
            igstAmount: igstAmount,
            totalGstAmount: totalGstAmount,
            itemTotal: itemTotal,
            totalPrice: totalPrice,
          };
        });

        // Return updated form data with recalculated summary
        return calculateSummary({
          ...prev,
          supplierInfo: {
            supplierId: supplier.id,
            supplierName: supplier.name,
            contactPersonName: supplier.contactPersonName || "",
            supplierPhone: supplier.phone,
            supplierEmail: supplier.email,
            supplierGSTIN: supplier.taxId || "",
          },
          items: updatedItems,
        });
      });
    }
  };

  const handleWarehouseChange = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    if (warehouse) {
      const warehouseAddress = formatAddress(
        warehouse.address,
        undefined,
        warehouse.city,
        warehouse.state,
        undefined,
        warehouse.country
      );

      setFormData((prev) => ({
        ...prev,
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        shippingAddress: warehouseAddress,
      }));
    }
  };

  const handleChange = (field: keyof PurchaseOrderData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    // Use current GST type if supplier is selected, otherwise default to CGST+SGST
    const gstType = currentGSTType || "cgst_sgst";

    const newItem: PurchaseOrderItem = {
      id: Date.now().toString(),
      productName: "",
      quantity: 1,
      price: 0,
      gstPercentage: 0,
      gstType: gstType,
      cgstPercentage: 0,
      sgstPercentage: 0,
      igstPercentage: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalGstAmount: 0,
      itemTotal: 0,
      totalPrice: 0,
      category: "",
      sku: "",
      hsnCode: "",
      uom: "",
      mrp: "",
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  // Handle category selection for a row
  const handleCategorySelect = (rowId: string, categoryName: string) => {
    setRowCategories((prev) => ({
      ...prev,
      [rowId]: categoryName,
    }));

    // Clear item selection when category changes
    setFormData((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === rowId) {
          // Use current GST type or default to CGST+SGST
          const gstType = currentGSTType || "cgst_sgst";
          return {
            ...item,
            itemId: undefined,
            category: categoryName,
            productName: "",
            sku: "",
            hsnCode: "",
            uom: "",
            price: 0,
            gstPercentage: 0,
            gstType: gstType,
            cgstPercentage: 0,
            sgstPercentage: 0,
            igstPercentage: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalGstAmount: 0,
            itemTotal: 0,
            totalPrice: 0,
            mrp: "",
          };
        }
        return item;
      });
      return calculateSummary({ ...prev, items: newItems });
    });
  };

  const handleItemSelect = (rowId: string, itemId: string) => {
    const selectedItem = items.find((item) => item.id === itemId);
    if (selectedItem) {
      setFormData((prev) => {
        const newItems = prev.items.map((item) => {
          if (item.id === rowId) {
            const gstType = currentGSTType || "cgst_sgst";
            const rate = selectedItem.gstPercentage;
            const halfRate = rate / 2;

            // Find the GST rate ID from the selected item's GST percentage
            const matchingGSTRate = uniqueGstRates.find(
              (gstRate) => gstRate.gstPercentage === selectedItem.gstPercentage
            );

            // Calculate GST amounts immediately
            const itemTotal = item.quantity * selectedItem.purchasePrice;
            const cgstAmount =
              gstType === "cgst_sgst" ? (itemTotal * halfRate) / 100 : 0;
            const sgstAmount =
              gstType === "cgst_sgst" ? (itemTotal * halfRate) / 100 : 0;
            const igstAmount =
              gstType === "igst" ? (itemTotal * rate) / 100 : 0;
            const totalGstAmount = cgstAmount + sgstAmount + igstAmount;
            const totalPrice = itemTotal + totalGstAmount;

            return {
              ...item,
              itemId: itemId,
              category: selectedItem.category,
              productName: selectedItem.itemName,
              sku: selectedItem.itemCode || "",
              hsnCode: selectedItem.hsnCode || "",
              uom: selectedItem.uom,
              price: selectedItem.purchasePrice,
              gstRateId: matchingGSTRate?.id, // Store GST Rate ID
              gstPercentage: rate,
              gstType: gstType,
              cgstPercentage: gstType === "cgst_sgst" ? halfRate : 0,
              sgstPercentage: gstType === "cgst_sgst" ? halfRate : 0,
              igstPercentage: gstType === "igst" ? rate : 0,
              itemTotal: itemTotal,
              cgstAmount: cgstAmount,
              sgstAmount: sgstAmount,
              igstAmount: igstAmount,
              totalGstAmount: totalGstAmount,
              totalPrice: totalPrice,
            };
          }
          return item;
        });
        return calculateSummary({ ...prev, items: newItems });
      });
    }
  };

  // Get filtered items for a specific row based on selected category
  const getFilteredItems = (rowId: string): Item[] => {
    const selectedCategory = rowCategories[rowId];
    if (!selectedCategory) return [];
    return items.filter((item) => item.category === selectedCategory);
  };

  const removeItem = (id: string) => {
    setFormData((prev) => {
      const newItems = prev.items.filter((item) => item.id !== id);
      return calculateSummary({ ...prev, items: newItems });
    });
  };

  const updateItem = (
    id: string,
    field: keyof PurchaseOrderItem,
    value: string | number
  ) => {
    setFormData((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // Handle GST option change - this is now handled by the Select onValueChange
          // which directly updates the GST rate based on the selected percentage

          // Recalculate amounts when quantity, price, or GST changes
          if (
            field === "quantity" ||
            field === "price" ||
            field === "gstPercentage"
          ) {
            const itemTotal = updated.quantity * updated.price;
            updated.itemTotal = itemTotal;

            // Calculate GST amounts
            updated.cgstAmount = (itemTotal * updated.cgstPercentage) / 100;
            updated.sgstAmount = (itemTotal * updated.sgstPercentage) / 100;
            updated.igstAmount = (itemTotal * updated.igstPercentage) / 100;
            updated.totalGstAmount =
              updated.cgstAmount + updated.sgstAmount + updated.igstAmount;
            updated.totalPrice = itemTotal + updated.totalGstAmount;
          }

          return updated;
        }
        return item;
      });

      return calculateSummary({ ...prev, items: newItems });
    });
  };

  const calculateSummary = (data: PurchaseOrderData): PurchaseOrderData => {
    const subTotal = data.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    const totalQuantity = data.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const gstMap = new Map<string, GSTBreakdown>();

    data.items.forEach((item) => {
      const key = `${item.gstPercentage}-${item.gstType}`;
      if (!gstMap.has(key)) {
        gstMap.set(key, {
          rate: item.gstPercentage,
          gstType: item.gstType,
          cgstRate: item.cgstPercentage,
          sgstRate: item.sgstPercentage,
          igstRate: item.igstPercentage,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalAmount: 0,
        });
      }

      const breakdown = gstMap.get(key)!;
      breakdown.cgstAmount += item.cgstAmount;
      breakdown.sgstAmount += item.sgstAmount;
      breakdown.igstAmount += item.igstAmount;
      breakdown.totalAmount += item.totalGstAmount;
    });

    const gstBreakdown = Array.from(gstMap.values()).sort(
      (a, b) => a.rate - b.rate
    );

    const totalCGST = data.items.reduce(
      (sum, item) => sum + item.cgstAmount,
      0
    );
    const totalSGST = data.items.reduce(
      (sum, item) => sum + item.sgstAmount,
      0
    );
    const totalIGST = data.items.reduce(
      (sum, item) => sum + item.igstAmount,
      0
    );
    const totalGST = totalCGST + totalSGST + totalIGST;

    let discountAmount = data.discount;
    if (data.discountType === "percentage") {
      discountAmount = (subTotal * data.discount) / 100;
    }

    const beforeRounding =
      subTotal - discountAmount + totalGST + data.otherCharges;

    // Use manual rounding adjustment (don't auto-calculate)
    const grandTotal = beforeRounding + data.roundingAdjustment;

    return {
      ...data,
      subTotal,
      totalQuantity,
      discount: data.discount,
      gstBreakdown,
      totalCGST,
      totalSGST,
      totalIGST,
      totalGST,
      roundingAdjustment: data.roundingAdjustment, // Keep manual value
      grandTotal,
    };
  };

  const handleSummaryChange = (
    field: "discount" | "otherCharges" | "discountType" | "roundingAdjustment",
    value: number | string
  ) => {
    setFormData((prev) => calculateSummary({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Basic Info - Compact Grid */}
      <div className="grid grid-cols-7 gap-3">
        {/* PO Number */}
        <div className="space-y-1.5">
          <Label htmlFor="poId" className="text-xs">
            PO Number
          </Label>
          <Input
            id="poId"
            value={formData.poId}
            readOnly
            className="h-9 text-sm font-medium bg-muted/50 cursor-not-allowed"
            placeholder="PO-2024-001"
          />
        </div>

        {/* Supplier */}
        <div className="space-y-1.5">
          <Label htmlFor="supplierId" className="text-xs">
            Supplier <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.supplierInfo.supplierId}
            onValueChange={handleSupplierChange}
            required
          >
            <SelectTrigger id="supplierId" className="h-9">
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers
                .filter(
                  (s) =>
                    s.status === "active" ||
                    s.id === formData.supplierInfo.supplierId
                )
                .map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Warehouse */}
        <div className="space-y-1.5">
          <Label htmlFor="warehouseId" className="text-xs">
            Warehouse <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.warehouseId}
            onValueChange={handleWarehouseChange}
            required
          >
            <SelectTrigger id="warehouseId" className="h-9">
              <SelectValue placeholder="Select warehouse" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* PO Date */}
        <div className="space-y-1.5">
          <Label htmlFor="poDate" className="text-xs">
            PO Date <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-9 w-full justify-start text-left font-normal text-sm ${
                  !formData.poDate && "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.poDate
                  ? format(new Date(formData.poDate), "PPP")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  formData.poDate ? new Date(formData.poDate) : undefined
                }
                onSelect={(date) =>
                  handleChange("poDate", date ? format(date, "yyyy-MM-dd") : "")
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Expected Delivery */}
        <div className="space-y-1.5">
          <Label htmlFor="expectedDeliveryDate" className="text-xs">
            Delivery Date <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-9 w-full justify-start text-left font-normal text-sm ${
                  !formData.expectedDeliveryDate && "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.expectedDeliveryDate
                  ? format(new Date(formData.expectedDeliveryDate), "PPP")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  formData.expectedDeliveryDate
                    ? new Date(formData.expectedDeliveryDate)
                    : undefined
                }
                onSelect={(date) =>
                  handleChange(
                    "expectedDeliveryDate",
                    date ? format(date, "yyyy-MM-dd") : ""
                  )
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>



        {/* Status */}
        <div className="space-y-1.5">
          <Label htmlFor="poStatus" className="text-xs">
            Status <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.poStatus}
            onValueChange={(value) => handleChange("poStatus", value)}
            disabled={originalStatus === "completed"}
          >
            <SelectTrigger id="poStatus" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* Only Draft and Completed statuses */}
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          {originalStatus === "draft" && (
            <p className="text-xs text-muted-foreground">
              Save as Draft or mark as Completed
            </p>
          )}
          {originalStatus === "completed" && (
            <p className="text-xs text-muted-foreground">
              Completed orders cannot be modified
            </p>
          )}
        </div>
      </div>

      {/* GST Information Banner */}
      {currentGSTType && formData.supplierInfo.supplierId && adminState && (
        <Alert className="border-primary/50 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">
                  {currentGSTType === "cgst_sgst"
                    ? "Intra-State Transaction"
                    : "Inter-State Transaction"}
                </span>
                {" - "}
                <span className="text-muted-foreground">
                  {currentGSTType === "cgst_sgst"
                    ? `CGST + SGST will be applied (Same state: ${adminState})`
                    : `IGST will be applied (${adminState} → ${
                        suppliers.find(
                          (s) => s.id === formData.supplierInfo.supplierId
                        )?.state || "Supplier State"
                      })`}
                </span>
              </div>
              <Badge
                variant={
                  currentGSTType === "cgst_sgst" ? "default" : "secondary"
                }
              >
                {currentGSTType === "cgst_sgst" ? "CGST + SGST" : "IGST"}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Addresses - Compact */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="billingAddress" className="text-xs">
            Billing Address <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="billingAddress"
            value={formData.billingAddress}
            onChange={(e) => handleChange("billingAddress", e.target.value)}
            placeholder="Your company address"
            rows={2}
            className="text-sm"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="shippingAddress" className="text-xs">
            Shipping Address <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="shippingAddress"
            value={formData.shippingAddress}
            onChange={(e) => handleChange("shippingAddress", e.target.value)}
            placeholder="Delivery address"
            rows={2}
            className="text-sm"
            required
          />
        </div>
      </div>

      {/* Supplier Details */}
      {formData.supplierInfo.supplierId && (
        <div className="border rounded-md p-6 bg-muted/30">
          <div className="text-sm font-semibold mb-4">Supplier Details</div>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="supplierContactPerson"
                className="text-xs font-medium"
              >
                Contact Person
              </Label>
              <Input
                id="supplierContactPerson"
                value={formData.supplierInfo.contactPersonName}
                className="h-9 text-sm bg-muted/50"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierPhone" className="text-xs font-medium">
                Mobile Number
              </Label>
              <Input
                id="supplierPhone"
                value={formData.supplierInfo.supplierPhone}
                className="h-9 text-sm bg-muted/50"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierEmail" className="text-xs font-medium">
                Email ID
              </Label>
              <Input
                id="supplierEmail"
                type="email"
                value={formData.supplierInfo.supplierEmail}
                className="h-9 text-sm bg-muted/50"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierGSTIN" className="text-xs font-medium">
                GST Number
              </Label>
              <Input
                id="supplierGSTIN"
                value={formData.supplierInfo.supplierGSTIN}
                className="h-9 text-sm bg-muted/50"
                readOnly
              />
            </div>
          </div>
        </div>
      )}

      {/* Items Table - Simplified */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="size-3 mr-1" />
            Add
          </Button>
        </div>

        {formData.items.length > 0 ? (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="h-9 text-xs w-[140px]">
                    Category
                  </TableHead>
                  <TableHead className="h-9 text-xs min-w-[180px]">
                    Product Name
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[100px]">SKU</TableHead>
                  <TableHead className="h-9 text-xs w-[100px]">
                    HSN Code
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[80px]">
                    Quantity
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[80px]">UOM</TableHead>
                  <TableHead className="h-9 text-xs w-[100px]">Price</TableHead>
                  <TableHead className="h-9 text-xs w-[180px]">GST</TableHead>
                  <TableHead className="h-9 text-xs w-[100px]">
                    GST Amt
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[100px]">MRP</TableHead>
                  <TableHead className="h-9 text-xs w-[100px]">Total</TableHead>
                  <TableHead className="h-9 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.items.map((item) => {
                  const filteredItems = getFilteredItems(item.id);
                  const categoryOptions: SearchableSelectOption[] =
                    categories.map((cat) => ({
                      value: cat.name,
                      label: cat.name,
                    }));

                  const itemOptions: SearchableSelectOption[] =
                    filteredItems.map((invItem) => ({
                      value: invItem.id,
                      label: invItem.itemName,
                      description: invItem.itemCode
                        ? `SKU: ${invItem.itemCode}`
                        : undefined,
                    }));

                  return (
                    <TableRow key={item.id}>
                      {/* 1. Category */}
                      <TableCell className="p-2">
                        <SearchableSelect
                          options={categoryOptions}
                          value={rowCategories[item.id] || ""}
                          onValueChange={(value) =>
                            handleCategorySelect(item.id, value)
                          }
                          placeholder="Select"
                          searchPlaceholder="Search categories..."
                          className="h-8 text-xs w-[140px]"
                        />
                      </TableCell>

                      {/* 2. Product Name */}
                      <TableCell className="p-2">
                        <SearchableSelect
                          options={itemOptions}
                          value={item.itemId || ""}
                          onValueChange={(value) =>
                            handleItemSelect(item.id, value)
                          }
                          placeholder={
                            rowCategories[item.id]
                              ? "Select item"
                              : "Select category first"
                          }
                          searchPlaceholder="Search items..."
                          disabled={!rowCategories[item.id]}
                          className="h-8 text-xs min-w-[180px]"
                        />
                      </TableCell>

                      {/* 3. SKU */}
                      <TableCell className="p-2">
                        <Input
                          value={item.sku}
                          readOnly
                          className="h-8 text-xs bg-muted/30 w-[100px]"
                          placeholder="-"
                        />
                      </TableCell>

                      {/* 4. HSN Code */}
                      <TableCell className="p-2">
                        <Input
                          value={item.hsnCode}
                          readOnly
                          className="h-8 text-xs bg-muted/30 w-[100px]"
                          placeholder="-"
                        />
                      </TableCell>

                      {/* 5. Quantity */}
                      <TableCell className="p-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "quantity",
                              parseInt(e.target.value) || 0
                            )
                          }
                          min="1"
                          className="h-8 w-[80px] text-xs"
                          required
                        />
                      </TableCell>

                      {/* 6. UOM */}
                      <TableCell className="p-2">
                        <Input
                          value={item.uom}
                          readOnly
                          className="h-8 text-xs bg-muted/30 w-[80px] text-center"
                          placeholder="-"
                        />
                      </TableCell>

                      {/* 7. Price */}
                      <TableCell className="p-2">
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          min="0"
                          step="0.01"
                          className="h-8 w-[100px] text-xs"
                          required
                        />
                      </TableCell>

                      {/* 8. GST */}
                      <TableCell className="p-2">
                        <Select
                          value={item.gstPercentage.toString()}
                          onValueChange={(value) => {
                            const rate = parseFloat(value);
                            const gstType = currentGSTType || "cgst_sgst";
                            const halfRate = rate / 2;

                            // Find the GST rate ID from the selected rate
                            const selectedGSTRate = uniqueGstRates.find(
                              (gstRate) => gstRate.gstPercentage === rate
                            );

                            // Update the item with new GST values
                            setFormData((prev) => {
                              const newItems = prev.items.map((i) => {
                                if (i.id === item.id) {
                                  const updated = {
                                    ...i,
                                    gstRateId: selectedGSTRate?.id, // Store GST Rate ID
                                    gstPercentage: rate,
                                    gstType: gstType,
                                    cgstPercentage:
                                      gstType === "cgst_sgst" ? halfRate : 0,
                                    sgstPercentage:
                                      gstType === "cgst_sgst" ? halfRate : 0,
                                    igstPercentage:
                                      gstType === "igst" ? rate : 0,
                                  };

                                  // Recalculate GST amounts
                                  const itemTotal =
                                    updated.quantity * updated.price;
                                  updated.itemTotal = itemTotal;
                                  updated.cgstAmount =
                                    (itemTotal * updated.cgstPercentage) / 100;
                                  updated.sgstAmount =
                                    (itemTotal * updated.sgstPercentage) / 100;
                                  updated.igstAmount =
                                    (itemTotal * updated.igstPercentage) / 100;
                                  updated.totalGstAmount =
                                    updated.cgstAmount +
                                    updated.sgstAmount +
                                    updated.igstAmount;
                                  updated.totalPrice =
                                    itemTotal + updated.totalGstAmount;

                                  return updated;
                                }
                                return i;
                              });
                              return calculateSummary({
                                ...prev,
                                items: newItems,
                              });
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue placeholder="Select GST" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">NIL (0%)</SelectItem>
                            {uniqueGstRates
                              .filter((rate) => rate.gstPercentage !== 0)
                              .map((gstRate) => (
                                <SelectItem
                                  key={gstRate.gstPercentage.toString()}
                                  value={gstRate.gstPercentage.toString()}
                                >
                                  {gstRate.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* 9. GST Amount */}
                      <TableCell className="p-2">
                        <div className="text-xs ">
                          <div className="text-muted-foreground font-medium">
                            {formData.currencySymbol}
                            {item.totalGstAmount.toFixed(2)}
                          </div>
                        </div>
                      </TableCell>

                      {/* 10. MRP (Optional) */}
                      <TableCell className="p-2">
                        <Input
                          type="number"
                          value={item.mrp}
                          onChange={(e) =>
                            updateItem(item.id, "mrp", e.target.value)
                          }
                          min="0"
                          step="0.01"
                          className="h-8 w-[100px] text-xs"
                          placeholder="Optional"
                        />
                      </TableCell>

                      {/* 11. Total */}
                      <TableCell className="p-2 text-xs font-medium w-[100px]">
                        {formData.currencySymbol}
                        {item.totalPrice.toFixed(2)}
                      </TableCell>

                      {/* Delete Button */}
                      <TableCell className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="border rounded-md p-6 text-center text-sm text-muted-foreground">
            No items added
          </div>
        )}
      </div>

      {/* Summary Section */}
      <div className="flex justify-end">
        <div className="w-full max-w-lg border rounded-md p-6 bg-muted/30">
          <div className="space-y-3 text-sm">
            {/* Subtotal */}
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground font-medium">
                Subtotal:
              </span>
              <span className="font-semibold">
                {formData.currencySymbol}
                {formData.subTotal.toFixed(2)}
              </span>
            </div>

            {/* Discount */}
            <div className="flex justify-between items-center gap-4 py-1">
              <Label
                htmlFor="discountType"
                className="text-muted-foreground font-medium whitespace-nowrap"
              >
                Discount:
              </Label>
              <div className="flex items-center gap-2">
                <Select
                  value={formData.discountType}
                  onValueChange={(value) =>
                    handleSummaryChange("discountType", value)
                  }
                >
                  <SelectTrigger className="h-8 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="percentage">%</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={formData.discount}
                  onChange={(e) =>
                    handleSummaryChange(
                      "discount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  min="0"
                  step="0.01"
                  className="h-8 w-24 text-xs"
                  placeholder="0.00"
                />
                {formData.discountType === "percentage" &&
                  formData.discount > 0 && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      (- {formData.currencySymbol}
                      {((formData.subTotal * formData.discount) / 100).toFixed(
                        2
                      )}
                      )
                    </span>
                  )}
              </div>
            </div>

            {/* Other Charges */}
            <div className="flex justify-between items-center gap-4 py-1">
              <Label
                htmlFor="otherCharges"
                className="text-muted-foreground font-medium whitespace-nowrap"
              >
                Other Charges:
              </Label>
              <Input
                id="otherCharges"
                type="number"
                value={formData.otherCharges}
                onChange={(e) =>
                  handleSummaryChange(
                    "otherCharges",
                    parseFloat(e.target.value) || 0
                  )
                }
                min="0"
                step="0.01"
                className="h-8 w-28 text-xs"
                placeholder="0.00"
              />
            </div>

            {/* Rounding */}
            <div className="flex justify-between items-center gap-4 py-1">
              <Label
                htmlFor="roundingAdjustment"
                className="text-muted-foreground font-medium whitespace-nowrap"
              >
                Rounding:
              </Label>
              <div className="flex items-center gap-1.5">
                {(() => {
                  // Recalculate from items (fresh calculation)
                  const subTotal = formData.items.reduce(
                    (sum, item) => sum + item.quantity * item.price,
                    0
                  );

                  const totalGST = formData.items.reduce(
                    (sum, item) =>
                      sum + item.cgstAmount + item.sgstAmount + item.igstAmount,
                    0
                  );

                  let discountAmount = formData.discount || 0;
                  if (formData.discountType === "percentage") {
                    discountAmount = (subTotal * discountAmount) / 100;
                  }

                  const beforeRounding =
                    subTotal -
                    discountAmount +
                    totalGST +
                    formData.otherCharges;

                  // Calculate rounding to nearest whole number
                  const roundedUp = Math.ceil(beforeRounding);
                  const roundedDown = Math.floor(beforeRounding);
                  const roundUpAmount = roundedUp - beforeRounding;
                  const roundDownAmount = roundedDown - beforeRounding;

                  return (
                    <>
                      {/* Round UP button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSummaryChange(
                            "roundingAdjustment",
                            roundUpAmount
                          )
                        }
                        className="h-7 px-2 text-xs"
                        title={`Round up to ${
                          formData.currencySymbol
                        }${roundedUp.toFixed(2)}`}
                      >
                        +{roundUpAmount.toFixed(2)}
                      </Button>

                      {/* Manual input field */}
                      <Input
                        id="roundingAdjustment"
                        type="number"
                        value={formData.roundingAdjustment}
                        onChange={(e) =>
                          handleSummaryChange(
                            "roundingAdjustment",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        step="0.01"
                        className="h-7 w-20 text-xs text-center"
                        placeholder="0.00"
                      />

                      {/* Round DOWN button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSummaryChange(
                            "roundingAdjustment",
                            roundDownAmount
                          )
                        }
                        className="h-7 px-2 text-xs"
                        title={`Round down to ${
                          formData.currencySymbol
                        }${roundedDown.toFixed(2)}`}
                      >
                        {roundDownAmount.toFixed(2)}
                      </Button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* GST Breakdown */}
          {formData.gstBreakdown.length > 0 && (
            <div className="pt-3 mt-3 border-t">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                GST Breakdown:
              </div>
              <div className="space-y-1.5 pl-2">
                {formData.gstBreakdown.map((gst, index) => (
                  <div
                    key={`${gst.rate}-${gst.gstType}-${index}`}
                    className="space-y-1"
                  >
                    {gst.gstType === "cgst_sgst" ? (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            CGST {gst.cgstRate}%:
                          </span>
                          <span>
                            {formData.currencySymbol}
                            {gst.cgstAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            SGST {gst.sgstRate}%:
                          </span>
                          <span>
                            {formData.currencySymbol}
                            {gst.sgstAmount.toFixed(2)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          IGST {gst.igstRate}%:
                        </span>
                        <span>
                          {formData.currencySymbol}
                          {gst.igstAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Tax Amount */}
          <div className="flex justify-between items-center py-2 mt-2 border-t">
            <span className="text-muted-foreground font-medium">
              Total Tax Amount:
            </span>
            <span className="font-semibold">
              {formData.currencySymbol}
              {formData.totalGST.toFixed(2)}
            </span>
          </div>

          {/* Other Charges & Rounding Display */}
          {(formData.otherCharges !== 0 ||
            formData.roundingAdjustment !== 0) && (
            <div className="space-y-2 py-2 border-t">
              {formData.otherCharges !== 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Other Charges:</span>
                  <span className="font-medium">
                    {formData.currencySymbol}
                    {formData.otherCharges.toFixed(2)}
                  </span>
                </div>
              )}
              {formData.roundingAdjustment !== 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Rounding Adjustment:
                  </span>
                  <span className="font-medium">
                    {formData.roundingAdjustment >= 0 ? "+" : ""}
                    {formData.currencySymbol}
                    {formData.roundingAdjustment.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-primary/20">
            <span className="text-lg font-bold">Grand Total:</span>
            <span className="text-xl font-bold text-primary">
              {formData.currencySymbol}
              {formData.grandTotal.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="poNotes" className="text-xs">
          Notes (Optional)
        </Label>
        <Textarea
          id="poNotes"
          value={formData.poNotes}
          onChange={(e) => handleChange("poNotes", e.target.value)}
          placeholder="Additional notes"
          rows={2}
          className="text-sm"
        />
      </div>
      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          size="sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            formData.items.length === 0 ||
            !formData.supplierInfo.supplierId ||
            !formData.warehouseId ||
            originalStatus === "completed"
          }
          size="sm"
        >
          {isSubmitting
            ? "Saving..."
            : initialData
            ? "Update Purchase Order"
            : formData.poStatus === "completed"
            ? "Save & Complete"
            : "Save as Draft"}
        </Button>
      </div>
    </form>
  );
}
