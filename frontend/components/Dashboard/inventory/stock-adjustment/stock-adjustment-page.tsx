"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import axiosInstance from "@/lib/axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  itemName: string;
  itemCode?: string;
  category: string;
  uom: string;
  quantity: number;
  warehouseId: string;
  warehouse?: {
    id: string;
    name: string;
  };
  status: string;
  lowStockAlertLevel: number;
}

interface AdjustmentItem {
  id: string;
  productId: string;
  itemName: string;
  itemCode: string;
  category: string;
  uom: string;
  currentStock: number;
  adjustment: number;
  reason: string;
  notes: string;
}

const reasons = [
  { value: "damage", label: "Damaged Goods" },
  { value: "loss", label: "Lost / Stolen" },
  { value: "return", label: "Customer Return" },
  { value: "found", label: "Found / Recovered" },
  { value: "correction", label: "Inventory Correction" },
  { value: "other", label: "Other" },
];

export default function StockAdjustmentPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [adjustedBy, setAdjustedBy] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const productsRes = await axiosInstance.get("/api/inventory/items");

        if (productsRes.data.success) {
          setProducts(productsRes.data.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const categories = Array.from(new Set(products.map((p) => p.category)));
  const filteredProducts = products.filter(
    (p) => selectedCategory === "all" || p.category === selectedCategory
  );

  const addItem = (product: Product) => {
    if (items.find((i) => i.productId === product.id)) {
      toast.info(`${product.itemName} is already added`);
      return;
    }

    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(2, 11),
        productId: product.id,
        itemName: product.itemName,
        itemCode: product.itemCode || "",
        category: product.category,
        uom: product.uom,
        currentStock: product.quantity,
        adjustment: 0,
        reason: "",
        notes: "",
      },
    ]);
    toast.success(`${product.itemName} added`);
    // Don't close the popover - allow multiple selections
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof AdjustmentItem, value: unknown) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const validateForm = (): boolean => {
    if (items.length === 0) {
      toast.error("Please add at least one item to adjust");
      return false;
    }

    if (!adjustedBy.trim()) {
      toast.error("Please enter who is making the adjustment");
      return false;
    }

    for (const item of items) {
      if (!item.reason) {
        toast.error(`Please select a reason for ${item.itemName}`);
        return false;
      }

      const newStock = item.currentStock + item.adjustment;
      if (newStock < 0) {
        toast.error(`Adjustment for ${item.itemName} would result in negative stock`);
        return false;
      }

      if (item.adjustment === 0) {
        toast.error(`Please enter an adjustment for ${item.itemName}`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    let successCount = 0;
    const failedItems: string[] = [];

    try {
      // Submit adjustments sequentially to avoid race conditions
      for (const item of items) {
        try {
          await axiosInstance.post("/api/inventory/stock-adjustments", {
            itemId: item.productId,
            adjustmentType: item.adjustment > 0 ? "increase" : "decrease",
            quantity: Math.abs(item.adjustment),
            reason: item.reason,
            reasonDetails: item.notes || undefined,
            adjustedBy: adjustedBy,
            notes: item.notes || undefined,
          });
          successCount++;
        } catch (error: unknown) {
          console.error(`Error adjusting ${item.itemName}:`, error);
          failedItems.push(item.itemName);
        }
      }

      if (successCount === items.length) {
        toast.success(`Successfully adjusted ${successCount} item(s)`);
        router.push("/dashboard/inventory-management/stock-adjustment");
      } else if (successCount > 0) {
        toast.warning(`Adjusted ${successCount} of ${items.length} items. Failed: ${failedItems.join(", ")}`);
        // Refresh the page to show updated stock levels
        window.location.reload();
      } else {
        toast.error("Failed to adjust any items");
      }
    } catch (error: unknown) {
      console.error("Error submitting adjustments:", error);
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to submit adjustments");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Stock Adjustment</h1>
          <p className="text-muted-foreground">Adjust inventory levels with detailed tracking</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adjustment Details</CardTitle>
          <CardDescription className="leading-relaxed">
            Add items to adjust inventory levels. Each item can have a separate reason.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={adjustmentDate}
                onChange={(e) => setAdjustmentDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                Adjusted By <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Your name"
                value={adjustedBy}
                onChange={(e) => setAdjustedBy(e.target.value)}
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Items to Adjust</label>
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-[250px] justify-between"
                      disabled={filteredProducts.length === 0}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {items.length > 0 ? `${items.length} Selected` : "Add Products"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                          <div className="px-2 py-1.5 text-xs text-muted-foreground border-b">
                            Click items to add. Popover stays open for multiple selections.
                          </div>
                          {filteredProducts.map((product) => {
                            const isAdded = items.some((i) => i.productId === product.id);
                            return (
                              <CommandItem
                                key={product.id}
                                value={product.itemName}
                                onSelect={() => addItem(product)}
                                className={cn(
                                  "cursor-pointer",
                                  isAdded && "opacity-50 bg-accent"
                                )}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    isAdded ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col flex-1">
                                  <span className={cn(isAdded && "line-through")}>
                                    {product.itemName}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Code: {product.itemCode || "N/A"}</span>
                                    <span>•</span>
                                    <span>Stock: {product.quantity}</span>
                                  </div>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                    <div className="border-t p-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOpen(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Items Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Product</TableHead>
                    <TableHead className="w-[120px] text-center">Current</TableHead>
                    <TableHead className="w-[180px] text-center">Adjust</TableHead>
                    <TableHead className="w-[120px] text-center">New Total</TableHead>
                    <TableHead className="w-[200px]">Reason</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No items added. Click &quot;Add Product&quot; to start.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const newStock = item.currentStock + item.adjustment;
                      const isIncrease = item.adjustment > 0;
                      const isDecrease = item.adjustment < 0;
                      
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{item.itemName}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{item.itemCode || "N/A"}</span>
                                <span>•</span>
                                <span>{item.category}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-xl font-semibold">{item.currentStock}</span>
                              <span className="text-xs text-muted-foreground">{item.uom}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 w-9 p-0"
                                onClick={() => updateItem(item.id, "adjustment", item.adjustment - 1)}
                              >
                                −
                              </Button>
                              <Input
                                type="number"
                                className={cn(
                                  "w-20 h-9 text-center font-semibold",
                                  isIncrease && "border-green-500 bg-green-50 text-green-700",
                                  isDecrease && "border-red-500 bg-red-50 text-red-700"
                                )}
                                value={item.adjustment}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  updateItem(item.id, "adjustment", val);
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 w-9 p-0"
                                onClick={() => updateItem(item.id, "adjustment", item.adjustment + 1)}
                              >
                                +
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className={cn(
                                "text-xl font-semibold",
                                newStock < 0 && "text-red-600",
                                newStock === 0 && "text-orange-600",
                                newStock > 0 && "text-green-600"
                              )}>
                                {newStock}
                              </span>
                              {item.adjustment !== 0 && (
                                <span className={cn(
                                  "text-xs font-medium",
                                  isIncrease && "text-green-600",
                                  isDecrease && "text-red-600"
                                )}>
                                  {isIncrease ? `+${item.adjustment}` : item.adjustment}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.reason}
                              onValueChange={(val) => updateItem(item.id, "reason", val)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select reason" />
                              </SelectTrigger>
                              <SelectContent>
                                {reasons.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Optional notes..."
                              className="h-8"
                              value={item.notes}
                              onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t px-6 py-4">
          <Button variant="ghost" onClick={() => setItems([])}>
            Clear All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={items.length === 0 || isSubmitting}>
              {isSubmitting ? "Submitting..." : `Confirm Adjustment (${items.length})`}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
