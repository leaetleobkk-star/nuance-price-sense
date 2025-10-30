import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { KPICards } from "@/components/analytics/KPICards";
import { RevenuePerformanceChart } from "@/components/analytics/RevenuePerformanceChart";
import { SnapshotMetrics } from "@/components/analytics/SnapshotMetrics";
import { PickupAnalysis } from "@/components/analytics/PickupAnalysis";
import { OccupancyChart } from "@/components/analytics/OccupancyChart";
import { PriceOptimization } from "@/components/analytics/PriceOptimization";

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2025, 4, 1), // May 1, 2025
    to: new Date(2026, 3, 30), // Apr 30, 2026
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Portfolio Analytics</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Business intelligence and performance insights
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd MMM yyyy")} - {format(dateRange.to, "dd MMM yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd MMM yyyy")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  <SelectItem value="property1">Property 1</SelectItem>
                  <SelectItem value="property2">Property 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
            <TabsTrigger value="pickup">Pickup Analysis</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <KPICards />
            <RevenuePerformanceChart />
            <OccupancyChart />
          </TabsContent>

          <TabsContent value="snapshot" className="space-y-6">
            <SnapshotMetrics />
          </TabsContent>

          <TabsContent value="pickup" className="space-y-6">
            <PickupAnalysis />
          </TabsContent>

          <TabsContent value="optimization" className="space-y-6">
            <PriceOptimization />
          </TabsContent>

          <TabsContent value="forecast" className="space-y-6">
            <Card className="p-6">
              <p className="text-muted-foreground text-center py-12">
                Forecast analytics will be integrated with Power BI
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
