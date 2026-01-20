"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/ui/loading";
import { dashboardService } from "@/services/dashboard/dashboardService";
import type { DashboardData } from "@/types/dashboard";
import { KPICards } from "./KPICards";
import { OrderOperations } from "./OrderOperations";
import { SalesAnalytics } from "./SalesAnalytics";
import { TopProducts } from "./TopProducts";
import { DeliveryPerformance } from "./DeliveryPerformance";
import { PaymentFinance } from "./PaymentFinance";
import { WarehouseAlerts } from "./WarehouseAlerts";
import { EODClosing } from "./EODClosing";
import { toast } from "sonner";
import { AdvancedDateRangePicker } from "@/components/ui/advanced-date-range-picker";
import { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { isLoading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Default to today
  const getDefaultDateRange = (): DateRange => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();
    
    // Create dates in local timezone
    const todayStart = new Date(year, month, date, 0, 0, 0, 0);
    const todayEnd = new Date(year, month, date, 23, 59, 59, 999);
    
    return {
      from: todayStart,
      to: todayEnd
    };
  };
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange());

  // Normalized date range for components (ensures both from and to are defined)
  const normalizedDateRange = dateRange?.from && dateRange?.to 
    ? { from: dateRange.from, to: dateRange.to }
    : undefined;

  // Initial load
  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data when date range changes
  useEffect(() => {
    // Skip initial mount
    if (dashboardData !== null) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      let startDate: string | undefined;
      let endDate: string | undefined;
      
      // Always use the current dateRange state
      if (dateRange?.from && dateRange?.to) {
        // Format dates in local timezone (YYYY-MM-DD)
        const formatLocalDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        startDate = formatLocalDate(dateRange.from);
        endDate = formatLocalDate(dateRange.to);
      }
      
      console.log('📅 Loading dashboard data:', { startDate, endDate });
      
      const data = await dashboardService.getDashboardData(startDate, endDate);
      setDashboardData(data);
      
      // Show success toast only on manual refresh
      if (dashboardData !== null) {
        toast.success('Dashboard data refreshed');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    // Only update if both dates are selected (complete range)
    if (range?.from && range?.to) {
      setDateRange(range);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  if (authLoading) {
    return <Loading message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen w-full p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Dashboard Header with Date Range Picker */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
            <Badge variant="outline" className="bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800">
              Live
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <AdvancedDateRangePicker
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
              className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Dashboard Content - Only this section updates */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-slate-600 dark:text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">
                Loading dashboard data...
              </span>
            </div>
          </div>
        ) : !dashboardData ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-muted-foreground">No dashboard data available</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <KPICards data={dashboardData.kpiCards} dateRange={normalizedDateRange} />

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Order Operations */}
              <OrderOperations data={dashboardData.orderOperations} dateRange={normalizedDateRange} />

              {/* Sales Analytics */}
              <SalesAnalytics data={dashboardData.dailyInsights} dateRange={normalizedDateRange} />

              {/* Delivery Performance */}
              <DeliveryPerformance data={dashboardData.deliveryPerformance} dateRange={normalizedDateRange} />
            </div>

            {/* Top Products - Full Width */}
            <TopProducts data={dashboardData.dailyInsights} dateRange={normalizedDateRange} />

            {/* Finance and Alerts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Payment & Finance */}
              <PaymentFinance data={dashboardData.paymentFinance} dateRange={normalizedDateRange} />

              {/* Warehouse Alerts */}
              <WarehouseAlerts data={dashboardData.warehouseAlerts} dateRange={normalizedDateRange} />

              {/* EOD Closing */}
              <EODClosing data={dashboardData.eodClosing} dateRange={normalizedDateRange} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
