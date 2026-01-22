"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Edit,
  Eye,
  Trash2,
  X,
  Image as ImageIcon,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { ecommerceProductService } from "@/services/online-services/ecommerceProductService";
import { ProductData } from "@/types/product";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import DeleteModal from "./delete-modal";

export default function Online() {
  const router = useRouter();
  const currencySymbol = useCurrency();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [brandFilter, setBrandFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [stockFilter, setStockFilter] = React.useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  const [products, setProducts] = React.useState<ProductData[]>([]);
  const [totalPages, setTotalPages] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);

  // Filter options
  const [categories, setCategories] = React.useState<string[]>([]);
  const [brands, setBrands] = React.useState<string[]>([]);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [deletingProduct, setDeletingProduct] =
    React.useState<ProductData | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Fetch filter options
  const fetchFilterOptions = React.useCallback(async () => {
    try {
      // Fetch all products to extract unique categories and brands
      const response = await ecommerceProductService.getProducts({
        page: 1,
        limit: 1000,
      });
      const allProducts = response.data;

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(allProducts.map((p) => p.category))
      ).sort();
      setCategories(uniqueCategories);

      // Extract unique brands
      const uniqueBrands = Array.from(
        new Set(allProducts.map((p) => p.brand).filter(Boolean))
      ).sort();
      setBrands(uniqueBrands);
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  }, []);

  // Fetch products from API
  const fetchProducts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await ecommerceProductService.getProducts({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        status:
          statusFilter !== "all"
            ? (statusFilter as "draft" | "active")
            : undefined,
      });

      // Apply client-side filters for brand and stock (since backend doesn't support them yet)
      let filteredProducts = response.data;

      if (brandFilter !== "all") {
        filteredProducts = filteredProducts.filter(
          (p) => p.brand === brandFilter
        );
      }

      if (stockFilter !== "all") {
        filteredProducts = filteredProducts.filter((p) => {
          // Use first variant's stock quantity
          const firstVariant = p.variants[0];
          const stockQty = firstVariant?.variantStockQuantity || 0;
          
          if (stockFilter === "in-stock") return stockQty > 10;
          if (stockFilter === "low-stock")
            return stockQty > 0 && stockQty <= 10;
          if (stockFilter === "out-of-stock") return stockQty === 0;
          return true;
        });
      }

      setProducts(filteredProducts);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(filteredProducts.length);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    categoryFilter,
    brandFilter,
    statusFilter,
    stockFilter,
  ]);

  React.useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Pagination info
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleAddProduct = () => {
    router.push("/dashboard/products-list/online/add-product");
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/products-list/online/edit/${id}`);
  };

  const handleView = (id: string) => {
    router.push(`/dashboard/products-list/online/view/${id}`);
  };

  const handleDelete = (product: ProductData) => {
    setDeletingProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleToggleVariantStatus = async (productId: string, variantIndex: number, isActive: boolean) => {
    try {
      // Get the current product
      const product = products.find(p => p.id === productId);
      if (!product) {
        toast.error("Product not found");
        return;
      }

      // Update the variant status
      const updatedVariants = [...product.variants];
      const currentVariant = updatedVariants[variantIndex];
      
      updatedVariants[variantIndex] = {
        ...currentVariant,
        variantStatus: isActive ? "active" : "inactive"
      };

      // If we're deactivating the default variant, find next active variant and make it default
      if (!isActive && currentVariant.isDefault) {
        // Remove default from current variant
        updatedVariants[variantIndex].isDefault = false;
        
        // Find first active variant (excluding the one we just deactivated)
        const nextActiveVariantIndex = updatedVariants.findIndex(
          (v, idx) => idx !== variantIndex && v.variantStatus === "active"
        );
        
        if (nextActiveVariantIndex !== -1) {
          // Make the next active variant the default
          updatedVariants[nextActiveVariantIndex].isDefault = true;
          toast.info(`${updatedVariants[nextActiveVariantIndex].variantName} is now the default variant`);
        } else {
          // No active variants left - warn user
          toast.warning("All variants are now inactive. Product will not be visible on frontend.");
        }
      }

      // Update the product with new variants
      await ecommerceProductService.updateProduct(productId, {
        ...product,
        variants: updatedVariants
      });

      // Update local state
      setProducts(products.map(p => 
        p.id === productId 
          ? { ...p, variants: updatedVariants }
          : p
      ));

      toast.success(`Variant ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error("Error toggling variant status:", error);
      toast.error("Failed to update variant status");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;

    try {
      setIsDeleting(true);
      await ecommerceProductService.deleteProduct(deletingProduct.id);
      toast.success("Product deleted successfully");
      setIsDeleteModalOpen(false);
      setDeletingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 px-2 sm:px-0">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-sm sm:text-base"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px] text-sm">
              <SelectValue placeholder="All Categories" />
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

          {/* Status Filter - Hidden on mobile, shown in advanced filters */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="hidden sm:flex w-[140px] text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          {/* Advanced Filters Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-sm"
            size="sm"
          >
            {showAdvancedFilters ? "Hide" : "Show"} Filters
          </Button>

          {/* Clear Filters Button */}
          {(searchTerm ||
            categoryFilter !== "all" ||
            brandFilter !== "all" ||
            statusFilter !== "all" ||
            stockFilter !== "all") && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setCategoryFilter("all");
                setBrandFilter("all");
                setStatusFilter("all");
                setStockFilter("all");
              }}
              className="hidden sm:flex text-sm"
              size="sm"
            >
              Clear All
            </Button>
          )}

          <Button
            onClick={handleAddProduct}
            className="w-full sm:w-auto text-sm"
            size="sm"
          >
            <Plus className="size-4 mr-1" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="border rounded-lg p-3 sm:p-4 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Status Filter - Mobile only */}
            <div className="sm:hidden">
              <Label className="text-xs sm:text-sm font-medium mb-2 block">
                Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Brand Filter */}
            <div>
              <Label className="text-xs sm:text-sm font-medium mb-2 block">
                Brand
              </Label>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stock Status Filter */}
            <div>
              <Label className="text-xs sm:text-sm font-medium mb-2 block">
                Stock Status
              </Label>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in-stock">In Stock (&gt; 10)</SelectItem>
                  <SelectItem value="low-stock">Low Stock (1-10)</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock (0)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Summary */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Label className="text-xs sm:text-sm font-medium mb-2 block">
                Active Filters
              </Label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    Search: {searchTerm.substring(0, 15)}
                    {searchTerm.length > 15 ? "..." : ""}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setSearchTerm("")}
                    />
                  </Badge>
                )}
                {categoryFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {categoryFilter}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setCategoryFilter("all")}
                    />
                  </Badge>
                )}
                {brandFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {brandFilter}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setBrandFilter("all")}
                    />
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {statusFilter}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setStatusFilter("all")}
                    />
                  </Badge>
                )}
                {stockFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {stockFilter.replace("-", " ")}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setStockFilter("all")}
                    />
                  </Badge>
                )}
                {!searchTerm &&
                  categoryFilter === "all" &&
                  brandFilter === "all" &&
                  statusFilter === "all" &&
                  stockFilter === "all" && (
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      No filters applied
                    </span>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table View - Hidden on Mobile */}
      <div className="hidden lg:block border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead className="min-w-[200px]">Product Name</TableHead>
              <TableHead className="min-w-[100px]">SKU</TableHead>
              <TableHead className="min-w-[150px]">Category</TableHead>
              <TableHead className="min-w-[100px]">Price</TableHead>
              <TableHead className="min-w-[100px]">Stock</TableHead>
              <TableHead className="min-w-[80px]">Status</TableHead>
              <TableHead className="min-w-[120px]">Variants</TableHead>
              <TableHead className="min-w-[100px]">Created</TableHead>
              <TableHead className="text-right min-w-[120px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-muted-foreground">
                      Loading products...
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="size-12 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ||
                      categoryFilter !== "all" ||
                      statusFilter !== "all"
                        ? "No products found matching your filters."
                        : "No products available. Click 'Add Product' to get started."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                // Get default variant for display
                const defaultVariant =
                  product.variants.find((v) => v.isDefault) ||
                  product.variants[0];
                const mainImage =
                  typeof defaultVariant?.variantImages?.[0] === "string"
                    ? defaultVariant.variantImages[0]
                    : null;

                return (
                  <TableRow key={product.id}>
                    {/* Image */}
                    <TableCell>
                      <div className="size-12 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                        {mainImage ? (
                          <Image
                            src={mainImage}
                            alt={defaultVariant?.variantName || product.brand}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="size-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>

                    {/* Product Name (Variant Name) */}
                    <TableCell className="font-medium">
                      <div className="max-w-[200px]">
                        <div className="truncate">{defaultVariant?.variantName || "Default"}</div>
                        {/* <div className="text-xs text-muted-foreground truncate">
                          {product.brand} • {product.shortDescription}
                        </div> */}
                      </div>
                    </TableCell>

                    {/* SKU */}
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {defaultVariant?.variantSKU || "N/A"}
                      </code>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{product.category}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.subCategory}
                        </div>
                      </div>
                    </TableCell>

                    {/* Price */}
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {currencySymbol}
                          {defaultVariant?.variantSellingPrice.toFixed(2) || "0.00"}
                        </div>
                        {defaultVariant && defaultVariant.variantMRP > defaultVariant.variantSellingPrice && (
                          <div className="text-xs text-muted-foreground line-through">
                            {currencySymbol}
                            {defaultVariant.variantMRP.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Stock */}
                    <TableCell>
                      <Badge
                        variant={
                          defaultVariant?.variantStockStatus === "in-stock"
                            ? "default"
                            : defaultVariant?.variantStockStatus === "low-stock"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {defaultVariant?.variantStockQuantity || 0} units
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant={
                          product.productStatus === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {product.productStatus === "active"
                          ? "Active"
                          : "Draft"}
                      </Badge>
                    </TableCell>

                    {/* Variants */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8">
                            {product.variants.length} Variant{product.variants.length !== 1 ? 's' : ''}
                            <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[300px]">
                          <DropdownMenuLabel>Manage Variants</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <div className="max-h-[300px] overflow-y-auto">
                            {product.variants.map((variant, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between px-2 py-2 hover:bg-accent rounded-sm"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium text-sm truncate">
                                      {variant.variantName}
                                    </div>
                                    {variant.isDefault && (
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                        Default
                                      </Badge>
                                    )}
                                    {variant.variantStatus === "inactive" && (
                                      <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                        Unavailable
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {variant.displayName}
                                  </div>
                                </div>
                                <Switch
                                  checked={variant.variantStatus === "active"}
                                  onCheckedChange={(checked) =>
                                    handleToggleVariantStatus(product.id, index, checked)
                                  }
                                  className="ml-2"
                                />
                              </div>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>

                    {/* Created Date */}
                    <TableCell>
                      {new Date(product.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleView(product.id)}
                          title="View details"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEdit(product.id)}
                          title="Edit"
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(product)}
                          title="Delete"
                        >
                          <Trash2 className="size-4 text-destructive" />
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

      {/* Mobile Card View - Hidden on Desktop */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-muted-foreground">
                Loading products...
              </p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
            <ImageIcon className="size-16 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground text-center px-4">
              {searchTerm || categoryFilter !== "all" || statusFilter !== "all"
                ? "No products found matching your filters."
                : "No products available. Click 'Add Product' to get started."}
            </p>
          </div>
        ) : (
          products.map((product) => {
            const defaultVariant =
              product.variants.find((v) => v.isDefault) || product.variants[0];
            const mainImage =
              typeof defaultVariant?.variantImages?.[0] === "string"
                ? defaultVariant.variantImages[0]
                : null;

            return (
              <div
                key={product.id}
                className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3">
                  {/* Product Image */}
                  <div className="size-20 sm:size-24 bg-muted rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                    {mainImage ? (
                      <Image
                        src={mainImage}
                        alt={defaultVariant?.variantName || product.brand}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Title and Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {defaultVariant?.variantName || "Default"}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {product.brand} • {product.shortDescription}
                        </p>
                      </div>
                      <Badge
                        variant={
                          product.productStatus === "active"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs flex-shrink-0"
                      >
                        {product.productStatus === "active"
                          ? "Active"
                          : "Draft"}
                      </Badge>
                    </div>

                    {/* Category and SKU */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {product.category}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                        {defaultVariant?.variantSKU || "N/A"}
                      </code>
                    </div>

                    {/* Price and Stock */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm">
                          {currencySymbol}
                          {defaultVariant?.variantSellingPrice.toFixed(2) || "0.00"}
                        </span>
                        {defaultVariant && defaultVariant.variantMRP > defaultVariant.variantSellingPrice && (
                          <span className="text-xs text-muted-foreground line-through">
                            {currencySymbol}
                            {defaultVariant.variantMRP.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={
                          defaultVariant?.variantStockStatus === "in-stock"
                            ? "default"
                            : defaultVariant?.variantStockStatus === "low-stock"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {defaultVariant?.variantStockQuantity || 0} units
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(product.id)}
                        className="flex-1 text-xs h-8"
                      >
                        <Eye className="size-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product.id)}
                        className="flex-1 text-xs h-8"
                      >
                        <Edit className="size-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product)}
                        className="text-xs h-8 px-2"
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-2">
          {/* Results Info and Items Per Page */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Showing {startIndex + 1}-{endIndex} of {totalCount}
            </div>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => setItemsPerPage(Number(value))}
            >
              <SelectTrigger className="w-[90px] sm:w-[100px] text-xs sm:text-sm h-8 sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 / page</SelectItem>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Pagination className="mx-0 w-full sm:w-auto">
              <PaginationContent className="flex-wrap gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) {
                        handlePageChange(currentPage - 1);
                      }
                    }}
                    className={`h-8 sm:h-9 text-xs sm:text-sm ${
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }`}
                  />
                </PaginationItem>

                {/* Show fewer page numbers on mobile */}
                <div className="hidden sm:contents">
                  {generatePageNumbers().map((page, index) => (
                    <PaginationItem key={index}>
                      {page === "ellipsis" ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(page as number);
                          }}
                          isActive={currentPage === page}
                          className="h-9 text-sm"
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                </div>

                {/* Mobile: Show only current page */}
                <div className="sm:hidden flex items-center gap-1">
                  <span className="text-xs text-muted-foreground px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) {
                        handlePageChange(currentPage + 1);
                      }
                    }}
                    className={`h-8 sm:h-9 text-xs sm:text-sm ${
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }`}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) {
            setDeletingProduct(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        productName={deletingProduct?.brand || ""}
        isDeleting={isDeleting}
      />
    </div>
  );
}
