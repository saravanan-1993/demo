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
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Edit,
  Eye,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
import { categoryService, CategoryData } from "@/services/online-services/categoryService";
import { toast } from "sonner";

export const CategorySubcategory = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [categoryData, setCategoryData] = React.useState<CategoryData[]>([]);
  const [totalPages, setTotalPages] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);

  // Fetch unique categories from API
  const fetchCategories = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await categoryService.getCategories({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        categoryStatus: statusFilter === "all" ? undefined : statusFilter,
      });

      // Get unique categories by categoryName
      const uniqueCategoryItems = response.data.reduce((acc: CategoryData[], current) => {
        const x = acc.find(item => item.categoryName === current.categoryName);
        if (!x) {
          return acc.concat([current]);
        }
        return acc;
      }, []);

      setCategoryData(uniqueCategoryItems);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(uniqueCategoryItems.length);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, statusFilter]);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCategories();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [fetchCategories]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

  const handleToggleCategoryStatus = async (id: string) => {
    try {
      await categoryService.toggleCategoryStatus(id, "category");
      toast.success("Category status updated successfully");
      fetchCategories();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/products-list/category-list/${id}`);
  };

  const handleView = (id: string) => {
    router.push(`/dashboard/products-list/category-list/view/${id}`);
  };

  const handleAddCategory = () => {
    router.push("/dashboard/products-list/category-list/add-category");
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
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

          <Button onClick={handleAddCategory}>
            <Plus className="size-4 mr-1" />
            Add Category
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>SEO Keywords</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : categoryData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">No categories found.</TableCell>
              </TableRow>
            ) : (
              categoryData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.categoryName}</TableCell>
                  <TableCell>
                    <div className="size-10 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                      {item.categoryImage ? (
                        <Image src={item.categoryImage} alt={item.categoryName} width={40} height={40} className="object-cover" />
                      ) : (
                        <ImageIcon className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {item.sortOrder ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{item.categoryMetaKeywords}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={item.categoryIsActive ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleCategoryStatus(item.id)}
                    >
                      {item.categoryIsActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
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

      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Showing {startIndex + 1}-{endIndex} of {totalCount}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
};
