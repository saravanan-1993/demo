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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Eye,
  Image as ImageIcon,
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
import { categoryService, CategoryData } from "@/services/online-services/categoryService";
import { toast } from "sonner";

export const SubcategoryList = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [subcategoryData, setSubcategoryData] = React.useState<CategoryData[]>([]);
  const [totalPages, setTotalPages] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [uniqueCategories, setUniqueCategories] = React.useState<string[]>([]);

  // Fetch subcategories from API
  const fetchSubcategories = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let searchQuery = searchTerm;
      if (categoryFilter !== "all" && !searchTerm) {
        searchQuery = categoryFilter;
      }

      const response = await categoryService.getCategories({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        subcategoryStatus: statusFilter === "all" ? undefined : statusFilter,
      });

      // Filter to only include items with subcategories
      const filteredData = response.data.filter(item => item.subcategoryName);
      setSubcategoryData(filteredData);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.totalCount);

      // Extract unique categories for filters
      const categories = [
        ...new Set(response.data.map((item) => item.categoryName)),
      ];
      setUniqueCategories(categories);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      toast.error("Failed to load subcategories");
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, currentPage, itemsPerPage, searchTerm, statusFilter]);

  // Debounced search effect
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSubcategories();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [fetchSubcategories]);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, itemsPerPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleToggleSubcategoryStatus = async (id: string) => {
    try {
      await categoryService.toggleCategoryStatus(id, "subcategory");
      toast.success("Subcategory status updated successfully");
      fetchSubcategories();
    } catch (error) {
      console.error("Error updating subcategory status:", error);
      toast.error("Failed to update subcategory status");
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/products-list/category-list/edit-subcategory/${id}`);
  };

  const handleView = (id: string) => {
    router.push(`/dashboard/products-list/category-list/view-subcategory/${id}`);
  };

  const handleAddSubcategory = () => {
    router.push("/dashboard/products-list/category-list/add-subcategory");
  };

  return (
    <div className="space-y-4">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search subcategories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleAddSubcategory}>
            <Plus className="size-4 mr-1" />
            Add Subcategory
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subcategory</TableHead>
              <TableHead>Parent Category</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>SEO Keywords</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : subcategoryData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No subcategories found.
                </TableCell>
              </TableRow>
            ) : (
              subcategoryData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.subcategoryName}
                  </TableCell>
                  <TableCell>{item.categoryName}</TableCell>
                  <TableCell>
                    <div className="size-10 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                      {item.subcategoryImage ? (
                        <Image
                          src={item.subcategoryImage}
                          alt={item.subcategoryName}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {item.subcategoryMetaKeywords}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={item.subcategoryIsActive ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleSubcategoryStatus(item.id)}
                    >
                      {item.subcategoryIsActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                     
                      <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(item.id)}>
                        <Edit className="size-4" />
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
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{endIndex} of {totalCount}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
