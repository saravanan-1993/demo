"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Truck, Clock, Users, Package, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DeliveryPerformanceProps {
  data: {
    avgDeliveryTime: number;
    activeRiders: number;
    totalDeliveries: number;
    failedAttempts: number;
    pending?: number;
    assigned?: number;
    pickedUp?: number;
    inTransit?: number;
    delivered?: number;
  };
  dateRange?: {
    from: Date;
    to: Date;
  };
}

interface StatusDataItem {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface DeliveryDataItem {
  name: string;
  value: number;
  [key: string]: string | number;
}

export function DeliveryPerformance({ data, dateRange }: DeliveryPerformanceProps) {
  const [viewType, setViewType] = useState<'donut' | 'bar'>('donut');
  
  const deliveryData: DeliveryDataItem[] = [
    { name: "On Time", value: data.totalDeliveries - data.failedAttempts },
    { name: "Failed", value: data.failedAttempts },
  ];
  
  const statusData: StatusDataItem[] = [
    { name: "Pending", value: data.pending || 0, color: "#f59e0b" },
    { name: "Assigned", value: data.assigned || 0, color: "#3b82f6" },
    { name: "Picked Up", value: data.pickedUp || 0, color: "#8b5cf6" },
    { name: "In Transit", value: data.inTransit || 0, color: "#06b6d4" },
    { name: "Delivered", value: data.delivered || 0, color: "#10b981" },
  ].filter(item => item.value > 0);

  const COLORS = ["#10b981", "#ef4444"];
  
  const getDateDescription = () => {
    if (!dateRange) return "Real-time delivery metrics";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    
    const toDate = new Date(dateRange.to);
    toDate.setHours(0, 0, 0, 0);
    
    if (fromDate.getTime() === today.getTime() && toDate.getTime() === today.getTime()) {
      return "Real-time delivery metrics";
    }
    
    if (format(dateRange.from, "yyyy-MM-dd") === format(dateRange.to, "yyyy-MM-dd")) {
      return `Delivery metrics for ${format(dateRange.from, "MMM dd, yyyy")}`;
    }
    
    return `Delivery metrics from ${format(dateRange.from, "MMM dd")} to ${format(dateRange.to, "MMM dd, yyyy")}`;
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{payload[0].name}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Count: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  const chartData = statusData.length > 0 ? statusData : deliveryData;
  const useStatusColors = statusData.length > 0;

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Delivery Performance
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">{getDateDescription()}</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant={viewType === 'donut' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('donut')}
              className="h-8 w-8 p-0"
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('bar')}
              className="h-8 w-8 p-0"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart */}
          {viewType === 'donut' ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={useStatusColors ? (entry as StatusDataItem).color : COLORS[index]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis 
                  dataKey="name" 
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
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={useStatusColors ? (entry as StatusDataItem).color : COLORS[index]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Avg Time</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{data.avgDeliveryTime} min</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Active Riders</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{data.activeRiders}</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{data.totalDeliveries}</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Failed</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{data.failedAttempts}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
