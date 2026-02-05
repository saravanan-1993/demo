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
import { Plus, Trash2, Loader2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import {
  supplierService,
  warehouseService,
  categoryService,
  itemService,
  purchaseOrderService,
  type Supplier,
  type Warehouse,
  type Item,
  type PurchaseOrder,
} from "@/services/purchaseService";
import { authService } from "@/services/authService";
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
import { useCurrency } from "@/hooks/useCurrency";

// GST Options removed - using gstType and gstPercentage directly

// Types
export interface BillItem {
  id: string;
  category: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  hsnCode: string;
  quantityReceived: number;
  uom: string;
  batchNo?: string;
  expiryDate?: string;
  mfgDate?: string;
  purchasePrice: number;
  gstRateId?: string; // GST Rate ID from finance service
  gstPercentage: number; // Just the rate (5, 12, 18, 28)
  gstType: "cgst_sgst" | "igst"; // Determined by state comparison
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  totalAmount: number;
}

export interface BillFormData {
  // GRN/Bill Details
  grnNumber: string;
  invoiceNumber: string;
  grnDate: string;
  supplierId: string;
  supplierName: string;
  poId?: string;
  billDueDate: string;

  // Addresses
  billingAddress: string;
  shippingAddress: string;
  warehouseId: string;
  warehouseName: string;

  // Shipment Details
  shipmentReceivedDate: string;
  deliveryChallanNumber?: string;
  transporterName?: string;
  eWayBillNumber?: string;
  remarks?: string;
  invoiceCopy?: File | string;

  // Supplier Details
  contactPersonName: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierGSTIN: string;
  supplierAddress: string;

  // Items
  items: BillItem[];

  // Summary
  subTotal: number;
  totalDiscount: number;
  discount: number;
  discountType: "flat" | "percentage";
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalGST: number;
  otherCharges: number;
  roundOff: number;
  grandTotal: number;

  // Payment
  paymentStatus: "paid" | "unpaid";
  paymentMethod?: string;
  referenceNumber?: string;
  paymentDate?: string;
}

interface BillFormProps {
  initialData?: BillFormData | null;
  onSubmit: (data: BillFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function BillForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: BillFormProps) {
  // State for data from API
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [gstRates, setGstRates] = useState<
    Array<{
      id: string;
      name: string;
      gstPercentage: number;
      isActive: boolean;
    }>
  >([]);

  // Admin state for GST calculation
  const [adminState, setAdminState] = useState<string>("");
  const [gstType, setGstType] = useState<"cgst_sgst" | "igst">("cgst_sgst");
  const currencySymbol = useCurrency();

  // Deduplicated GST rates by percentage (keep first occurrence)
  const uniqueGstRates = gstRates.reduce((acc, rate) => {
    if (!acc.find((r) => r.gstPercentage === rate.gstPercentage)) {
      acc.push(rate);
    }
    return acc;
  }, [] as typeof gstRates);

  const [formData, setFormData] = useState<BillFormData>({
    grnNumber: "", // Will be auto-generated from backend
    invoiceNumber: "",
    grnDate: new Date().toISOString().split("T")[0],
    supplierId: "",
    supplierName: "",
    billDueDate: "",
    billingAddress: "",
    shippingAddress: "",
    warehouseId: "",
    warehouseName: "",
    shipmentReceivedDate: new Date().toISOString().split("T")[0],
    contactPersonName: "",
    supplierPhone: "",
    supplierEmail: "",
    supplierGSTIN: "",
    supplierAddress: "",
    items: [],
    subTotal: 0,
    totalDiscount: 0,
    discount: 0,
    discountType: "flat",
    totalCGST: 0,
    totalSGST: 0,
    totalIGST: 0,
    totalGST: 0,
    otherCharges: 0,
    roundOff: 0,
    grandTotal: 0,
    paymentStatus: "paid",
  });

  // Track selected category for each row - MUST be declared before useEffect
  const [rowCategories, setRowCategories] = useState<Record<string, string>>(
    {}
  );

  // Helper function to format address
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

  // Fetch GRN number from backend
  const fetchGRNNumber = async (): Promise<string> => {
    try {
      const { billService } = await import("@/services/billService");
      const grnNumber = await billService.getNextGRNNumber();
      return grnNumber;
    } catch (error) {
      console.error("Error fetching GRN number:", error);
      toast.error("Failed to generate GRN number");
      return "";
    }
  };

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Import gstRateService dynamically
        const { gstRateService } = await import("@/services/purchaseService");

        // Load critical data first
        const [
          suppliersData,
          warehousesData,
          categoriesData,
          itemsData,
          purchaseOrdersData,
          adminData,
          gstRatesData,
        ] = await Promise.all([
          supplierService.getAll(),
          warehouseService.getAll("active"),
          categoryService.getActive(),
          itemService.getAll(),
          purchaseOrderService.getAvailableForBill(), // Only get POs without bills
          authService.getCurrentAdmin(),
          gstRateService.getActive(),
        ]);

        setSuppliers(suppliersData);
        setWarehouses(warehousesData);
        setCategories(categoriesData.map((c) => c.name));
        setItems(itemsData);
        setPurchaseOrders(purchaseOrdersData);
        setGstRates(gstRatesData);

        // Store admin state for GST calculation
        const adminStateValue = adminData.state || "";
        setAdminState(adminStateValue);

        // Auto-fill billing address from admin settings
        const adminAddress = formatAddress(
          adminData.address,
          undefined,
          adminData.city,
          adminData.state,
          adminData.zipCode,
          adminData.country
        );

        // Fetch GRN number from backend if not editing
        const grnNumber = initialData?.grnNumber || (await fetchGRNNumber());

        setFormData((prev) => ({
          ...prev,
          grnNumber: grnNumber,
          billingAddress: adminAddress || "",
        }));

        if (!adminStateValue) {
          toast.warning("Admin State Not Configured", {
            description:
              "Please set your state in Settings for accurate GST calculations",
            duration: 5000,
          });
        }
      } catch (error) {
        console.error("Error loading data:", error);
        const err = error as {
          response?: { status?: number; data?: { message?: string } };
        };

        if (err.response?.status === 503) {
          toast.error("Service temporarily unavailable. Please try again.");
        } else {
          toast.error(
            err.response?.data?.message || "Failed to load form data"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [initialData?.grnNumber]);

  useEffect(() => {
    if (initialData) {
      // Ensure all items have proper IDs
      const itemsWithIds = initialData.items.map((item) => ({
        ...item,
        id: item.id || Date.now().toString() + Math.random(),
      }));

      setFormData({
        ...initialData,
        items: itemsWithIds,
      });

      // Initialize rowCategories from initialData items
      const categories: Record<string, string> = {};
      itemsWithIds.forEach((item) => {
        if (item.category) {
          categories[item.id] = item.category;
        }
      });
      setRowCategories(categories);

      // Set GST type from initial data
      if (initialData.supplierId && suppliers.length > 0) {
        const supplier = suppliers.find((s) => s.id === initialData.supplierId);
        if (supplier) {
          const supplierState = supplier.state || "";

          // Determine GST type
          let newGstType: "cgst_sgst" | "igst" = "igst";
          if (adminState && supplierState) {
            newGstType =
              adminState.toLowerCase() === supplierState.toLowerCase()
                ? "cgst_sgst"
                : "igst";
          }
          setGstType(newGstType);
        }
      }
    }
  }, [initialData, suppliers, adminState]);

  const calculateTotals = () => {
    const subTotal = formData.items.reduce(
      (sum, item) => sum + item.quantityReceived * item.purchasePrice,
      0
    );

    // Calculate discount amount based on type
    let totalDiscount = formData.discount;
    if (formData.discountType === "percentage") {
      totalDiscount = (subTotal * formData.discount) / 100;
    }

    const totalCGST = formData.items.reduce(
      (sum, item) => sum + item.cgstAmount,
      0
    );
    const totalSGST = formData.items.reduce(
      (sum, item) => sum + item.sgstAmount,
      0
    );
    const totalIGST = formData.items.reduce(
      (sum, item) => sum + item.igstAmount,
      0
    );

    const totalGST = totalCGST + totalSGST + totalIGST;

    const beforeRounding =
      subTotal - totalDiscount + totalGST + formData.otherCharges;

    // Use manual rounding adjustment (don't auto-calculate)
    const grandTotal = beforeRounding + formData.roundOff;

    setFormData((prev) => ({
      ...prev,
      subTotal,
      totalDiscount,
      totalCGST,
      totalSGST,
      totalIGST,
      totalGST,
      roundOff: prev.roundOff, // Keep manual value
      grandTotal,
    }));
  };

  // Auto-calculate totals
  useEffect(() => {
    calculateTotals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.items,
    formData.discount,
    formData.discountType,
    formData.otherCharges,
    formData.roundOff,
  ]);

  const handleChange = (
    field: keyof BillFormData,
    value: string | number | File
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle PO selection - auto-populate fields
  const handlePOSelect = async (poId: string) => {
    try {
      const po = await purchaseOrderService.getById(poId);
      const supplier = suppliers.find((s) => s.id === po.supplierId);

      if (supplier) {
        // Build supplier address
        const supplierAddress = [
          supplier.billingAddressLine1,
          supplier.billingAddressLine2,
          supplier.city,
          supplier.state,
          supplier.postalCode,
          supplier.country,
        ]
          .filter(Boolean)
          .join(", ");

        // Determine GST type based on supplier state
        const supplierState = supplier.state || "";

        const newGstType =
          adminState &&
          supplierState &&
          adminState.toLowerCase() === supplierState.toLowerCase()
            ? "cgst_sgst"
            : "igst";
        setGstType(newGstType);

        // Create items with proper IDs for row categories
        const poItems: BillItem[] = po.items.map((item) => {
          const rate = item.gstPercentage;
          const halfRate = rate / 2;
          const itemId = Date.now().toString() + Math.random();

          // Calculate GST amounts immediately
          const itemTotal = item.quantity * item.price;
          const cgstAmount =
            newGstType === "cgst_sgst" ? (itemTotal * halfRate) / 100 : 0;
          const sgstAmount =
            newGstType === "cgst_sgst" ? (itemTotal * halfRate) / 100 : 0;
          const igstAmount =
            newGstType === "igst" ? (itemTotal * rate) / 100 : 0;
          const totalGstAmount = cgstAmount + sgstAmount + igstAmount;
          const totalAmount = itemTotal + totalGstAmount;

          return {
            id: itemId,
            category: item.category,
            itemId: item.itemId || "",
            itemName: item.productName,
            itemCode: item.sku,
            hsnCode: item.hsnCode,
            quantityReceived: item.quantity,
            uom: item.uom,
            batchNo: undefined, // Optional - to be filled during GRN
            expiryDate: undefined, // Optional - to be filled during GRN
            mfgDate: undefined, // Optional - to be filled during GRN
            purchasePrice: item.price,
            gstRateId: item.gstRateId, // Include GST Rate ID from PO
            gstPercentage: rate,
            gstType: newGstType as "cgst_sgst" | "igst",
            cgstPercentage: newGstType === "cgst_sgst" ? halfRate : 0,
            sgstPercentage: newGstType === "cgst_sgst" ? halfRate : 0,
            igstPercentage: newGstType === "igst" ? rate : 0,
            cgstAmount: cgstAmount,
            sgstAmount: sgstAmount,
            igstAmount: igstAmount,
            totalGstAmount: totalGstAmount,
            totalAmount: totalAmount,
          };
        });

        // Set row categories for PO items
        const newRowCategories: Record<string, string> = {};
        poItems.forEach((item) => {
          if (item.category) {
            newRowCategories[item.id] = item.category;
          }
        });
        setRowCategories(newRowCategories);

        setFormData((prev) => ({
          ...prev,
          poId: po.id,
          supplierId: supplier.id,
          supplierName: supplier.name,
          contactPersonName: supplier.contactPersonName || supplier.name,
          supplierPhone: supplier.phone,
          supplierEmail: supplier.email,
          supplierGSTIN: supplier.taxId || "",
          supplierAddress,
          warehouseId: po.warehouseId,
          warehouseName: po.warehouseName,
          shippingAddress: po.shippingAddress,
          billingAddress: po.billingAddress,
          items: poItems,
          // Auto-fill summary from PO
          discount: po.discount || 0,
          discountType: (po.discountType as "flat" | "percentage") || "flat",
          otherCharges: po.otherCharges || 0,
          roundOff: po.roundingAdjustment || 0,
        }));
        toast.success("Purchase order data loaded successfully");
      }
    } catch (error) {
      console.error("Error loading PO:", error);
      toast.error("Failed to load purchase order data");
    }
  };

  // Handle supplier selection
  const handleSupplierSelect = (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (supplier) {
      const supplierAddress = [
        supplier.billingAddressLine1,
        supplier.billingAddressLine2,
        supplier.city,
        supplier.state,
        supplier.postalCode,
        supplier.country,
      ]
        .filter(Boolean)
        .join(", ");

      // Determine GST type based on state comparison
      const supplierState = supplier.state || "";

      // If admin state is not available, default to IGST (safer for inter-state)
      let newGstType: "cgst_sgst" | "igst" = "igst";

      if (adminState && supplierState) {
        newGstType =
          adminState.toLowerCase() === supplierState.toLowerCase()
            ? "cgst_sgst"
            : "igst";
      } else if (!adminState && supplierState) {
        // Show warning if admin state is not set
        toast.warning(
          "Admin state not configured. Defaulting to IGST. Please set your state in Settings."
        );
      }

      setGstType(newGstType);

      setFormData((prev) => ({
        ...prev,
        supplierId,
        supplierName: supplier.name,
        contactPersonName: supplier.contactPersonName || supplier.name,
        supplierPhone: supplier.phone,
        supplierEmail: supplier.email,
        supplierGSTIN: supplier.taxId || "",
        supplierAddress,
        // Update all items with new GST type
        items: prev.items.map((item) => {
          const rate = item.gstPercentage;
          const halfRate = rate / 2;
          return {
            ...item,
            gstType: newGstType,
            cgstPercentage: newGstType === "cgst_sgst" ? halfRate : 0,
            sgstPercentage: newGstType === "cgst_sgst" ? halfRate : 0,
            igstPercentage: newGstType === "igst" ? rate : 0,
          };
        }),
      }));

      // Recalculate all items with new GST type
      setTimeout(() => calculateTotals(), 100);
    }
  };

  // Handle warehouse selection
  const handleWarehouseSelect = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    if (warehouse) {
      const warehouseAddress = [
        warehouse.address,
        warehouse.city,
        warehouse.state,
        warehouse.country,
      ]
        .filter(Boolean)
        .join(", ");

      setFormData((prev) => ({
        ...prev,
        warehouseId,
        warehouseName: warehouse.name,
        shippingAddress: warehouseAddress,
      }));
    }
  };

  // Add new item
  const addItem = () => {
    // Use current GST type if supplier is selected, otherwise default to CGST+SGST
    const currentGstType = gstType || "cgst_sgst";

    const newItem: BillItem = {
      id: Date.now().toString(),
      category: "",
      itemId: "",
      itemName: "",
      itemCode: "",
      hsnCode: "",
      quantityReceived: 1,
      uom: "",
      purchasePrice: 0,
      gstPercentage: 0,
      gstType: currentGstType,
      cgstPercentage: 0,
      sgstPercentage: 0,
      igstPercentage: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalGstAmount: 0,
      totalAmount: 0,
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  // Remove item
  const removeItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  // Update item
  const updateItem = (
    id: string,
    field: keyof BillItem,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // Recalculate item totals when quantity, price, or GST changes
          if (
            field === "quantityReceived" ||
            field === "purchasePrice" ||
            field === "gstPercentage"
          ) {
            const itemTotal = updated.quantityReceived * updated.purchasePrice;

            // Calculate GST amounts (no per-item discount)
            updated.cgstAmount = (itemTotal * updated.cgstPercentage) / 100;
            updated.sgstAmount = (itemTotal * updated.sgstPercentage) / 100;
            updated.igstAmount = (itemTotal * updated.igstPercentage) / 100;
            updated.totalGstAmount =
              updated.cgstAmount + updated.sgstAmount + updated.igstAmount;
            updated.totalAmount = itemTotal + updated.totalGstAmount;
          }

          return updated;
        }
        return item;
      }),
    }));
  };

  // Handle item selection
  const handleItemSelect = (itemId: string, billItemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      const currentGstType = gstType || "cgst_sgst";
      const rate = item.gstPercentage;
      const halfRate = rate / 2;

      // Find the GST rate ID from the selected item's GST percentage
      const matchingGSTRate = uniqueGstRates.find(
        (gstRate) => gstRate.gstPercentage === item.gstPercentage
      );

      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((billItem) => {
          if (billItem.id === billItemId) {
            // Calculate GST amounts immediately (no per-item discount)
            const itemTotal = billItem.quantityReceived * item.purchasePrice;

            const cgstAmount = currentGstType === "cgst_sgst" ? (itemTotal * halfRate) / 100 : 0;
            const sgstAmount = currentGstType === "cgst_sgst" ? (itemTotal * halfRate) / 100 : 0;
            const igstAmount = currentGstType === "igst" ? (itemTotal * rate) / 100 : 0;
            const totalGstAmount = cgstAmount + sgstAmount + igstAmount;
            const totalAmount = itemTotal + totalGstAmount;

            return {
              ...billItem,
              itemId: itemId,
              itemName: item.itemName,
              itemCode: item.itemCode || "",
              hsnCode: item.hsnCode || "",
              category: item.category,
              uom: item.uom,
              purchasePrice: item.purchasePrice,
              gstRateId: matchingGSTRate?.id, // Store GST Rate ID
              gstPercentage: rate,
              gstType: currentGstType,
              cgstPercentage: currentGstType === "cgst_sgst" ? halfRate : 0,
              sgstPercentage: currentGstType === "cgst_sgst" ? halfRate : 0,
              igstPercentage: currentGstType === "igst" ? rate : 0,
              cgstAmount: cgstAmount,
              sgstAmount: sgstAmount,
              igstAmount: igstAmount,
              totalGstAmount: totalGstAmount,
              totalAmount: totalAmount,
            };
          }
          return billItem;
        }),
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    onSubmit(formData);
  };

  // Handle category selection for a row
  const handleCategorySelect = (rowId: string, categoryName: string) => {
    setRowCategories((prev) => ({
      ...prev,
      [rowId]: categoryName,
    }));

    // Clear item selection when category changes
    updateItem(rowId, "category", categoryName);
    updateItem(rowId, "itemId", "");
    updateItem(rowId, "itemName", "");
    updateItem(rowId, "itemCode", "");
    updateItem(rowId, "hsnCode", "");
    updateItem(rowId, "uom", "");
  };

  // Get filtered items for a specific row based on selected category
  const getFilteredItems = (rowId: string): Item[] => {
    const selectedCategory = rowCategories[rowId];
    if (!selectedCategory) return [];
    return items.filter((item) => item.category === selectedCategory);
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
    <form onSubmit={handleSubmit} className="space-y-4 pb-8">
      {/* Basic Info - Compact Grid */}
      <div className="grid grid-cols-7 gap-3">
        {/* PO Selection */}
        <div className="space-y-1.5">
          <Label htmlFor="poId" className="text-xs">
            PO (Optional)
          </Label>
          <Select
            value={formData.poId || undefined}
            onValueChange={handlePOSelect}
            disabled={!!initialData}
          >
            <SelectTrigger id="poId" className="h-9">
              <SelectValue placeholder="Select PO" />
            </SelectTrigger>
            <SelectContent>
              {purchaseOrders
                .filter(
                  (po) =>
                    !formData.supplierId || po.supplierId === formData.supplierId
                )
                .map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.poId}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* GRN Number */}
        <div className="space-y-1.5">
          <Label htmlFor="grnNumber" className="text-xs">
            GRN Number
          </Label>
          <Input
            id="grnNumber"
            value={formData.grnNumber}
            readOnly
            className="h-9 text-sm font-medium bg-muted/50 cursor-not-allowed"
            placeholder="GRN-2024-001"
          />
        </div>

        {/* Invoice Number */}
        <div className="space-y-1.5">
          <Label htmlFor="invoiceNumber" className="text-xs">
            Invoice No. <span className="text-destructive">*</span>
          </Label>
          <Input
            id="invoiceNumber"
            value={formData.invoiceNumber}
            onChange={(e) => handleChange("invoiceNumber", e.target.value)}
            required
            placeholder="Supplier invoice"
            className="h-9 text-sm"
          />
        </div>

        {/* GRN Date */}
        <div className="space-y-1.5">
          <Label htmlFor="grnDate" className="text-xs">
            GRN Date <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-9 w-full justify-start text-left font-normal text-sm ${
                  !formData.grnDate && "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.grnDate
                  ? format(new Date(formData.grnDate), "PPP")
                  : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  formData.grnDate ? new Date(formData.grnDate) : undefined
                }
                onSelect={(date) =>
                  handleChange(
                    "grnDate",
                    date ? format(date, "yyyy-MM-dd") : ""
                  )
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Supplier */}
        <div className="space-y-1.5">
          <Label htmlFor="supplierId" className="text-xs">
            Supplier <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.supplierId}
            onValueChange={handleSupplierSelect}
            disabled={!!formData.poId || !!initialData}
          >
            <SelectTrigger id="supplierId" className="h-9">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {suppliers
                .filter(
                  (s) => !formData.poId || s.id === formData.supplierId
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
            onValueChange={handleWarehouseSelect}
          >
            <SelectTrigger id="warehouseId" className="h-9">
              <SelectValue placeholder="Select" />
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


      </div>

      {/* Addresses */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="billingAddress" className="text-xs font-medium">
            Billing Address <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="billingAddress"
            value={formData.billingAddress}
            onChange={(e) => handleChange("billingAddress", e.target.value)}
            required
            rows={3}
            className="text-sm"
            placeholder="Your company GST registered billing address"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shippingAddress" className="text-xs font-medium">
            Shipping Address <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="shippingAddress"
            value={formData.shippingAddress}
            onChange={(e) => handleChange("shippingAddress", e.target.value)}
            required
            rows={3}
            className="text-sm"
            placeholder="Warehouse address where goods delivered"
          />
        </div>
      </div>

      {/* Shipment Details */}
      <div className="grid grid-cols-7 gap-3">
        <div className="space-y-2">
          <Label htmlFor="shipmentReceivedDate" className="text-xs font-medium">
            Received Date <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-9 w-full justify-start text-left font-normal text-sm ${
                  !formData.shipmentReceivedDate && "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.shipmentReceivedDate
                  ? format(new Date(formData.shipmentReceivedDate), "PPP")
                  : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  formData.shipmentReceivedDate
                    ? new Date(formData.shipmentReceivedDate)
                    : undefined
                }
                onSelect={(date) =>
                  handleChange(
                    "shipmentReceivedDate",
                    date ? format(date, "yyyy-MM-dd") : ""
                  )
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="billDueDate" className="text-xs font-medium">
            Bill Due Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-9 w-full justify-start text-left font-normal text-sm ${
                  !formData.billDueDate && "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.billDueDate
                  ? format(new Date(formData.billDueDate), "PPP")
                  : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  formData.billDueDate
                    ? new Date(formData.billDueDate)
                    : undefined
                }
                onSelect={(date) =>
                  handleChange(
                    "billDueDate",
                    date ? format(date, "yyyy-MM-dd") : ""
                  )
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="deliveryChallanNumber"
            className="text-xs font-medium"
          >
            Challan No.
          </Label>
          <Input
            id="deliveryChallanNumber"
            value={formData.deliveryChallanNumber || ""}
            onChange={(e) =>
              handleChange("deliveryChallanNumber", e.target.value)
            }
            placeholder="Optional"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transporterName" className="text-xs font-medium">
            Transporter
          </Label>
          <Input
            id="transporterName"
            value={formData.transporterName || ""}
            onChange={(e) => handleChange("transporterName", e.target.value)}
            placeholder="Optional"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="eWayBillNumber" className="text-xs font-medium">
            E-Way Bill
          </Label>
          <Input
            id="eWayBillNumber"
            value={formData.eWayBillNumber || ""}
            onChange={(e) => handleChange("eWayBillNumber", e.target.value)}
            placeholder="Optional"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-2 col-span-2">
          <Label htmlFor="invoiceCopy" className="text-xs font-medium">
            Invoice Copy Upload
          </Label>
          <Input
            id="invoiceCopy"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleChange("invoiceCopy", file);
            }}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Remarks */}
      <div className="space-y-2">
        <Label htmlFor="remarks" className="text-xs font-medium">
          Remarks (Optional)
        </Label>
        <Textarea
          id="remarks"
          value={formData.remarks || ""}
          onChange={(e) => handleChange("remarks", e.target.value)}
          placeholder="Additional notes"
          rows={2}
          className="text-sm"
        />
      </div>

      {/* Supplier Details */}
      <div className="border rounded-md p-6 bg-muted/30">
        <div className="text-sm font-semibold mb-4">Supplier Details</div>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactPersonName" className="text-xs font-medium">
              Contact Person
            </Label>
            <Input
              id="contactPersonName"
              value={formData.contactPersonName}
              onChange={(e) =>
                handleChange("contactPersonName", e.target.value)
              }
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
              value={formData.supplierPhone}
              onChange={(e) => handleChange("supplierPhone", e.target.value)}
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
              value={formData.supplierEmail}
              onChange={(e) => handleChange("supplierEmail", e.target.value)}
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
              value={formData.supplierGSTIN}
              onChange={(e) => handleChange("supplierGSTIN", e.target.value)}
              className="h-9 text-sm bg-muted/50"
              readOnly
            />
          </div>

          <div className="space-y-2 col-span-4">
            <Label htmlFor="supplierAddress" className="text-xs font-medium">
              Supplier Address
            </Label>
            <Textarea
              id="supplierAddress"
              value={formData.supplierAddress}
              onChange={(e) => handleChange("supplierAddress", e.target.value)}
              rows={2}
              className="text-sm bg-muted/50"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            disabled={!formData.supplierId}
          >
            <Plus className="size-4 mr-1.5" />
            Add Item
          </Button>
        </div>

        {formData.items.length > 0 ? (
          <div className="border rounded-md overflow-auto max-w-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="h-9 text-xs w-[110px] min-w-[110px]">
                    Category
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[150px] min-w-[150px]">
                    Item Name
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[80px] min-w-[80px]">
                    SKU
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[70px] min-w-[70px]">
                    HSN
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[60px] min-w-[60px]">
                    Qty
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[55px] min-w-[55px]">
                    UOM
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[75px] min-w-[75px]">
                    Batch
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[85px] min-w-[85px]">
                    Expiry
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[85px] min-w-[85px]">
                    Mfg
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[80px] min-w-[80px]">
                    Price
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[180px] min-w-[180px]">
                    GST
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[85px] min-w-[85px]">
                    GST Amt
                  </TableHead>
                  <TableHead className="h-9 text-xs w-[90px] min-w-[90px]">
                    Total
                  </TableHead>
                  <TableHead className="h-9 w-[40px] min-w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.items.map((item) => {
                  const filteredItems = getFilteredItems(item.id);
                  const categoryOptions: SearchableSelectOption[] =
                    categories.map((cat) => ({
                      value: cat,
                      label: cat,
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
                      <TableCell className="p-1.5">
                        <SearchableSelect
                          options={categoryOptions}
                          value={rowCategories[item.id] || ""}
                          onValueChange={(value) =>
                            handleCategorySelect(item.id, value)
                          }
                          placeholder="Select"
                          searchPlaceholder="Search..."
                          className="h-8 text-xs w-full min-w-[110px]"
                        />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <SearchableSelect
                          options={itemOptions}
                          value={item.itemId}
                          onValueChange={(value) =>
                            handleItemSelect(value, item.id)
                          }
                          placeholder={
                            rowCategories[item.id] ? "Select" : "Category first"
                          }
                          searchPlaceholder="Search..."
                          disabled={!rowCategories[item.id]}
                          className="h-8 text-xs w-full min-w-[150px]"
                        />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input
                          value={item.itemCode}
                          readOnly
                          className="h-8 text-xs bg-muted/30 w-full"
                        />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input
                          value={item.hsnCode}
                          readOnly
                          className="h-8 text-xs bg-muted/30 w-full"
                        />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input
                          type="number"
                          value={item.quantityReceived}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "quantityReceived",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          min="0"
                          className="h-8 w-full text-xs"
                          required
                        />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input
                          value={item.uom}
                          readOnly
                          placeholder="-"
                          className="h-8 text-xs bg-muted/30 w-full text-center"
                        />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input
                          value={item.batchNo || ""}
                          onChange={(e) =>
                            updateItem(item.id, "batchNo", e.target.value)
                          }
                          placeholder="-"
                          className="h-8 w-full text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`h-8 w-full justify-start text-left font-normal text-xs px-1.5 ${
                                !item.expiryDate && "text-muted-foreground"
                              }`}
                            >
                              <CalendarIcon className="mr-1 h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {item.expiryDate
                                  ? format(
                                      new Date(item.expiryDate),
                                      "dd/MM/yy"
                                    )
                                  : "-"}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                item.expiryDate
                                  ? new Date(item.expiryDate)
                                  : undefined
                              }
                              onSelect={(date) =>
                                updateItem(
                                  item.id,
                                  "expiryDate",
                                  date ? format(date, "yyyy-MM-dd") : ""
                                )
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`h-8 w-full justify-start text-left font-normal text-xs px-1.5 ${
                                !item.mfgDate && "text-muted-foreground"
                              }`}
                            >
                              <CalendarIcon className="mr-1 h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {item.mfgDate
                                  ? format(new Date(item.mfgDate), "dd/MM/yy")
                                  : "-"}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                item.mfgDate
                                  ? new Date(item.mfgDate)
                                  : undefined
                              }
                              onSelect={(date) =>
                                updateItem(
                                  item.id,
                                  "mfgDate",
                                  date ? format(date, "yyyy-MM-dd") : ""
                                )
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input
                          type="number"
                          value={item.purchasePrice}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "purchasePrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          min="0"
                          step="0.01"
                          className="h-8 w-full text-xs"
                          required
                        />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Select
                          value={item.gstPercentage.toString()}
                          onValueChange={(value) => {
                            const rate = parseFloat(value);
                            const currentGstType = gstType || "cgst_sgst";
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
                                    gstType: currentGstType,
                                    cgstPercentage: currentGstType === "cgst_sgst" ? halfRate : 0,
                                    sgstPercentage: currentGstType === "cgst_sgst" ? halfRate : 0,
                                    igstPercentage: currentGstType === "igst" ? rate : 0,
                                  };

                                  // Recalculate GST amounts (no per-item discount)
                                  const itemTotal =
                                    updated.quantityReceived *
                                    updated.purchasePrice;

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
                                  updated.totalAmount =
                                    itemTotal + updated.totalGstAmount;

                                  return updated;
                                }
                                return i;
                              });
                              return { ...prev, items: newItems };
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
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
                      <TableCell className="p-1.5">
                        <div className="text-xs w-full">
                          <div className="text-muted-foreground font-medium">
                            {currencySymbol}{item.totalGstAmount.toFixed(2)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-1.5 text-xs font-medium">
                        {currencySymbol}{item.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="p-1.5">
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
                {currencySymbol}{formData.subTotal.toFixed(2)}
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
                  onValueChange={(value: "flat" | "percentage") =>
                    handleChange("discountType", value)
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
                    handleChange("discount", parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  step="0.01"
                  className="h-8 w-24 text-xs"
                  placeholder="0.00"
                />
                {formData.discountType === "percentage" &&
                  formData.discount > 0 && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      (- {currencySymbol}
                      {((formData.subTotal * formData.discount) / 100).toFixed(
                        2
                      )}
                      )
                    </span>
                  )}
              </div>
            </div>

            {/* Total Discount Display */}
            {formData.totalDiscount > 0 && (
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground text-xs">
                  Discount Amount:
                </span>
                <span className="text-sm font-semibold text-destructive">
                  - {currencySymbol}{formData.totalDiscount.toFixed(2)}
                </span>
              </div>
            )}

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
                  handleChange("otherCharges", parseFloat(e.target.value) || 0)
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
                htmlFor="roundOff"
                className="text-muted-foreground font-medium whitespace-nowrap"
              >
                Rounding:
              </Label>
              <div className="flex items-center gap-1.5">
                {(() => {
                  // Recalculate from items (fresh calculation)
                  const subTotal = formData.items.reduce(
                    (sum, item) =>
                      sum + item.quantityReceived * item.purchasePrice,
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
                        onClick={() => handleChange("roundOff", roundUpAmount)}
                        className="h-7 px-2 text-xs"
                        title={`Round up to ${currencySymbol}${roundedUp.toFixed(2)}`}
                      >
                        +{roundUpAmount.toFixed(2)}
                      </Button>

                      {/* Manual input field */}
                      <Input
                        id="roundOff"
                        type="number"
                        value={formData.roundOff}
                        onChange={(e) =>
                          handleChange(
                            "roundOff",
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
                          handleChange("roundOff", roundDownAmount)
                        }
                        className="h-7 px-2 text-xs"
                        title={`Round down to ${currencySymbol}${roundedDown.toFixed(2)}`}
                      >
                        {roundDownAmount.toFixed(2)}
                      </Button>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* GST Breakdown */}
            {(formData.totalCGST > 0 ||
              formData.totalSGST > 0 ||
              formData.totalIGST > 0) && (
              <div className="pt-3 mt-3 border-t">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  GST Breakdown:
                </div>
                <div className="space-y-1.5 pl-2">
                  {formData.totalCGST > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">CGST:</span>
                      <span>{currencySymbol}{formData.totalCGST.toFixed(2)}</span>
                    </div>
                  )}
                  {formData.totalSGST > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">SGST:</span>
                      <span>{currencySymbol}{formData.totalSGST.toFixed(2)}</span>
                    </div>
                  )}
                  {formData.totalIGST > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">IGST:</span>
                      <span>{currencySymbol}{formData.totalIGST.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Total Tax Amount */}
            <div className="flex justify-between items-center py-2 mt-2 border-t">
              <span className="text-muted-foreground font-medium">
                Total Tax Amount:
              </span>
              <span className="font-semibold">
                {currencySymbol}{formData.totalGST.toFixed(2)}
              </span>
            </div>

            {/* Round Off Display */}
            {(formData.otherCharges !== 0 || formData.roundOff !== 0) && (
              <div className="space-y-2 py-2 border-t">
                {formData.otherCharges !== 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Other Charges:
                    </span>
                    <span className="font-medium">
                      {currencySymbol}{formData.otherCharges.toFixed(2)}
                    </span>
                  </div>
                )}
                {formData.roundOff !== 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Rounding Adjustment:
                    </span>
                    <span className="font-medium">
                      {formData.roundOff >= 0 ? "+" : ""}{currencySymbol}
                      {formData.roundOff.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Grand Total */}
            <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-primary/20">
              <span className="text-lg font-bold">Grand Total:</span>
              <span className="text-xl font-bold text-primary">
                {currencySymbol}{formData.grandTotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="border rounded-md p-6 bg-muted/30">
        <div className="text-sm font-semibold mb-4">Payment Details</div>
        <div className="grid grid-cols-4 gap-4">
          {/* Payment Status */}
          <div className="space-y-2">
            <Label htmlFor="paymentStatus" className="text-xs font-medium">
              Payment Status <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.paymentStatus}
              onValueChange={(value: "paid" | "unpaid") =>
                handleChange("paymentStatus", value)
              }
            >
              <SelectTrigger id="paymentStatus" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          {formData.paymentStatus === "paid" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod" className="text-xs font-medium">
                  Payment Method
                </Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) =>
                    handleChange("paymentMethod", value)
                  }
                >
                  <SelectTrigger id="paymentMethod" className="h-9">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="referenceNumber"
                  className="text-xs font-medium"
                >
                  Reference Number / UTR
                </Label>
                <Input
                  id="referenceNumber"
                  value={formData.referenceNumber || ""}
                  onChange={(e) =>
                    handleChange("referenceNumber", e.target.value)
                  }
                  placeholder="Transaction reference"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate" className="text-xs font-medium">
                  Payment Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`h-9 w-full justify-start text-left font-normal text-sm ${
                        !formData.paymentDate && "text-muted-foreground"
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.paymentDate
                        ? format(new Date(formData.paymentDate), "PPP")
                        : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        formData.paymentDate
                          ? new Date(formData.paymentDate)
                          : undefined
                      }
                      onSelect={(date) =>
                        handleChange(
                          "paymentDate",
                          date ? format(date, "yyyy-MM-dd") : ""
                        )
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Form Actions */}
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
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting
            ? "Saving..."
            : initialData
            ? "Update Bill"
            : "Create Bill & Update Stock"}
        </Button>
      </div>
    </form>
  );
}
