"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Package, Search, Loader2, ImageIcon, MoreVertical, Edit, Trash2, Lock } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";
import Image from "next/image";
import { useCurrency } from "@/hooks/useCurrency";
import AddItemModal, { ItemFormData } from "../../items/add-item-modal";
import { useRouter, useSearchParams } from "next/navigation";

interface Item {
  id: string;
  itemName: string;
  category: string;
  itemCode: string | null;
  uom: string;
  purchasePrice: number;
  gstRateId: string | null;
  gstPercentage: number;
  hsnCode: string | null;
  openingStock: number;
  quantity: number;
  lowStockAlertLevel: number;
  status: string;
  expiryDate: string | null;
  description: string | null;
  itemImage: string | null;
  createdAt: string;
  updatedAt: string;
  warehouseId: string;
  isUsedInPOS?: boolean;
  isUsedInOnline?: boolean;
}

interface WarehouseViewListItemsProps {
  warehouseId: string;
}

export default function WarehouseViewListItems({
  warehouseId,
}: WarehouseViewListItemsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Data state
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter and search states - initialize from URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "all");
  const [stockFilter, setStockFilter] = useState(searchParams.get("stock") || "all");

  // Pagination state - initialize from URL params
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [itemsPerPage, setItemsPerPage] = useState(parseInt(searchParams.get("limit") || "5"));

  // Edit/Delete state
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currencySymbol = useCurrency();

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (stockFilter !== "all") params.set("stock", stockFilter);
    if (currentPage !== 1) params.set("page", currentPage.toString());
    if (itemsPerPage !== 5) params.set("limit", itemsPerPage.toString());
    
    const newUrl = params.toString() 
      ? `?${params.toString()}` 
      : window.location.pathname;
    
    router.replace(newUrl, { scroll: false });
  }, [searchTerm, categoryFilter, stockFilter, currentPage, itemsPerPage, router]);

  // Fetch items for this warehouse
  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(
        `/api/inventory/items?warehouse=${warehouseId}`
      );
      if (response.data.success) {
        const itemsData = response.data.data;
        
        // Check usage in POS and Online products using bulk API
        const itemIds = itemsData.map((item: Item) => item.id);
        const usageMap = await checkBulkItemUsage(itemIds);
        
        // Merge usage data with items
        const itemsWithUsage = itemsData.map((item: Item) => ({
          ...item,
          isUsedInPOS: usageMap[item.id]?.isUsedInPOS || false,
          isUsedInOnline: usageMap[item.id]?.isUsedInOnline || false,
        }));
        
        setItems(itemsWithUsage);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to fetch items");
    } finally {
      setIsLoading(false);
    }
  };

  // Check bulk item usage using optimized API
  const checkBulkItemUsage = async (itemIds: string[]): Promise<Record<string, { isUsedInPOS: boolean; isUsedInOnline: boolean }>> => {
    // Return empty object if no items
    if (!itemIds || itemIds.length === 0) {
      return {};
    }

    try {
      const response = await axiosInstance.post("/api/inventory/items/usage/bulk", {
        itemIds,
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      return {};
    } catch (error) {
      console.error("Error checking bulk item usage:", error);
      // Return empty object on error so items can still be displayed
      return {};
    }
  };

  // Handle edit item
  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  // Handle update item
  const handleUpdateItem = async (itemData: ItemFormData) => {
    if (!editingItem) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      formData.append("itemName", itemData.itemName);
      formData.append("category", itemData.category);
      formData.append("itemCode", itemData.itemCode || "");
      formData.append("uom", itemData.uom);
      formData.append("purchasePrice", itemData.purchasePrice);
      formData.append("gstRateId", itemData.gstRateId);
      formData.append("gstPercentage", itemData.gstPercentage);
      formData.append("hsnCode", itemData.hsnCode || "");
      formData.append("warehouse", itemData.warehouse);
      formData.append("openingStock", itemData.openingStock);
      formData.append("lowStockAlertLevel", itemData.lowStockAlertLevel);
      formData.append("status", itemData.status);
      formData.append("description", itemData.description || "");
      
      if (itemData.expiryDate) {
        formData.append("expiryDate", itemData.expiryDate.toISOString());
      }
      
      // Only append image if it's a File object (new upload)
      // If it's a string (existing URL), backend will keep the existing image
      if (itemData.itemImage && itemData.itemImage instanceof File) {
        formData.append("itemImage", itemData.itemImage);
      }

      const response = await axiosInstance.put(
        `/api/inventory/items/${editingItem.id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        toast.success("Item updated successfully!");
        setIsEditModalOpen(false);
        setEditingItem(null);
        fetchItems(); // Refresh the list
      }
    } catch (error) {
      console.error("Error updating item:", error);
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to update item");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete item
  const handleDeleteItem = (item: Item) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deletingItem) return;

    setIsDeleting(true);
    try {
      const response = await axiosInstance.delete(
        `/api/inventory/items/${deletingItem.id}`
      );

      if (response.data.success) {
        toast.success("Item deleted successfully!");
        setIsDeleteDialogOpen(false);
        setDeletingItem(null);
        fetchItems(); // Refresh the list
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    return [...new Set(items.map((item) => item.category))];
  }, [items]);

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Determine stock status
      const stockStatus =
        item.quantity === 0
          ? "out of stock"
          : item.quantity <= item.lowStockAlertLevel
          ? "low stock"
          : "in stock";

      // Search filter - includes name, SKU, category, HSN code, and stock status
      const matchesSearch =
        searchTerm === "" ||
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.itemCode &&
          item.itemCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.hsnCode &&
          item.hsnCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        stockStatus.includes(searchTerm.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category filter
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      // Stock filter
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "out" && item.quantity === 0) ||
        (stockFilter === "low" &&
          item.quantity > 0 &&
          item.quantity <= item.lowStockAlertLevel) ||
        (stockFilter === "in-stock" && item.quantity > item.lowStockAlertLevel);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [items, searchTerm, categoryFilter, stockFilter]);

  // Calculate stats
  const inStockCount = filteredItems.filter(
    (item) => item.quantity > item.lowStockAlertLevel
  ).length;
  const lowStockCount = filteredItems.filter(
    (item) => item.quantity > 0 && item.quantity <= item.lowStockAlertLevel
  ).length;
  const outOfStockCount = filteredItems.filter(
    (item) => item.quantity === 0
  ).length;

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, stockFilter, itemsPerPage]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, endIndex);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis-start");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis-end");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStockFilter("all");
  };

  // Calculate total inventory value
  const totalInventoryValue = useMemo(() => {
    return filteredItems.reduce((sum, item) => {
      const priceWithGst =
        item.purchasePrice + (item.purchasePrice * item.gstPercentage) / 100;
      return sum + priceWithGst * item.quantity;
    }, 0);
  }, [filteredItems]);

  const totalItems = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [filteredItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-muted-foreground">Loading items...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
            Total Items
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {filteredItems.length}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {totalItems} units in stock
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="text-sm text-green-600 dark:text-green-400 mb-1">
            In Stock
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {inStockCount}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            {((inStockCount / filteredItems.length) * 100 || 0).toFixed(1)}% of
            items
          </div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">
            Low Stock
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            {lowStockCount}
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            Needs attention
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">
            Total Value
          </div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {currencySymbol}
            {totalInventoryValue.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            Including GST
          </div>
        </div>
      </div>

      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="size-5" />
          <h2 className="text-lg font-semibold">Inventory Items</h2>
          <Badge variant="secondary">{filteredItems.length} Items</Badge>
        </div>
        {outOfStockCount > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="size-4 text-red-600" />
            <span className="text-red-600 font-semibold">
              {outOfStockCount} item{outOfStockCount > 1 ? "s" : ""} out of
              stock
            </span>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, category, HSN code, stock status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stock Level Filter */}
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Stock Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          {(searchTerm ||
            categoryFilter !== "all" ||
            stockFilter !== "all") && (
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="border rounded-lg w-full">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Image</TableHead>
                <TableHead className="w-[100px]">SKU</TableHead>
                <TableHead className="w-[200px]">Item Name</TableHead>
                <TableHead className="w-[120px]">Category</TableHead>
                <TableHead className="w-[70px]">UOM</TableHead>
                <TableHead className="text-right w-[110px]">Purchase Price</TableHead>
                <TableHead className="text-center w-[70px]">GST %</TableHead>
                <TableHead className="text-right w-[110px]">Price + GST</TableHead>
                <TableHead className="w-[100px]">HSN Code</TableHead>
                <TableHead className="text-right w-[100px]">Opening Stock</TableHead>
                <TableHead className="text-right w-[90px]">Current Qty</TableHead>
                <TableHead className="text-right w-[100px]">Low Stock Alert</TableHead>
                <TableHead className="w-[110px]">Expiry Date</TableHead>
                <TableHead className="w-[130px]">Status</TableHead>
                <TableHead className="w-[80px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {currentItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm ||
                    categoryFilter !== "all" ||
                    stockFilter !== "all"
                      ? "No items found matching your filters."
                      : "No inventory items found in this warehouse"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              currentItems.map((item) => {
                const priceWithGst =
                  item.purchasePrice +
                  (item.purchasePrice * item.gstPercentage) / 100;
                const formatPrice = (price: number) => {
                  return price % 1 === 0 ? price.toString() : price.toFixed(2);
                };
                const formatGst = (gst: number) => {
                  return gst % 1 === 0 ? gst.toString() : gst.toFixed(2);
                };
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="w-12 h-12 relative bg-muted rounded-md overflow-hidden flex items-center justify-center">
                        {item.itemImage ? (
                          <Image
                            src={item.itemImage}
                            alt={item.itemName}
                            fill
                            className="object-cover"
                            sizes="48px"
                            onError={(e) => {
                              console.error(
                                "Failed to load image for item:",
                                item.itemName,
                                "URL:",
                                item.itemImage
                              );
                              // Hide the broken image and show fallback icon
                              const target =
                                e.currentTarget as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector("svg")) {
                                const icon = document.createElementNS(
                                  "http://www.w3.org/2000/svg",
                                  "svg"
                                );
                                icon.setAttribute(
                                  "class",
                                  "size-5 text-muted-foreground"
                                );
                                icon.setAttribute("fill", "none");
                                icon.setAttribute("stroke", "currentColor");
                                icon.setAttribute("viewBox", "0 0 24 24");
                                icon.innerHTML =
                                  '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />';
                                parent.appendChild(icon);
                              }
                            }}
                            unoptimized
                          />
                        ) : (
                          <ImageIcon className="size-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      {item.itemCode || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="w-[200px]">
                        <div className="font-medium truncate">{item.itemName}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-1 overflow-hidden text-ellipsis">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{item.uom}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium">
                        {currencySymbol}
                        {formatPrice(item.purchasePrice)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-normal">
                        {formatGst(item.gstPercentage)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-green-700">
                        {currencySymbol}
                        {formatPrice(priceWithGst)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.hsnCode || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-muted-foreground">
                        {item.openingStock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          item.quantity === 0
                            ? "text-red-600 font-bold text-base"
                            : item.quantity <= item.lowStockAlertLevel
                            ? "text-orange-600 font-bold text-base"
                            : "font-semibold text-base"
                        }
                      >
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-muted-foreground">
                        {item.lowStockAlertLevel}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.expiryDate ? (
                        <span className="text-sm whitespace-nowrap">
                          {new Date(item.expiryDate).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.quantity === 0 ? (
                        <Badge
                          variant="destructive"
                          className="bg-red-600 whitespace-nowrap"
                        >
                          <AlertCircle className="size-3 mr-1" />
                          Out of Stock
                        </Badge>
                      ) : item.quantity <= item.lowStockAlertLevel ? (
                        <Badge
                          variant="secondary"
                          className="bg-orange-100 text-orange-700 whitespace-nowrap"
                        >
                          <AlertCircle className="size-3 mr-1" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge
                          variant="default"
                          className="bg-green-600 whitespace-nowrap"
                        >
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <DropdownMenuItem
                                    onClick={() => handleEditItem(item)}
                                    disabled={item.isUsedInPOS || item.isUsedInOnline}
                                    className="cursor-pointer"
                                  >
                                    {item.isUsedInPOS || item.isUsedInOnline ? (
                                      <>
                                        <Lock className="mr-2 h-4 w-4" />
                                        Edit (In Use)
                                      </>
                                    ) : (
                                      <>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </div>
                              </TooltipTrigger>
                              {(item.isUsedInPOS || item.isUsedInOnline) && (
                                <TooltipContent side="left" className="max-w-xs">
                                  <p className="font-semibold mb-1">Cannot edit this item</p>
                                  <p className="text-xs">
                                    This item is currently used in:
                                  </p>
                                  <ul className="text-xs mt-1 list-disc list-inside">
                                    {item.isUsedInPOS && <li>POS Products</li>}
                                    {item.isUsedInOnline && <li>Online Products</li>}
                                  </ul>
                                  <p className="text-xs mt-2 text-muted-foreground">
                                    Remove it from all products first to enable editing.
                                  </p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteItem(item)}
                                    disabled={item.isUsedInPOS || item.isUsedInOnline}
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                  >
                                    {item.isUsedInPOS || item.isUsedInOnline ? (
                                      <>
                                        <Lock className="mr-2 h-4 w-4" />
                                        Delete (In Use)
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </div>
                              </TooltipTrigger>
                              {(item.isUsedInPOS || item.isUsedInOnline) && (
                                <TooltipContent side="left" className="max-w-xs">
                                  <p className="font-semibold mb-1">Cannot delete this item</p>
                                  <p className="text-xs">
                                    This item is currently used in:
                                  </p>
                                  <ul className="text-xs mt-1 list-disc list-inside">
                                    {item.isUsedInPOS && <li>POS Products</li>}
                                    {item.isUsedInOnline && <li>Online Products</li>}
                                  </ul>
                                  <p className="text-xs mt-2 text-muted-foreground">
                                    Remove it from all products first to enable deletion.
                                  </p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {filteredItems.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredItems.length === 0 ? 0 : startIndex + 1}-{endIndex}{" "}
            of {filteredItems.length} results
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => setItemsPerPage(Number(value))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 / page</SelectItem>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => {
                      if (currentPage > 1) {
                        handlePageChange(currentPage - 1);
                      }
                    }}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {getPageNumbers().map((page, index) => (
                  <PaginationItem key={`${page}-${index}`}>
                    {typeof page === "number" ? (
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    ) : (
                      <PaginationEllipsis />
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => {
                      if (currentPage < totalPages) {
                        handlePageChange(currentPage + 1);
                      }
                    }}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
      
      {/* Edit Item Modal */}
      {editingItem && (
        <AddItemModal
          open={isEditModalOpen}
          onOpenChange={(open) => {
            setIsEditModalOpen(open);
            if (!open) setEditingItem(null);
          }}
          onSubmit={handleUpdateItem}
          isSubmitting={isSubmitting}
          editMode={true}
          initialData={{
            id: editingItem.id,
            itemName: editingItem.itemName,
            category: editingItem.category,
            itemCode: editingItem.itemCode || "",
            originalSKU: editingItem.itemCode || "",
            uom: editingItem.uom,
            purchasePrice: editingItem.purchasePrice.toString(),
            gstRateId: editingItem.gstRateId || "",
            gstPercentage: editingItem.gstPercentage.toString(),
            hsnCode: editingItem.hsnCode || "",
            warehouse: editingItem.warehouseId,
            openingStock: editingItem.openingStock.toString(),
            lowStockAlertLevel: editingItem.lowStockAlertLevel.toString(),
            status: editingItem.status,
            expiryDate: editingItem.expiryDate ? new Date(editingItem.expiryDate) : undefined,
            description: editingItem.description || "",
            itemImage: editingItem.itemImage || null,
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong className="text-foreground">{deletingItem?.itemName}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This will permanently remove this item from your inventory. This action cannot be undone.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
