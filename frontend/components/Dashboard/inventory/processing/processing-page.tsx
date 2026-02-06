"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ArrowRight, History, Plus, Loader2 } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";
import ProcessingModal from "./processing-modal";
import ProcessingHistory from "./processing-history";
import AddItemButton from "../items/add-item-button";

interface ProcessingPoolItem {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  itemCode: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  uom: string;
  avgPurchasePrice: number;
  totalValue: number;
  totalPurchased: number;
  totalProcessed: number;
  totalWastage: number;
  status: string;
}

export default function Processing() {
  const [activeTab, setActiveTab] = useState("pool");
  const [poolItems, setPoolItems] = useState<ProcessingPoolItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ProcessingPoolItem | null>(null);
  const [showProcessingModal, setShowProcessingModal] = useState(false);

  // Fetch processing pool items
  const fetchPoolItems = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/api/inventory/processing-pool");
      
      if (response.data.success) {
        setPoolItems(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching processing pool:", error);
      toast.error("Failed to load processing pool");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPoolItems();
  }, []);

  const handleProcessClick = (item: ProcessingPoolItem) => {
    if (item.currentStock <= 0) {
      toast.error("No stock available", {
        description: "This item has no stock available for processing",
      });
      return;
    }
    setSelectedItem(item);
    setShowProcessingModal(true);
  };

  const handleProcessingComplete = () => {
    setShowProcessingModal(false);
    setSelectedItem(null);
    fetchPoolItems(); // Refresh pool data
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Processing</h2>
          <p className="text-muted-foreground">
            Manage raw materials and convert them into finished products
          </p>
        </div>
   
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pool">
            <Package className="h-4 w-4 mr-2" />
            Processing Pool
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Processing History
          </TabsTrigger>
        </TabsList>

        {/* Processing Pool Tab */}
        <TabsContent value="pool" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : poolItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Processing Items</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Add processing items (raw materials) to start converting them into finished products
                </p>
                <AddItemButton>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Processing Item
                </AddItemButton>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {poolItems.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{item.itemName}</CardTitle>
                        <CardDescription>{item.category}</CardDescription>
                      </div>
                      <Badge variant={item.currentStock > 0 ? "default" : "secondary"}>
                        {item.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stock Info */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Available Stock:</span>
                        <span className="font-semibold text-lg">
                          {item.currentStock} {item.uom}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg Price:</span>
                        <span className="font-medium">
                          ₹{item.avgPurchasePrice.toFixed(2)}/{item.uom}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Value:</span>
                        <span className="font-medium">₹{item.totalValue.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="pt-3 border-t space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Total Purchased:</span>
                        <span>{item.totalPurchased} {item.uom}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Total Processed:</span>
                        <span>{item.totalProcessed} {item.uom}</span>
                      </div>
                      {item.totalWastage > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Total Wastage:</span>
                          <span className="text-destructive">{item.totalWastage} {item.uom}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 space-y-2">
                      <Button
                        className="w-full"
                        onClick={() => handleProcessClick(item)}
                        disabled={item.currentStock <= 0}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Process
                      </Button>
                     
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Processing History Tab */}
        <TabsContent value="history">
          <ProcessingHistory />
        </TabsContent>
      </Tabs>

      {/* Processing Modal */}
      {selectedItem && (
        <ProcessingModal
          open={showProcessingModal}
          onOpenChange={setShowProcessingModal}
          poolItem={selectedItem}
          onSuccess={handleProcessingComplete}
        />
      )}
    </div>
  );
}
