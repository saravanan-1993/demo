"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, AlertCircle, CheckCircle, Truck, Box, XCircle, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface OrderOperationsProps {
  data: {
    pending: number;
    confirmed: number;
    packing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    completed: number;
  };
  dateRange?: {
    from: Date;
    to: Date;
  };
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  [key: string]: string | number | React.ComponentType<{ className?: string }>;
}

export function OrderOperations({ data, dateRange }: OrderOperationsProps) {
  const [viewType, setViewType] = useState<'donut' | 'bars'>('donut');

  const operations = [
    { label: "Pending", value: data.pending, icon: AlertCircle, color: "#f59e0b", bgColor: "bg-yellow-500/10", textColor: "text-yellow-700 dark:text-yellow-400" },
    { label: "Confirmed", value: data.confirmed, icon: CheckCircle, color: "#3b82f6", bgColor: "bg-blue-500/10", textColor: "text-blue-700 dark:text-blue-400" },
    { label: "Packing", value: data.packing, icon: Package, color: "#8b5cf6", bgColor: "bg-purple-500/10", textColor: "text-purple-700 dark:text-purple-400" },
    { label: "Shipped", value: data.shipped, icon: Truck, color: "#06b6d4", bgColor: "bg-cyan-500/10", textColor: "text-cyan-700 dark:text-cyan-400" },
    { label: "Delivered", value: data.delivered, icon: Box, color: "#10b981", bgColor: "bg-green-500/10", textColor: "text-green-700 dark:text-green-400" },
    { label: "Completed", value: data.completed, icon: CheckCircle, color: "#14b8a6", bgColor: "bg-teal-500/10", textColor: "text-teal-700 dark:text-teal-400" },
    { label: "Cancelled", value: data.cancelled, icon: XCircle, color: "#ef4444", bgColor: "bg-red-500/10", textColor: "text-red-700 dark:text-red-400" },
  ];

  const chartData: ChartDataItem[] = operations
    .filter(op => op.value > 0)
    .map(op => ({
      name: op.label,
      value: op.value,
      color: op.color,
      icon: op.icon,
    }));

  const total = operations.reduce((sum, op) => sum + op.value, 0);
  
  const getDateDescription = () => {
    if (!dateRange) return "Last 7 days order status breakdown";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    
    const toDate = new Date(dateRange.to);
    toDate.setHours(0, 0, 0, 0);
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 6);
    lastWeek.setHours(0, 0, 0, 0);
    
    if (fromDate.getTime() === lastWeek.getTime() && 
        toDate.getDate() === new Date().getDate()) {
      return "Last 7 days order status breakdown";
    }
    
    if (fromDate.getTime() === today.getTime() && toDate.getTime() === today.getTime()) {
      return "Current order status breakdown";
    }
    
    if (format(dateRange.from, "yyyy-MM-dd") === format(dateRange.to, "yyyy-MM-dd")) {
      return `Orders on ${format(dateRange.from, "MMM dd, yyyy")}`;
    }
    
    return `Orders from ${format(dateRange.from, "MMM dd")} to ${format(dateRange.to, "MMM dd, yyyy")}`;
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: ChartDataItem }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{data.name}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Count: {data.value}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Percentage: {percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-xl backdrop-blur-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                  <Package className="w-5 h-5 text-white" />
                </div>
                Order Operations
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
                variant={viewType === 'bars' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('bars')}
                className="h-8 w-8 p-0"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          {viewType === 'donut' ? (
            <>
              {/* Donut Chart */}
              {chartData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Legend with Icons */}
                  {/* <div className="grid grid-cols-2 gap-3 w-full mt-4">
                    {operations.map((op, index) => {
                      const Icon = op.icon;
                      const percentage = total > 0 ? (op.value / total) * 100 : 0;
                      
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: 0.1 * index }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                        >
                          <div className={`p-1.5 rounded ${op.bgColor}`}>
                            <Icon className={`h-3 w-3 ${op.textColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{op.label}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {op.value} ({percentage.toFixed(1)}%)
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div> */}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                  <div className="text-center">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No order data available</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Progress Bars View */}
              {operations.map((op, index) => {
                const Icon = op.icon;
                const percentage = total > 0 ? (op.value / total) * 100 : 0;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className="space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className={`p-2 rounded-lg ${op.bgColor}`}
                        >
                          <Icon className={`h-4 w-4 ${op.textColor}`} />
                        </motion.div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{op.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{op.value}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-500">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="relative h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.1, ease: "easeOut" }}
                        className="h-full rounded-full relative overflow-hidden"
                        style={{ backgroundColor: op.color }}
                      >
                        <motion.div
                          animate={{
                            x: ['-100%', '100%'],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
