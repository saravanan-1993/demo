"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import axiosInstance from "@/lib/axios";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

interface StockAdjustment {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  warehouseId: string;
  warehouseName: string;
  adjustmentMethod: string; // "adjustment", "purchase_order", "sales_order"
  adjustmentType: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  reasonDetails?: string;
  adjustedBy: string;
  notes?: string;
  // Purchase order fields
  grnNumber?: string;
  supplierName?: string;
  batchNumber?: string;
  // Sales order fields
  soNumber?: string;
  customerName?: string;
  createdAt: string;
  updatedAt: string;
}

export default function StockAdjustment() {
  const router = useRouter();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [filteredAdjustments, setFilteredAdjustments] = useState<
    StockAdjustment[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchAdjustments = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(
        "/api/inventory/stock-adjustments"
      );

      if (response.data.success) {
        setAdjustments(response.data.data);
        setFilteredAdjustments(response.data.data);
      }
    } catch (error) {
      toast.error("Failed to fetch stock adjustments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  // Filter adjustments based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredAdjustments(adjustments);
      setCurrentPage(1); // Reset to first page when clearing search
      return;
    }

    const filtered = adjustments.filter(
      (adj) =>
        adj.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adj.warehouseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adj.adjustedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adj.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adj.grnNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adj.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adj.soNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adj.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAdjustments(filtered);
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchTerm, adjustments]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAdjustments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAdjustments = filteredAdjustments.slice(startIndex, endIndex);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max
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

  const getMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      adjustment: "Manual Adjustment",
      purchase_order: "Purchase Order",
      sales_order: "Sales Order",
    };
    return methods[method] || method;
  };

  const getReasonLabel = (reason: string) => {
    const reasons: Record<string, string> = {
      damage: "Damage",
      loss: "Loss/Theft",
      return: "Customer Return",
      found: "Found/Recovered",
      correction: "Inventory Correction",
      expired: "Expired",
      other: "Other",
    };
    return reasons[reason] || reason;
  };

  return (
    <div className="space-y-6">
      {/* Header */}


       <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
           <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search adjustments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
          onClick={() =>
            router.push(
              "/dashboard/inventory-management/stock-adjustment/adjustment"
            )
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          New Adjustment
        </Button>
        </div>
      </div>



      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Date</TableHead>
              <TableHead className="min-w-[180px]">Item</TableHead>
              <TableHead className="min-w-[140px]">Warehouse</TableHead>
              <TableHead className="min-w-[140px]">Method</TableHead>
              <TableHead className="min-w-[100px]">Type</TableHead>
              <TableHead className="min-w-[80px]">Quantity</TableHead>
              <TableHead className="min-w-[120px]">Stock Change</TableHead>
              <TableHead className="min-w-[150px]">Source/Reason</TableHead>
              <TableHead className="min-w-[120px]">Adjusted By</TableHead>
              <TableHead className="min-w-[200px]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : currentAdjustments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  {searchTerm
                    ? "No adjustments found"
                    : "No stock adjustments yet"}
                </TableCell>
              </TableRow>
            ) : (
              currentAdjustments.map((adjustment) => (
                <TableRow key={adjustment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{format(new Date(adjustment.createdAt), "MMM dd, yyyy")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{adjustment.itemName}</span>
                      <span className="text-xs text-muted-foreground">
                        {adjustment.category}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{adjustment.warehouseName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        adjustment.adjustmentMethod === "adjustment"
                          ? "secondary"
                          : "default"
                      }
                      className={
                        adjustment.adjustmentMethod === "purchase_order"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                          : adjustment.adjustmentMethod === "sales_order"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
                          : ""
                      }
                    >
                      {getMethodLabel(adjustment.adjustmentMethod)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {adjustment.adjustmentType === "increase" ? (
                      <Badge
                        variant="default"
                        className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      >
                        <TrendingUp className="h-3 w-3" />
                        Increase
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <TrendingDown className="h-3 w-3" />
                        Decrease
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className={adjustment.adjustmentType === "increase" ? "text-green-600" : "text-red-600"}>
                      {adjustment.adjustmentType === "increase" ? "+" : "-"}
                      {adjustment.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {adjustment.previousQuantity}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">
                        {adjustment.newQuantity}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {adjustment.adjustmentMethod === "purchase_order" ? (
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">
                          {adjustment.grnNumber || "GRN"}
                        </Badge>
                        {adjustment.supplierName && (
                          <span className="text-xs text-muted-foreground">
                            {adjustment.supplierName}
                          </span>
                        )}
                      </div>
                    ) : adjustment.adjustmentMethod === "sales_order" ? (
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">
                          {adjustment.soNumber || "SO"}
                        </Badge>
                        {adjustment.customerName && (
                          <span className="text-xs text-muted-foreground">
                            {adjustment.customerName}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline">
                        {adjustment.reason
                          ? getReasonLabel(adjustment.reason)
                          : "N/A"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{adjustment.adjustedBy}</TableCell>
                  <TableCell>
                    {adjustment.notes ? (
                      <div className="max-w-[200px]">
                        <span className="text-sm text-muted-foreground line-clamp-2" title={adjustment.notes}>
                          {adjustment.notes}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        No notes
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredAdjustments.length)} of{" "}
            {filteredAdjustments.length} adjustments
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {getPageNumbers().map((page, index) => (
                <PaginationItem key={index}>
                  {page === "ellipsis-start" || page === "ellipsis-end" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(page as number)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
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
      )}
    </div>
  );
}
