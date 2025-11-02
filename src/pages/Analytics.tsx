import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useQuery } from "@tanstack/react-query";
import { biSupabase } from "@/integrations/bi-supabase/client";
import { KPICards } from "@/components/analytics/KPICards";
import { RevenuePerformanceChart } from "@/components/analytics/RevenuePerformanceChart";
import { SnapshotMetrics } from "@/components/analytics/SnapshotMetrics";
import { OccupancyChart } from "@/components/analytics/OccupancyChart";
import { RoomTypeTable } from "@/components/analytics/RoomTypeTable";
import { ChannelMixChart } from "@/components/analytics/ChannelMixChart";
import { DailyPerformanceChart } from "@/components/analytics/DailyPerformanceChart";
import { WeeklyPickupComparison } from "@/components/analytics/WeeklyPickupComparison";
import { useCompleteAnalytics } from "@/hooks/useCompleteAnalytics";
import { useDailyPerformance, useWeeklyPickup } from "@/hooks/usePropertyAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshLHData } from "@/components/RefreshLHData";
import { supabase } from "@/integrations/supabase/client";

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2025, 4, 1),
    to: new Date(2026, 3, 30),
  });
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  // Fetch properties from Lovable database with currency
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, pms_type, currency')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!selectedProperty && properties && properties.length > 0) {
      setSelectedProperty(properties[0].id);
    }
  }, [properties, selectedProperty]);

  // Fetch all dashboard data with date range
  const { data: dashboardData, isLoading } = useCompleteAnalytics(
    selectedProperty, 
    selectedPeriod, 
    dateRange?.from, 
    dateRange?.to
  );
  const { data: dailyPerformanceData } = useDailyPerformance(
    selectedProperty, 
    dateRange?.from, 
    dateRange?.to
  );
  const { data: weeklyPickupData } = useWeeklyPickup(
    selectedProperty, 
    dateRange?.from, 
    dateRange?.to
  );

  // Get current property currency
  const currentProperty = properties?.find(p => p.id === selectedProperty);
  const currency = currentProperty?.currency || 'USD';

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
              
              <Select value={selectedProperty || ""} onValueChange={setSelectedProperty}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  {properties?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {selectedProperty && properties?.find(p => p.id === selectedProperty)?.pms_type === 'little-hotelier' && (
          <div className="mb-6">
            <RefreshLHData propertyId={selectedProperty} />
          </div>
        )}
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
              <TabsTrigger value="pickup">Pickup Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <KPICards data={dashboardData?.summary} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RevenuePerformanceChart data={dashboardData?.monthly_trend} />
                <ChannelMixChart data={dashboardData?.channels} />
              </div>
              <OccupancyChart data={dashboardData?.monthly_trend} />
              <RoomTypeTable data={dashboardData?.room_types} />
            </TabsContent>

            <TabsContent value="snapshot" className="space-y-6">
              <SnapshotMetrics data={dashboardData} />
              <DailyPerformanceChart 
                data={dailyPerformanceData || []} 
                currency={currency}
              />
            </TabsContent>

            <TabsContent value="pickup" className="space-y-6">
              <WeeklyPickupComparison 
                data={weeklyPickupData} 
                currency={currency}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
