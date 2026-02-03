"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Search,
  Edit,
  Loader2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { authService } from "@/services/authService";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Product {
  id: string;
  itemName: string;
  itemCode?: string;
  category?: string;
  description?: string;
  purchasePrice: number;
  quantity: number;
  lowStockAlertLevel: number;
  display: string;
  itemImage?: string;
  _source?: 'inventory' | 'pos'; // Track data source
  _inventoryItemId?: string; // Reference to inventory item
}

export const PosProductsList = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currencySymbol, setCurrencySymbol] = useState<string>("₹");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Delete state
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axiosInstance.get(
        "/api/inventory/categories?isActive=true"
      );
      if (response.data.success) {
        const categoryNames = response.data.data.map(
          (cat: { name: string }) => cat.name
        );
        setCategories(["all", ...categoryNames]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories(["all"]);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (selectedCategory !== "all") {
        params.category = selectedCategory;
      }

      // Fetch inventory items (master data)
      const inventoryResponse = await axiosInstance.get("/api/inventory/items", {
        params,
      });

      if (inventoryResponse.data.success) {
        const inventoryItems = inventoryResponse.data.data;
        
        // Fetch POS products (edited items)
        const posResponse = await axiosInstance.get("/api/pos/products", {
          params,
        });

        const posProducts = posResponse.data.success ? posResponse.data.data : [];
        
        // Create a map of POS products by itemId for quick lookup
        const posProductMap = new Map(
          posProducts.map((p: Product & { itemId?: string }) => [p.itemId, p])
        );

        // Merge: Use POS product if exists, otherwise use inventory item
        const mergedProducts = inventoryItems.map((item: Product & { id: string }) => {
          const posProduct = posProductMap.get(item.id);
          
          if (posProduct) {
            // Item has been edited in POS - use POS data
            return {
              ...posProduct,
              _source: 'pos', // Track source for edit handling
              _inventoryItemId: item.id, // Keep reference to inventory item
            };
          } else {
            // Item not yet edited in POS - use inventory data
            return {
              ...item,
              display: 'inactive', // Default display status
              _source: 'inventory', // Track source
              _inventoryItemId: item.id,
            };
          }
        });

        setProducts(mergedProducts);
      }
    } catch (error) {
      toast.error("Failed to load products");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    const fetchAdminCurrency = async () => {
      try {
        const adminData = await authService.getCurrentAdmin();
        const adminCurrency = adminData.currency || "INR";
        const symbol =
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: adminCurrency,
          })
            .formatToParts(0)
            .find((part) => part.type === "currency")?.value || "₹";

        setCurrencySymbol(symbol);
      } catch (error) {
        console.error("Error fetching admin currency:", error);
      }
    };
    fetchAdminCurrency();
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  const handleEdit = async (product: Product) => {
    try {
      // If product is from inventory (not yet in POS), create POS product first
      if (product._source === 'inventory' && product._inventoryItemId) {
        toast.loading("Preparing product for editing...");
        
        const response = await axiosInstance.post("/api/pos/products", {
          itemId: product._inventoryItemId,
        });

        if (response.data.success) {
          const posProductId = response.data.data.id;
          toast.dismiss();
          toast.success("Product ready for editing");
          router.push(`/dashboard/pos/products/edit/${posProductId}`);
        }
      } else {
        // Product already exists in POS, edit directly
        router.push(`/dashboard/pos/products/edit/${product.id}`);
      }
    } catch (error) {
      toast.dismiss();
      const err = error as { response?: { data?: { error?: string } } };
      const errorMessage = err.response?.data?.error || "Failed to prepare product for editing";
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const handleDelete = (product: Product) => {
    // Only allow delete if product exists in POS collection
    if (product._source === 'pos') {
      setDeletingProduct(product);
      setIsDeleteDialogOpen(true);
    } else {
      toast.error("Cannot delete inventory items from POS. This item hasn't been customized yet.");
    }
  };

  const confirmDelete = async () => {
    if (!deletingProduct) return;

    setIsDeleting(true);
    try {
      // Delete from POS products collection only
      await axiosInstance.delete(`/api/pos/products/${deletingProduct.id}`);

      toast.success("POS product deleted successfully. Item will now show as inactive from inventory.");
      setIsDeleteDialogOpen(false);
      setDeletingProduct(null);
      
      // Refresh the list - deleted item will now show from inventory with display='inactive'
      fetchProducts();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to delete POS product");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleDisplay = async (product: Product, currentDisplay: string) => {
    try {
      const newDisplay = currentDisplay === "active" ? "inactive" : "active";

      // If product is from inventory (not yet in POS), create POS product first
      if (product._source === 'inventory' && product._inventoryItemId) {
        toast.loading("Creating POS product...");
        
        const createResponse = await axiosInstance.post("/api/pos/products", {
          itemId: product._inventoryItemId,
        });

        if (createResponse.data.success) {
          const posProductId = createResponse.data.data.id;
          
          // Now update the display status
          await axiosInstance.put(`/api/pos/products/${posProductId}`, {
            ...createResponse.data.data,
            display: newDisplay,
          });

          toast.dismiss();
          toast.success(
            `Product ${newDisplay === "active" ? "activated" : "deactivated"} successfully`
          );
          fetchProducts();
        }
      } else {
        // Product already exists in POS, update directly
        await axiosInstance.put(`/api/pos/products/${product.id}`, {
          display: newDisplay,
        });

        toast.success(
          `Product ${newDisplay === "active" ? "activated" : "deactivated"} successfully`
        );
        fetchProducts();
      }
    } catch (error) {
      toast.dismiss();
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to update product display status");
      console.error(error);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.itemCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Reset to first page when search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

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

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <p className="text-muted-foreground">Loading products...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : currentProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <p className="text-muted-foreground">No products found</p>
                </TableCell>
              </TableRow>
            ) : (
              currentProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex items-center justify-center relative">
                      {product.itemImage && product.itemImage.trim() !== '' ? (
                        <Image
                          src={product.itemImage}
                          alt={product.itemName}
                          fill
                          sizes="64px"
                          className="object-cover"
                          priority={false}
                          quality={75}
                          onError={(e) => {
                            console.error(
                              "Failed to load image:",
                              product.itemImage
                            );
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <svg
                          className="w-8 h-8 text-muted-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{product.itemName}</span>
                        {product._source === 'inventory' && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            From Inventory
                          </Badge>
                        )}
                        {product._source === 'pos' && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            Customized
                          </Badge>
                        )}
                      </div>
                      {product.description && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xs text-muted-foreground line-clamp-1 cursor-help">
                                {product.description}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md">
                              <p>{product.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{product.itemCode || "N/A"}</TableCell>
                  <TableCell>
                    {product.category && (
                      <Badge variant="outline">{product.category}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(product.purchasePrice)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.quantity > product.lowStockAlertLevel
                          ? "default"
                          : product.quantity > 0
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {product.quantity > 0 ? product.quantity : "Out of stock"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={product.display === "active"}
                        onCheckedChange={() =>
                          handleToggleDisplay(product, product.display)
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {product.display === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(product)}
                        title="Edit product"
                      >
                        <Edit className="size-4" />
                      </Button>
                      {product._source === 'pos' && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(product)}
                          title="Delete POS customization"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of{" "}
            {filteredProducts.length} products
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete POS Product Customization</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the POS customization for{" "}
              <strong className="text-foreground">{deletingProduct?.itemName}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This will remove the POS-specific settings (pricing, barcode, etc.) but the item will remain in inventory.
            </p>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-3">
              ⚠️ After deletion, this item will show as <strong>inactive</strong> from inventory data.
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
                "Delete POS Customization"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
