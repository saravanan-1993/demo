"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, X, AlertCircle, Package, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import AddItemButton from "../items/add-item-button";

interface ProcessingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poolItem: {
    id: string;
    itemId: string;
    itemName: string;
    category: string;
    currentStock: number;
    uom: string;
    avgPurchasePrice: number;
    warehouseId: string;
    warehouseName: string;
  };
  onSuccess: () => void;
}

interface PreviousRecipeItem {
  itemId: string;
  itemName: string;
  uom: string;
  currentStock: number;
  selected: boolean;
  newQuantity: string;
}

interface NewOutputItem {
  itemId: string;
  itemName: string;
  quantity: number;
  uom: string;
}

interface InventoryItem {
  id: string;
  itemName: string;
  category: string;
  uom: string;
  itemType: string;
  quantity: number;
}

export default function ProcessingModal({
  open,
  onOpenChange,
  poolItem,
  onSuccess,
}: ProcessingModalProps) {
  const [inputQuantity, setInputQuantity] = useState("");
  const [previousRecipeItems, setPreviousRecipeItems] = useState<PreviousRecipeItem[]>([]);
  const [newOutputs, setNewOutputs] = useState<NewOutputItem[]>([]);
  const [wastagePercent, setWastagePercent] = useState("0");
  const [processingCost, setProcessingCost] = useState("0");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [hasProcessedBefore, setHasProcessedBefore] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;
      
      let finishedItems: InventoryItem[] = [];
      
      try {
        setIsLoadingItems(true);
        setIsLoadingRecipe(true);

        const itemsResponse = await axiosInstance.get("/api/inventory/items");
        
        if (itemsResponse.data.success) {
          finishedItems = itemsResponse.data.data.filter(
            (item: InventoryItem) => 
              item.itemType === "regular" && 
              item.category === poolItem.category
          );
          setInventoryItems(finishedItems);
        }

        try {
          const recipeResponse = await axiosInstance.get(
            `/api/inventory/processing-pool/${poolItem.id}/recipe`
          );
          
          if (recipeResponse.data.success && recipeResponse.data.data.length > 0) {
            const recipeWithStock = recipeResponse.data.data.map((recipeItem: {
              itemId: string;
              itemName: string;
              uom: string;
              currentStock: number;
            }) => {
              const inventoryItem = finishedItems.find((item: InventoryItem) => item.id === recipeItem.itemId);
              return {
                itemId: recipeItem.itemId,
                itemName: recipeItem.itemName,
                uom: recipeItem.uom,
                currentStock: inventoryItem?.quantity || 0,
                selected: false,
                newQuantity: "",
              };
            });
            setPreviousRecipeItems(recipeWithStock);
            setHasProcessedBefore(true);
          } else {
            setHasProcessedBefore(false);
          }
        } catch {
          setHasProcessedBefore(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load processing data");
      } finally {
        setIsLoadingItems(false);
        setIsLoadingRecipe(false);
      }
    };

    fetchData();
  }, [open, poolItem.category, poolItem.id]);

  useEffect(() => {
    if (!open) {
      setInputQuantity("");
      setPreviousRecipeItems([]);
      setNewOutputs([]);
      setWastagePercent("0");
      setProcessingCost("0");
      setNotes("");
      setHasProcessedBefore(false);
    }
  }, [open]);

  const togglePreviousItem = (index: number) => {
    setPreviousRecipeItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updatePreviousItemQuantity = (index: number, quantity: string) => {
    setPreviousRecipeItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, newQuantity: quantity } : item
      )
    );
  };

  const addNewOutput = () => {
    setNewOutputs([
      ...newOutputs,
      { itemId: "", itemName: "", quantity: 0, uom: "" },
    ]);
  };

  const removeNewOutput = (index: number) => {
    setNewOutputs(newOutputs.filter((_, i) => i !== index));
  };

  const updateNewOutput = (index: number, field: keyof NewOutputItem, value: string | number) => {
    const newOutputsCopy = [...newOutputs];
    
    if (field === "itemId") {
      const selectedItem = inventoryItems.find((item) => item.id === value);
      if (selectedItem) {
        newOutputsCopy[index] = {
          ...newOutputsCopy[index],
          itemId: selectedItem.id,
          itemName: selectedItem.itemName,
          uom: selectedItem.uom,
        };
      }
    } else {
      newOutputsCopy[index] = { ...newOutputsCopy[index], [field]: value };
    }
    
    setNewOutputs(newOutputsCopy);
  };

  const calculateWastage = () => {
    const input = parseFloat(inputQuantity) || 0;
    const wastage = (input * parseFloat(wastagePercent)) / 100;
    return wastage.toFixed(2);
  };

  const validateForm = () => {
    if (!inputQuantity || parseFloat(inputQuantity) <= 0) {
      toast.error("Please enter a valid quantity to process");
      return false;
    }

    if (parseFloat(inputQuantity) > poolItem.currentStock) {
      toast.error("Quantity exceeds available stock");
      return false;
    }

    const selectedPreviousItems = previousRecipeItems.filter(
      (item) => item.selected && item.newQuantity && parseFloat(item.newQuantity) > 0
    );
    const validNewOutputs = newOutputs.filter(
      (item) => item.itemId && item.quantity > 0
    );

    if (selectedPreviousItems.length === 0 && validNewOutputs.length === 0) {
      toast.error("Please select at least one output item or add a new one");
      return false;
    }

    const invalidPreviousItems = previousRecipeItems.filter(
      (item) => item.selected && (!item.newQuantity || parseFloat(item.newQuantity) <= 0)
    );
    if (invalidPreviousItems.length > 0) {
      toast.error("Please enter valid quantities for all selected items");
      return false;
    }

    for (const output of newOutputs) {
      if (!output.itemId) {
        toast.error("Please select an item for all new outputs");
        return false;
      }
      if (!output.quantity || output.quantity <= 0) {
        toast.error("Please enter valid quantities for all new outputs");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const selectedPreviousOutputs = previousRecipeItems
        .filter((item) => item.selected && item.newQuantity && parseFloat(item.newQuantity) > 0)
        .map((item) => ({
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: parseFloat(item.newQuantity),
          uom: item.uom,
        }));

      const validNewOutputs = newOutputs.filter(
        (item) => item.itemId && item.quantity > 0
      );

      const allOutputs = [...selectedPreviousOutputs, ...validNewOutputs];

      const processingData = {
        poolId: poolItem.id,
        inputItemId: poolItem.itemId,
        inputQuantity: parseFloat(inputQuantity),
        warehouseId: poolItem.warehouseId,
        outputs: allOutputs,
        wastagePercent: parseFloat(wastagePercent),
        processingCost: parseFloat(processingCost),
        notes: notes.trim() || null,
      };

      const response = await axiosInstance.post(
        "/api/inventory/processing-transactions",
        processingData
      );

      if (response.data.success) {
        toast.success("Processing completed successfully", {
          description: `Processed ${inputQuantity} ${poolItem.uom} of ${poolItem.itemName}`,
        });
        onSuccess();
      }
    } catch (error: unknown) {
      console.error("Error processing:", error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : "Failed to process items";
      toast.error("Processing failed", {
        description: errorMessage || "Failed to process items",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process: {poolItem.itemName}</DialogTitle>
        </DialogHeader>

        {isLoadingRecipe || isLoadingItems ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Input Section */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">
                📥 INPUT (From Processing Pool)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Available Stock:</span>
                  <span className="font-semibold">
                    {poolItem.currentStock} {poolItem.uom}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Price:</span>
                  <span className="font-semibold">
                    ₹{poolItem.avgPurchasePrice.toFixed(2)}/{poolItem.uom}
                  </span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inputQuantity">
                    Quantity to Process <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="inputQuantity"
                      type="number"
                      min="0"
                      max={poolItem.currentStock}
                      step="0.01"
                      value={inputQuantity}
                      onChange={(e) => setInputQuantity(e.target.value)}
                      placeholder="0"
                    />
                    <span className="flex items-center px-3 bg-muted rounded-md text-sm">
                      {poolItem.uom}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  📤 OUTPUTS (To Inventory)
                </h3>
              </div>

              {/* Previously Created Items Section */}
              {hasProcessedBefore && previousRecipeItems.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-blue-600" />
                    <h4 className="font-medium text-sm">
                      Previously Created Items
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {previousRecipeItems.map((item, index) => (
                      <div
                        key={item.itemId}
                        className="p-3 bg-white dark:bg-gray-900 border rounded-md"
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => togglePreviousItem(index)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{item.itemName}</p>
                                <p className="text-xs text-muted-foreground">
                                  Current Stock: <span className="font-semibold text-blue-600">{item.currentStock} {item.uom}</span>
                                </p>
                              </div>
                              {item.selected && (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                            {item.selected && (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Add Quantity</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.newQuantity}
                                    onChange={(e) =>
                                      updatePreviousItemQuantity(index, e.target.value)
                                    }
                                    placeholder="0"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">New Stock</Label>
                                  <div className="flex items-center h-10 px-3 bg-blue-50 dark:bg-blue-950 border rounded-md">
                                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                      {item.currentStock + (parseFloat(item.newQuantity) || 0)} {item.uom}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                </div>
              )}

              {/* New Items Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">
                    {hasProcessedBefore ? "Add New Items" : "Create Finished Products"}
                  </h4>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addNewOutput}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {newOutputs.length === 0 && !hasProcessedBefore && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Add output items to specify what finished products will be created
                    </AlertDescription>
                  </Alert>
                )}

                {newOutputs.length > 0 && (
                  <div className="space-y-3">
                    {newOutputs.map((output, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white dark:bg-gray-900 border rounded-md space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">New Item {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeNewOutput(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Item</Label>
                            <Select
                              value={output.itemId}
                              onValueChange={(value) => updateNewOutput(index, "itemId", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {isLoadingItems ? (
                                  <div className="p-2 text-sm text-muted-foreground">
                                    Loading...
                                  </div>
                                ) : inventoryItems.length === 0 ? (
                                  <div className="p-2 text-sm text-muted-foreground">
                                    No finished products available
                                  </div>
                                ) : (
                                  inventoryItems.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.itemName}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Quantity</Label>
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={output.quantity || ""}
                                onChange={(e) =>
                                  updateNewOutput(index, "quantity", parseFloat(e.target.value) || 0)
                                }
                                placeholder="0"
                              />
                              <span className="flex items-center px-2 bg-muted rounded-md text-xs">
                                {output.uom || "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create New Finished Product Button */}
              {inventoryItems.length === 0 && !isLoadingItems && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                    No finished products found in category &quot;{poolItem.category}&quot;
                  </p>
                  <AddItemButton>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Finished Product
                  </AddItemButton>
                </div>
              )}
            </div>

            {/* Wastage & Cost */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wastagePercent">Wastage %</Label>
                <Input
                  id="wastagePercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={wastagePercent}
                  onChange={(e) => setWastagePercent(e.target.value)}
                  placeholder="0"
                />
                {inputQuantity && wastagePercent && (
                  <p className="text-xs text-muted-foreground">
                    Wastage: {calculateWastage()} {poolItem.uom}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="processingCost">Processing Cost (₹)</Label>
                <Input
                  id="processingCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={processingCost}
                  onChange={(e) => setProcessingCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this processing..."
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingRecipe || isLoadingItems}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Process"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
