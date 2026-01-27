"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Search, Image as ImageIcon, Save, X } from "lucide-react";
import axiosInstance from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";

interface PageSEO {
  id: string | null;
  pagePath: string;
  pageName: string;
  description: string | null;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export const PageSEOList = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<PageSEO[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPage, setSelectedPage] = useState<PageSEO | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);
  const [ogImagePreview, setOgImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/web/seo");
      if (response.data.success) {
        setPages(response.data.data || []);
      }
    } catch (error: unknown) {
      console.error("Error fetching pages:", error);
      toast.error("Failed to load pages");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPage = (page: PageSEO) => {
    setSelectedPage(page);
    setOgImagePreview(page.ogImage);
    setOgImageFile(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedPage(null);
    setOgImageFile(null);
    setOgImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOgImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOgImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setOgImageFile(null);
    setOgImagePreview(null);
    if (selectedPage) {
      setSelectedPage({ ...selectedPage, ogImage: null });
    }
  };

  const handleSave = async () => {
    if (!selectedPage) return;

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("pagePath", selectedPage.pagePath);
      formData.append("pageName", selectedPage.pageName);
      formData.append("description", selectedPage.description || "");
      formData.append("metaTitle", selectedPage.metaTitle);
      formData.append("metaDescription", selectedPage.metaDescription);
      formData.append("metaKeywords", selectedPage.metaKeywords);
      formData.append("isActive", String(selectedPage.isActive));

      if (ogImageFile) {
        formData.append("ogImage", ogImageFile);
      }

      const response = await axiosInstance.post("/api/web/seo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        toast.success("Page SEO saved successfully");
        fetchPages();
        handleCloseDialog();
      }
    } catch (error: unknown) {
      console.error("Error saving page SEO:", error);
      const errorMessage =
        error instanceof Error && "response" in error
          ? ((error as any).response?.data?.error as string)
          : "Failed to save page SEO";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const filteredPages = pages.filter(
    (page) =>
      page.pageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.pagePath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3x3 grid

  // Calculate pagination
  const totalPages = Math.ceil(filteredPages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPages = filteredPages.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Page SEO Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage SEO settings for all public pages
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentPages.map((page) => (
          <Card
            key={page.pagePath}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleEditPage(page)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{page.pageName}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {page.pagePath}
                  </CardDescription>
                </div>
                {page.id && (
                  <Badge variant="secondary" className="text-xs">
                    Configured
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {page.metaTitle && (
                  <div>
                    <span className="font-medium">Title:</span>{" "}
                    <span className="text-muted-foreground line-clamp-1">
                      {page.metaTitle}
                    </span>
                  </div>
                )}
                {page.metaDescription && (
                  <div>
                    <span className="font-medium">Description:</span>{" "}
                    <span className="text-muted-foreground line-clamp-2">
                      {page.metaDescription}
                    </span>
                  </div>
                )}
                {!page.metaTitle && !page.metaDescription && (
                  <p className="text-muted-foreground italic">No SEO data configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredPages.length)} of{" "}
            {filteredPages.length} pages
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

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit SEO - {selectedPage?.pageName}</DialogTitle>
            <DialogDescription>
              Configure SEO settings for {selectedPage?.pagePath}
            </DialogDescription>
          </DialogHeader>

          {selectedPage && (
            <div className="space-y-4 py-4">
              {/* Meta Title */}
              <div className="space-y-2">
                <Label htmlFor="metaTitle">
                  Meta Title <span className="text-xs text-muted-foreground">(50-60 characters recommended)</span>
                </Label>
                <Input
                  id="metaTitle"
                  value={selectedPage.metaTitle}
                  onChange={(e) =>
                    setSelectedPage({ ...selectedPage, metaTitle: e.target.value })
                  }
                  placeholder="Enter meta title"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedPage.metaTitle.length}/100 characters
                </p>
              </div>

              {/* Meta Description */}
              <div className="space-y-2">
                <Label htmlFor="metaDescription">
                  Meta Description <span className="text-xs text-muted-foreground">(150-160 characters recommended)</span>
                </Label>
                <Textarea
                  id="metaDescription"
                  value={selectedPage.metaDescription}
                  onChange={(e) =>
                    setSelectedPage({
                      ...selectedPage,
                      metaDescription: e.target.value,
                    })
                  }
                  placeholder="Enter meta description"
                  rows={3}
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedPage.metaDescription.length}/300 characters
                </p>
              </div>

              {/* Meta Keywords */}
              <div className="space-y-2">
                <Label htmlFor="metaKeywords">
                  Meta Keywords <span className="text-xs text-muted-foreground">(comma-separated)</span>
                </Label>
                <Input
                  id="metaKeywords"
                  value={selectedPage.metaKeywords}
                  onChange={(e) =>
                    setSelectedPage({ ...selectedPage, metaKeywords: e.target.value })
                  }
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>

              {/* OG Image */}
              <div className="space-y-2">
                <Label>
                  Open Graph Image <span className="text-xs text-muted-foreground">(1200x630px recommended)</span>
                </Label>
                
                {ogImagePreview ? (
                  <div className="relative w-full h-48">
                    <Image
                      src={ogImagePreview}
                      alt="OG Image Preview"
                      fill
                      sizes="(max-width: 768px) 100vw, 600px"
                      className="object-cover rounded-md border"
                      priority={false}
                      quality={85}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 z-10"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-md p-6 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <Label
                      htmlFor="ogImage"
                      className="cursor-pointer text-sm text-primary hover:underline"
                    >
                      Click to upload image
                    </Label>
                    <Input
                      id="ogImage"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
