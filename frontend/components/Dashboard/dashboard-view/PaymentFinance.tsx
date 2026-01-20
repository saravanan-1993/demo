"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, AlertCircle, RefreshCw, CreditCard, TrendingUp, BarChart3, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid, LineChart, Line, AreaChart, Area } from "recharts";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PaymentFinanceProps {
  data: {
    paymentSplit: {
      cod: number;
      prepaid: number;
      codAmount: number;
      prepaidAmount: number;
    };
    pendingCOD: number;
    failedPayments: number;
    refundsPending: number;
    outstandingBills?: number;
    monthlyData?: Array<{
      period: string;
      month: string;
      year: number;
      revenue: number;
      expenses: number;
      orders: number;
      tax: number;
      discount: number;
      netRevenue: number;
      profit: number;
    }>;
    summary?: {
      totalRevenue: number;
      totalTax: number;
      totalDiscount: number;
      netRevenue: number;
      totalExpenses: number;
      profit: number;
      profitMargin?: string;
    };
  };
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export function PaymentFinance({ data, dateRange }: PaymentFinanceProps) {
  const currencySymbol = useCurrency();
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('area');
  
  const monthlyData = data.monthlyData && data.monthlyData.length > 0 
    ? data.monthlyData.map(item => ({
        month: item.month,
        revenue: Math.round(item.revenue),
        expenses: Math.round(item.expenses),
        profit: Math.round(item.profit),
        netRevenue: Math.round(item.netRevenue),
      }))
    : [];

  const formatCurrency = (value: number) => {
    return `${currencySymbol}${value.toLocaleString(undefined, { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    })}`;
  };
  
  const getDateDescription = () => {
    if (!dateRange) return "Financial overview and trends";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    
    const toDate = new Date(dateRange.to);
    toDate.setHours(0, 0, 0, 0);
    
    if (fromDate.getTime() === today.getTime() && toDate.getTime() === today.getTime()) {
      return "Financial overview and trends";
    }
    
    if (format(dateRange.from, "yyyy-MM-dd") === format(dateRange.to, "yyyy-MM-dd")) {
      return `Payment data for ${format(dateRange.from, "MMM dd, yyyy")}`;
    }
    
    return `Payment data from ${format(dateRange.from, "MMM dd")} to ${format(dateRange.to, "MMM dd, yyyy")}`;
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-xs text-slate-600 dark:text-slate-400">
              <span style={{ color: entry.color }}>{entry.name}: </span>
              {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="lg:col-span-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Revenue & Finance Analytics
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">{getDateDescription()}</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('area')}
              className="h-8 w-8 p-0"
            >
              <Activity className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
              className="h-8 w-8 p-0"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
              className="h-8 w-8 p-0"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        {data.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Total Revenue</p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(data.summary.totalRevenue)}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">Net Revenue</p>
              <p className="text-lg font-bold text-green-900 dark:text-green-100">
                {formatCurrency(data.summary.netRevenue)}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-xs text-purple-700 dark:text-purple-400 font-medium mb-1">Profit</p>
              <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                {formatCurrency(data.summary.profit)}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-xs text-orange-700 dark:text-orange-400 font-medium mb-1">Profit Margin</p>
              <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                {data.summary.profitMargin || '0'}%
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        {monthlyData.length > 0 ? (
          <>
            {chartType === 'area' && (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    name="Revenue"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                    name="Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {chartType === 'bar' && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartType === 'line' && (
              <ResponsiveContainer width="100%" height={280}>      <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="Revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-slate-500 dark:text-slate-400">
            <div className="text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No revenue data available</p>
              <p className="text-xs mt-1">Data will appear once orders are processed</p>
            </div>
          </div>
        )}

       
      </CardContent>
    </Card>
  );
}
