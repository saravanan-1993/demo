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
import AddSupplier from "./add-supplier";
import DeleteModal from "./delete-modal";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";

// Supplier type definition
type Supplier = {
  id: string;
  name: string;
  supplierType: string;
  contactPersonName: string;
  phone: string;
  alternatePhone: string;
  email: string;
  billingAddressLine1: string;
  billingAddressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  shippingAddressSameAsBilling: boolean;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;

  taxId: string;
  remarks: string;
  attachments: string;
  status: string;
};

export default function SuppliersList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const isClosingRef = useRef(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch suppliers on mount
  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Check URL params and open edit modal if supplier ID is present
  useEffect(() => {
    const supplierId = searchParams.get("id");
    if (
      supplierId &&
      !isClosingRef.current &&
      suppliers.length > 0
    ) {
      const supplier = suppliers.find((s) => s.id === supplierId);
      if (supplier && (!editingSupplier || editingSupplier.id !== supplier.id)) {
        setEditingSupplier(supplier);
        setIsAddDialogOpen(true);
      }
    }
  }, [searchParams, suppliers]);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/api/purchase/suppliers");
      if (response.data.success) {
        setSuppliers(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to fetch suppliers");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.phone.includes(searchQuery) ||
      supplier.contactPersonName
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSuppliers = filteredSuppliers.slice(startIndex, endIndex);

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

  const handleStatusToggle = (supplier: Supplier) => {
    setDeletingSupplier(supplier);
    setIsDeleteModalOpen(true);
  };

  const handleStatusConfirm = async () => {
    if (!deletingSupplier) return;

    try {
      setIsDeleting(true);
      const newStatus =
        deletingSupplier.status === "active" ? "inactive" : "active";

      const response = await axiosInstance.put(
        `/api/purchase/suppliers/${deletingSupplier.id}`,
        {
          ...deletingSupplier,
          status: newStatus,
        }
      );

      if (response.data.success) {
        toast.success(
          `Supplier ${
            newStatus === "active" ? "activated" : "deactivated"
          } successfully`
        );
        setIsDeleteModalOpen(false);
        setDeletingSupplier(null);
        fetchSuppliers();
      }
    } catch (error) {
      console.error("Error updating supplier status:", error);
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(
        err.response?.data?.error || "Failed to update supplier status"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    router.push(`/dashboard/purchase-orders/suppliers-list?id=${supplier.id}`);
    setIsAddDialogOpen(true);
  };

  const handleAddSupplier = async (supplierData: Omit<Supplier, "id">, file?: File | null) => {
    try {
      setIsSubmitting(true);

      // Create FormData for file upload
      const formData = new FormData();
      
      // Append all supplier data (excluding attachment-related fields initially)
      Object.keys(supplierData).forEach((key) => {
        if (key !== "attachments") {
          const value = supplierData[key as keyof typeof supplierData];
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        }
      });

      // Handle file attachment
      if (file) {
        // New file uploaded
        formData.append("attachment", file);
      } else if (supplierData.attachments === "" && editingSupplier) {
        // User explicitly removed the attachment
        formData.append("removeAttachment", "true");
      } else if (editingSupplier && editingSupplier.attachments) {
        // Keep existing attachment
        formData.append("keepExistingAttachment", "true");
      }

      if (editingSupplier) {
        // Update existing supplier
        const response = await axiosInstance.put(
          `/api/purchase/suppliers/${editingSupplier.id}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        if (response.data.success) {
          isClosingRef.current = true;
          setIsAddDialogOpen(false);
          setEditingSupplier(null);
          toast.success("Supplier updated successfully");
          router.push("/dashboard/purchase-orders/suppliers-list");
          await fetchSuppliers();
          setTimeout(() => {
            isClosingRef.current = false;
          }, 500);
        }
      } else {
        // Add new supplier
        const response = await axiosInstance.post(
          "/api/purchase/suppliers",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        if (response.data.success) {
          isClosingRef.current = true;
          setIsAddDialogOpen(false);
          setEditingSupplier(null);
          toast.success("Supplier created successfully");
          router.push("/dashboard/purchase-orders/suppliers-list");
          await fetchSuppliers();
          setTimeout(() => {
            isClosingRef.current = false;
          }, 500);
        }
      }
    } catch (error) {
      console.error("Error saving supplier:", error);
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      const errorMessage = err.response?.data?.message || err.response?.data?.error || "Failed to save supplier";
      toast.error(errorMessage);
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
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditingSupplier(null);
            setIsAddDialogOpen(true);
            router.push("/dashboard/purchase-orders/suppliers-list");
          }}
        >
          <Plus className="size-4" />
          Add Supplier
        </Button>
      </div>

      {/* Supplier Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Location</TableHead>
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
                    <p className="text-muted-foreground">
                      Loading suppliers...
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">No suppliers found</p>
                </TableCell>
              </TableRow>
            ) : (
              currentSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.email}</TableCell>
                  <TableCell>{supplier.phone}</TableCell>
                  <TableCell>
                    {supplier.city}, {supplier.state}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        supplier.status === "active" ? "default" : "secondary"
                      }
                    >
                      {supplier.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => router.push(`/dashboard/purchase-orders/suppliers-list/${supplier.id}`)}
                        title="View supplier details"
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(supplier)}
                        title="Edit supplier"
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleStatusToggle(supplier)}
                        title={
                          supplier.status === "active"
                            ? "Deactivate supplier"
                            : "Activate supplier"
                        }
                      >
                        <Power
                          className={`size-4 ${
                            supplier.status === "active"
                              ? "text-destructive"
                              : "text-green-600"
                          }`}
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredSuppliers.length)} of{" "}
            {filteredSuppliers.length} suppliers
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

      {/* Add/Edit Supplier Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            isClosingRef.current = true;
            setIsAddDialogOpen(false);
            setEditingSupplier(null);
            router.push("/dashboard/purchase-orders/suppliers-list");
            setTimeout(() => {
              isClosingRef.current = false;
            }, 500);
          }
        }}
      >
        <DialogContent className="min-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <AddSupplier
              key={editingSupplier?.id || "new"}
              supplier={editingSupplier}
              onSubmit={handleAddSupplier}
              onCancel={() => {
                isClosingRef.current = true;
                setIsAddDialogOpen(false);
                setEditingSupplier(null);
                router.push("/dashboard/purchase-orders/suppliers-list");
                setTimeout(() => {
                  isClosingRef.current = false;
                }, 500);
              }}
              isSubmitting={isSubmitting}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Toggle Confirmation Modal */}
      <DeleteModal
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) {
            setDeletingSupplier(null);
          }
        }}
        onConfirm={handleStatusConfirm}
        supplierName={deletingSupplier?.name || ""}
        currentStatus={deletingSupplier?.status || "active"}
        isDeleting={isDeleting}
      />
    </div>
  );
}
