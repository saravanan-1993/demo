"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { format } from "date-fns";

interface TopProductsProps {
  data: {
    topItems: Array<{ name: string; quantity: number; revenue: number }>;
  };
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export function TopProducts({ data, dateRange }: TopProductsProps) {
  const chartData = data.topItems.length > 0 
    ? data.topItems.slice(0, 5).map((item) => ({
        name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
        value: item.quantity,
        revenue: item.revenue,
      }))
    : [];
  
  const getDateDescription = () => {
    if (!dateRange) return "Best selling products";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    
    const toDate = new Date(dateRange.to);
    toDate.setHours(0, 0, 0, 0);
    
    if (fromDate.getTime() === today.getTime() && toDate.getTime() === today.getTime()) {
      return "Best selling products";
    }
    
    if (format(dateRange.from, "yyyy-MM-dd") === format(dateRange.to, "yyyy-MM-dd")) {
      return `Top products on ${format(dateRange.from, "MMM dd, yyyy")}`;
    }
    
    return `Top products from ${format(dateRange.from, "MMM dd")} to ${format(dateRange.to, "MMM dd, yyyy")}`;
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { name: string; value: number; revenue: number } }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{payload[0].payload.name}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Quantity: {payload[0].value}</p>
          {payload[0].payload.revenue > 0 && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Revenue: ₹{payload[0].payload.revenue.toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Top Products
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">{getDateDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                fill="#10b981" 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8">
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              No product data available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
