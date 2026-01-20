"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Activity, Package, DollarSign, ShoppingCart, AlertCircle, CheckCircle2 } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";

interface EODClosingProps {
  data: {
    dailyThroughput: number;
    totalCash: number;
    totalSales?: number;
    totalItems?: number;
    totalStockQuantity?: number;
    closingStockValue?: number;
    completedOrders?: number;
    totalOrders?: number;
    readyToClose: boolean;
    stockByStatus?: {
      inStock: number;
      lowStock: number;
      outOfStock: number;
      inStockQty: number;
      lowStockQty: number;
    };
  };
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export function EODClosing({ data, dateRange }: EODClosingProps) {
  const currencySymbol = useCurrency();
  
  // Helper to format currency or show dash
  const formatCurrency = (value: number | undefined) => {
    if (!value || value === 0) return "-";
    return `${currencySymbol}${value.toLocaleString()}`;
  };
  
  // Helper to format number or show dash
  const formatNumber = (value: number | undefined) => {
    if (value === undefined || value === 0) return "-";
    return value.toLocaleString();
  };
  
  // Generate date description
  const getDateDescription = () => {
    if (!dateRange) return "End of day performance snapshot";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    
    const toDate = new Date(dateRange.to);
    toDate.setHours(0, 0, 0, 0);
    
    if (fromDate.getTime() === today.getTime() && toDate.getTime() === today.getTime()) {
      return "End of day closing summary";
    }
    
    if (format(dateRange.from, "yyyy-MM-dd") === format(dateRange.to, "yyyy-MM-dd")) {
      return `Closing summary for ${format(dateRange.from, "MMM dd, yyyy")}`;
    }
    
    return `Period summary from ${format(dateRange.from, "MMM dd")} to ${format(dateRange.to, "MMM dd, yyyy")}`;
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          EOD Closing Summary
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">{getDateDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Sales Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                Total Sales
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(data.totalSales)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatNumber(data.completedOrders)} orders completed
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Cash Collected
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(data.totalCash)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatNumber(data.dailyThroughput)} items sold
              </p>
            </div>
          </div>
          
          <Separator className="bg-slate-200 dark:bg-slate-700" />
          
          {/* Closing Stock Summary */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Closing Stock</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Stock Value</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(data.closingStockValue)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {(data.totalStockQuantity || 0).toLocaleString()} units
                </p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Items</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {(data.totalItems || 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  unique products
                </p>
              </div>
            </div>
            
            {/* Stock Status Breakdown */}
            {data.stockByStatus && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-2 border border-teal-200 dark:border-teal-800">
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle2 className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                    <p className="text-xs font-medium text-teal-700 dark:text-teal-400">In Stock</p>
                  </div>
                  <p className="text-sm font-bold text-teal-900 dark:text-teal-300">
                    {data.stockByStatus.inStock}
                  </p>
                  <p className="text-xs text-teal-600 dark:text-teal-500">
                    {data.stockByStatus.inStockQty.toLocaleString()} units
                  </p>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-1 mb-1">
                    <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Low Stock</p>
                  </div>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
                    {data.stockByStatus.lowStock}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    {data.stockByStatus.lowStockQty.toLocaleString()} units
                  </p>
                </div>
                
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-1 mb-1">
                    <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                    <p className="text-xs font-medium text-red-700 dark:text-red-400">Out of Stock</p>
                  </div>
                  <p className="text-sm font-bold text-red-900 dark:text-red-300">
                    {data.stockByStatus.outOfStock}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500">
                    needs restock
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <Separator className="bg-slate-200 dark:bg-slate-700" />
          
          {/* Status Indicator */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                data.readyToClose ? 'bg-teal-600 animate-pulse' : 'bg-amber-500 animate-pulse'
              }`} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {data.readyToClose ? 'Ready to close - All reconciled' : 'Reconciliation in progress'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
