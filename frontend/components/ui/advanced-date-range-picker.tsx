"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DateRangeOption = "today" | "last_week" | "last_month" | "last_3_months" | "last_6_months" | "last_year" | "custom";

interface AdvancedDateRangePickerProps {
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  className?: string;
}

const getDateRangeFromOption = (option: DateRangeOption): DateRange | null => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  
  switch (option) {
    case "today": {
      const todayStart = new Date(year, month, date, 0, 0, 0, 0);
      const todayEnd = new Date(year, month, date, 23, 59, 59, 999);
      return { from: todayStart, to: todayEnd };
    }
    case "last_week": {
      const weekStart = new Date(year, month, date - 6, 0, 0, 0, 0);
      const weekEnd = new Date(year, month, date, 23, 59, 59, 999);
      return { from: weekStart, to: weekEnd };
    }
    case "last_month": {
      const monthStart = new Date(year, month - 1, date, 0, 0, 0, 0);
      const monthEnd = new Date(year, month, date, 23, 59, 59, 999);
      return { from: monthStart, to: monthEnd };
    }
    case "last_3_months": {
      const threeMonthsStart = new Date(year, month - 3, date, 0, 0, 0, 0);
      const threeMonthsEnd = new Date(year, month, date, 23, 59, 59, 999);
      return { from: threeMonthsStart, to: threeMonthsEnd };
    }
    case "last_6_months": {
      const sixMonthsStart = new Date(year, month - 6, date, 0, 0, 0, 0);
      const sixMonthsEnd = new Date(year, month, date, 23, 59, 59, 999);
      return { from: sixMonthsStart, to: sixMonthsEnd };
    }
    case "last_year": {
      const yearStart = new Date(year - 1, month, date, 0, 0, 0, 0);
      const yearEnd = new Date(year, month, date, 23, 59, 59, 999);
      return { from: yearStart, to: yearEnd };
    }
    case "custom":
      return null;
    default:
      return null;
  }
};

export function AdvancedDateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: AdvancedDateRangePickerProps) {
  const [selectedOption, setSelectedOption] = React.useState<DateRangeOption>("today");
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const handleOptionChange = (option: DateRangeOption) => {
    setSelectedOption(option);
    
    if (option === "custom") {
      // Open calendar for custom selection
      setTimeout(() => setIsCalendarOpen(true), 100);
    } else {
      // Apply preset range
      const range = getDateRangeFromOption(option);
      if (range) {
        onDateRangeChange?.(range);
      }
      setIsCalendarOpen(false);
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    // Update the date range immediately
    onDateRangeChange?.(range);
    
    // Set to custom mode when user selects dates
    if (range?.from || range?.to) {
      setSelectedOption("custom");
    }
    
    // Don't auto-close - let user close manually
  };

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return "Select date range";
    if (!range.to) return format(range.from, "MMM dd, yyyy");
    return `${format(range.from, "MMM dd")} - ${format(range.to, "MMM dd, yyyy")}`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={selectedOption} onValueChange={handleOptionChange}>
        <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <SelectValue placeholder="Quick Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="last_week">Last Week</SelectItem>
          <SelectItem value="last_month">Last Month</SelectItem>
          <SelectItem value="last_3_months">Last 3 Months</SelectItem>
          <SelectItem value="last_6_months">Last 6 Months</SelectItem>
          <SelectItem value="last_year">Last Year</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            onClick={() => setIsCalendarOpen(true)}
            className={cn(
              "w-[280px] justify-start text-left font-normal bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(dateRange)}
            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
