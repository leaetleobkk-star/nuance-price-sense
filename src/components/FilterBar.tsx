import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, Filter, RefreshCw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterBarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  onExport?: () => void;
  scrapingProgress?: number;
}

export const FilterBar = ({ 
  onRefresh = () => {}, 
  isRefreshing = false,
  dateRange,
  onDateRangeChange = () => {},
  onExport = () => {},
  scrapingProgress = 0,
}: FilterBarProps) => {
  return (
    <div className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy")
                  )
                ) : (
                  "Select dates"
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={dateRange}
                onSelect={onDateRangeChange}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          
          <div className="h-6 w-px bg-border" />
          
          <Select defaultValue="2">
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 guest</SelectItem>
              <SelectItem value="2">2 guests</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <div className="relative">
            <Button 
              size="sm" 
              className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold shadow-lg"
              onClick={onRefresh} 
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? `Scraping... ${scrapingProgress}%` : "Refresh rates"}
            </Button>
            {isRefreshing && scrapingProgress > 0 && (
              <div className="absolute bottom-0 left-0 h-1 bg-yellow-600 rounded-full transition-all duration-300"
                style={{ width: `${scrapingProgress}%` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
