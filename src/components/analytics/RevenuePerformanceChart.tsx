import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { biSupabase } from "@/integrations/bi-supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export const RevenuePerformanceChart = () => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['bi-revenue-trend'],
    queryFn: async () => {
      const { data, error } = await biSupabase
        .from('lh_room_types')
        .select('period, revenue, room_type')
        .eq('property_id', 'property_1')
        .order('period');

      if (error) throw error;

      // Group by period and sum revenue
      const periodMap = new Map();
      data.forEach(row => {
        const existing = periodMap.get(row.period) || 0;
        periodMap.set(row.period, existing + (row.revenue || 0));
      });

      // Convert to chart format
      return Array.from(periodMap.entries())
        .map(([period, revenue]) => ({
          month: new Date(period + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue,
          forecast: revenue * 1.05, // Mock forecast
          budget: revenue * 1.1, // Mock budget
        }))
        .slice(-12); // Last 12 months
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-[400px] w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Revenue</h3>
              <span className="text-sm text-muted-foreground">Performance by Property</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Atlas Backpacker Hostel</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs defaultValue="month">
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
                <TabsTrigger value="date">Date</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Select defaultValue="nz150k">
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nz150k">NZ$150K</SelectItem>
                <SelectItem value="nz100k">NZ$100K</SelectItem>
                <SelectItem value="nz50k">NZ$50K</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Revenue" />
              <Line
                type="monotone" 
                dataKey="forecast" 
                stroke="hsl(var(--chart-4))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="AI Forecast"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="budget" 
                stroke="hsl(var(--chart-5))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Budget"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          *Budget & Forecast values represent Overnight Accommodation Revenue only.
        </p>
      </div>
    </Card>
  );
};
