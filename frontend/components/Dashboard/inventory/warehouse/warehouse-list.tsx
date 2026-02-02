"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Edit, Power, Search, Plus, Loader2, Eye } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import AddWarehouse from "./add-warehouse";
import DeleteModal from "./delete-modal";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";

// Warehouse type definition
type Warehouse = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  status: string;
  manager: string;
  phone: string;
};

export default function Warehouse() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isClosingRef = useRef(false);

  // Fetch warehouses on mount
  useEffect(() => {
    fetchWarehouses();
  }, []);

  // Check URL params - only when dialog is not already open and not intentionally closing
  useEffect(() => {
    const warehouseId = searchParams.get("id");
    if (warehouseId && !isClosingRef.current && warehouses.length > 0) {
      const warehouse = warehouses.find((w) => w.id === warehouseId);
      if (warehouse && (!editingWarehouse || editingWarehouse.id !== warehouse.id)) {
        setEditingWarehouse(warehouse);
        setIsAddDialogOpen(true);
      }
    }
  }, [searchParams, warehouses]);

  const fetchWarehouses = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/api/inventory/warehouses");
      if (response.data.success) {
        setWarehouses(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to fetch warehouses");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWarehouses = warehouses.filter(
    (warehouse) =>
      warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      warehouse.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      warehouse.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredWarehouses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentWarehouses = filteredWarehouses.slice(startIndex, endIndex);

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis-start");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("ellipsis-end");
      pages.push(totalPages);
    }
    return pages;
  };

  const handleStatusToggle = (warehouse: Warehouse) => {
    setDeletingWarehouse(warehouse);
    setIsDeleteModalOpen(true);
  };

  const handleStatusConfirm = async () => {
    if (!deletingWarehouse) return;

    try {
      setIsDeleting(true);
      const newStatus = deletingWarehouse.status === "active" ? "inactive" : "active";
      
      const response = await axiosInstance.put(
        `/api/inventory/warehouses/${deletingWarehouse.id}`,
        {
          ...deletingWarehouse,
          status: newStatus,
        }
      );
      
      if (response.data.success) {
        toast.success(`Warehouse ${newStatus === "active" ? "activated" : "deactivated"} successfully`);
        setIsDeleteModalOpen(false);
        setDeletingWarehouse(null);
        fetchWarehouses();
      }
    } catch (error) {
      console.error("Error updating warehouse status:", error);
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to update warehouse status");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setIsAddDialogOpen(true);
    // Update URL with warehouse ID
    router.push(`/dashboard/inventory-management/warehouse?id=${warehouse.id}`);
  };

  const handleAddWarehouse = async (warehouseData: Omit<Warehouse, 'id'>) => {
    try {
      setIsSubmitting(true);
      
      if (editingWarehouse) {
        // Update existing warehouse
        const response = await axiosInstance.put(
          `/api/inventory/warehouses/${editingWarehouse.id}`,
          warehouseData
        );
        if (response.data.success) {
          // Mark that we're intentionally closing
          isClosingRef.current = true;
          
          // Close modal and clear state
          setIsAddDialogOpen(false);
          setEditingWarehouse(null);
          
          // Show success message
          toast.success("Warehouse updated successfully");
          
          // Clear URL params
          router.push("/dashboard/inventory-management/warehouse");
          
          // Fetch updated data
          await fetchWarehouses();
          
          // Reset closing flag after a delay
          setTimeout(() => {
            isClosingRef.current = false;
          }, 500);
        }
      } else {
        // Add new warehouse
        const response = await axiosInstance.post(
          "/api/inventory/warehouses",
          warehouseData
        );
        if (response.data.success) {
          // Mark that we're intentionally closing
          isClosingRef.current = true;
          
          // Close modal and clear state
          setIsAddDialogOpen(false);
          setEditingWarehouse(null);
          
          // Show success message
          toast.success("Warehouse created successfully");
          
          // Clear URL params
          router.push("/dashboard/inventory-management/warehouse");
          
          // Fetch updated data
          await fetchWarehouses();
          
          // Reset closing flag after a delay
          setTimeout(() => {
            isClosingRef.current = false;
          }, 500);
        }
      }
    } catch (error) {
      console.error("Error saving warehouse:", error);
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to save warehouse");
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search warehouses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={() => {
              setEditingWarehouse(null);
              setIsAddDialogOpen(true);
              // Clear URL params when adding new
              router.push("/dashboard/inventory-management/warehouse");
            }}
            disabled={warehouses.length >= 1}
          >
            <Plus className="size-4" />
            Add Warehouse
          </Button>
          {warehouses.length >= 1 && (
            <p className="text-xs text-muted-foreground">
              Multiple warehouses coming soon
            </p>
          )}
        </div>
      </div>

      {/* Warehouse Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Warehouse Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <p className="text-muted-foreground">Loading warehouses...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredWarehouses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">No warehouses found</p>
                </TableCell>
              </TableRow>
            ) : (
              currentWarehouses.map((warehouse) => {
                return (
                  <TableRow key={warehouse.id}>
                    <TableCell className="font-medium">
                      {warehouse.name}
                    </TableCell>
                    <TableCell>
                      {warehouse.city}, {warehouse.state}
                    </TableCell>
                    <TableCell>{warehouse.manager}</TableCell>
                    <TableCell>{warehouse.phone}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          warehouse.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {warehouse.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => router.push(`/dashboard/inventory-management/warehouse/${warehouse.id}`)}
                          title="View warehouse details"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEdit(warehouse)}
                          title="Edit warehouse"
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleStatusToggle(warehouse)}
                          title={warehouse.status === "active" ? "Deactivate warehouse" : "Activate warehouse"}
                        >
                          <Power className={`size-4 ${warehouse.status === "active" ? "text-destructive" : "text-green-600"}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredWarehouses.length)} of{" "}
            {filteredWarehouses.length} warehouses
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

      {/* Add/Edit Warehouse Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            isClosingRef.current = true;
            setTimeout(() => {
              isClosingRef.current = false;
            }, 500);
          }
          setIsAddDialogOpen(open);
          if (!open) {
            setEditingWarehouse(null);
            // Clear URL params when dialog closes
            router.push("/dashboard/inventory-management/warehouse");
          }
        }}
      >
        <DialogContent className="min-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? "Edit Warehouse" : "Add New Warehouse"}
            </DialogTitle>
          </DialogHeader>
          <AddWarehouse
            key={editingWarehouse?.id || 'new'}
            warehouse={editingWarehouse} 
            onSubmit={handleAddWarehouse}
            onCancel={() => {
              setIsAddDialogOpen(false);
              setEditingWarehouse(null);
              router.push("/dashboard/inventory-management/warehouse");
            }}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Status Toggle Confirmation Modal */}
      <DeleteModal
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) {
            setDeletingWarehouse(null);
          }
        }}
        onConfirm={handleStatusConfirm}
        warehouseName={deletingWarehouse?.name || ""}
        currentStatus={deletingWarehouse?.status || "active"}
        isDeleting={isDeleting}
      />
    </div>
  );
}

