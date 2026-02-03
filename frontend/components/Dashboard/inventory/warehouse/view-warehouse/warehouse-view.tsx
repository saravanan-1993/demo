"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import WarehouseViewDetail from "./warehouse-view-detail";
import WarehouseViewListItems from "./warehouse-view-list-items";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";

interface Warehouse {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  state: string;
  postalCode: string;
  country: string;
  status: string;
  manager: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface WarehouseViewProps {
  warehouseId: string;
}

export default function WarehouseView({ warehouseId }: WarehouseViewProps) {
  const router = useRouter();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWarehouse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]);

  const fetchWarehouse = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(
        `/api/inventory/warehouses/${warehouseId}`
      );
      if (response.data.success) {
        setWarehouse(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching warehouse:", error);
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to fetch warehouse details");
      router.push("/dashboard/inventory-management/warehouse");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Warehouse not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/inventory-management/warehouse")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Warehouse Details</h1>
          <p className="text-sm text-muted-foreground">
            View warehouse information and inventory items
          </p>
        </div>
      </div>

      {/* Warehouse Details */}
      <WarehouseViewDetail warehouse={warehouse} />

      {/* Inventory Items */}
      <WarehouseViewListItems warehouseId={warehouseId} />
    </div>
  );
}
