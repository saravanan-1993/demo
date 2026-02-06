"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Eye } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";
import { format } from "date-fns";

interface ProcessingTransaction {
  id: string;
  transactionNumber: string;
  inputItemName: string;
  inputQuantity: number;
  inputUOM: string;
  outputs: Array<{
    itemName: string;
    quantity: number;
    uom: string;
  }>;
  wastageQuantity: number;
  wastagePercent: number;
  processingCost: number;
  processedAt: string;
  processedByName?: string;
  status: string;
}

export default function ProcessingHistory() {
  const [transactions, setTransactions] = useState<ProcessingTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/api/inventory/processing-transactions");
      
      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching processing history:", error);
      toast.error("Failed to load processing history");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <h3 className="text-lg font-semibold mb-2">No Processing History</h3>
          <p className="text-sm text-muted-foreground">
            Processing transactions will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <Card key={transaction.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{transaction.transactionNumber}</h3>
                  <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
                    {transaction.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {transaction.processedAt 
                    ? format(new Date(transaction.processedAt), "PPP") 
                    : "N/A"} •{" "}
                  {transaction.processedByName || "System"}
                </p>
              </div>
            
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Input */}
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-xs font-medium text-red-900 dark:text-red-100 mb-2">
                  INPUT
                </p>
                <p className="font-semibold">
                  {transaction.inputQuantity} {transaction.inputUOM}
                </p>
                <p className="text-sm text-muted-foreground">{transaction.inputItemName}</p>
              </div>

              {/* Outputs */}
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-2">
                  OUTPUTS ({transaction.outputs.length})
                </p>
                <div className="space-y-1">
                  {transaction.outputs.map((output, index) => (
                    <p key={index} className="text-sm">
                      {output.quantity} {output.uom} - {output.itemName}
                    </p>
                  ))}
                </div>
              </div>

              {/* Wastage & Cost */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-2">
                  WASTAGE & COST
                </p>
                <div className="space-y-1 text-sm">
                  <p>
                    Wastage: {transaction.wastageQuantity} {transaction.inputUOM} (
                    {transaction.wastagePercent}%)
                  </p>
                  <p>Processing Cost: ₹{transaction.processingCost.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
