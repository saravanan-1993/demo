"use client";

import { useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

import { CategorySubcategory } from "./category/category-subcategory";
import { SubcategoryList } from "./category/subcategory-list";
import Online from "./online/online";


export const ProductsList = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("online");

  // Get tab from URL path
  useEffect(() => {
    const normalizedPath =
      pathname.endsWith("/") && pathname !== "/"
        ? pathname.slice(0, -1)
        : pathname;

    if (normalizedPath === "/dashboard/products-list") {
      // Redirect to warehouse tab by default
      router.replace("/dashboard/products-list/online");
    } else {
      const pathSegments = normalizedPath.split("/");
      const lastSegment = pathSegments[pathSegments.length - 1];
      setActiveTab(lastSegment || "online");
    }
  }, [pathname, router]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/dashboard/products-list/${value}`);
  };

  return (
    <div className="w-full p-6">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {/* Header with Tabs and Button */}
        <div className="mb-6 flex items-center gap-5">
          <TabsList className="w-auto">
            <TabsTrigger value="online">Online</TabsTrigger>
           
            <TabsTrigger value="category-list">Category</TabsTrigger>
            <TabsTrigger value="subcategory-list">Sub Category</TabsTrigger>
          </TabsList>

        {/*   <Button
            
            className="px-4 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Add Items
          </Button> */}
        </div>

        {/* Tab Contents */}
        <TabsContent value="online" className="mt-0 w-full">

            <Online />
        </TabsContent>
        
       
        <TabsContent value="category-list" className="mt-0 w-full">
          <CategorySubcategory />
        </TabsContent>

        <TabsContent value="subcategory-list" className="mt-0 w-full">
          <SubcategoryList />
        </TabsContent>
      </Tabs>
    </div>
  );
};
