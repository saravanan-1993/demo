"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { format, parseISO } from "date-fns";

interface SalesAnalyticsProps {
  data: {
    topCategories: Array<{ name: string; sales: number; revenue: number }>;
    topItems: Array<{ name: string; quantity: number; revenue: number }>;
    peakHours: Array<{ hour: string; orders: number }>;
    salesTimeSeries?: Array<{
      date: string;
      sales: number;
      revenue: number;
      orders: number;
    }>;
  };
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export function SalesAnalytics({ data, dateRange }: SalesAnalyticsProps) {
  // Use actual sales time series data from backend
  const chartData = data.salesTimeSeries && data.salesTimeSeries.length > 0
    ? data.salesTimeSeries.map((item) => {
        // Format date for display
        let displayDate: string;
        if (item.date.includes('-') && item.date.split('-').length === 3) {
          // Daily format: YYYY-MM-DD -> MMM dd
          displayDate = format(parseISO(item.date), 'MMM dd');
        } else {
          // Monthly format: YYYY-MM -> MMM
          const [year, month] = item.date.split('-');
          displayDate = format(new Date(parseInt(year), parseInt(month) - 1), 'MMM');
        }
        
        return {
          month: displayDate,
          sales: item.sales,
          revenue: item.revenue,
          orders: item.orders,
        };
      })
    : [];
  
  const getDateDescription = () => {
    if (!dateRange) return "Sales performance over time";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    
    const toDate = new Date(dateRange.to);
    toDate.setHours(0, 0, 0, 0);
    
    if (fromDate.getTime() === today.getTime() && toDate.getTime() === today.getTime()) {
      return "Today's sales performance";
    }
    
    if (format(dateRange.from, "yyyy-MM-dd") === format(dateRange.to, "yyyy-MM-dd")) {
      return `Sales on ${format(dateRange.from, "MMM dd, yyyy")}`;
    }
    
    return `Sales from ${format(dateRange.from, "MMM dd")} to ${format(dateRange.to, "MMM dd, yyyy")}`;
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { month: string; sales: number; revenue: number; orders: number } }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{payload[0].payload.month}</p>
          <p className="text-xs text-purple-600 dark:text-purple-400">Items Sold: {payload[0].value.toLocaleString()}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Orders: {payload[0].payload.orders}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Revenue: ₹{payload[0].payload.revenue.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Sales Analytics
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">{getDateDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="sales" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 6, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8">
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              No sales data available for the selected period
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
