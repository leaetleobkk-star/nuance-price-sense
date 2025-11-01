import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { biSupabase } from "@/integrations/bi-supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export const OccupancyChart = () => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['bi-occupancy-trend'],
    queryFn: async () => {
      const { data, error } = await biSupabase
        .from('lh_room_types')
        .select('period, occupancy, adr, room_type')
        .eq('property_id', 'property_1')
        .order('period');

      if (error) throw error;

      // Group by period
      const periodMap = new Map();
      data.forEach(row => {
        const key = row.period;
        const existing = periodMap.get(key) || { occupancy: 0, adr: 0, count: 0 };
        periodMap.set(key, {
          occupancy: existing.occupancy + (row.occupancy || 0),
          adr: existing.adr + (row.adr || 0),
          count: existing.count + 1,
        });
      });

      return Array.from(periodMap.entries())
        .map(([period, data]) => ({
          date: new Date(period + '-01').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          occupancy: data.occupancy / data.count,
          avgRate: data.adr / data.count,
        }))
        .slice(-12);
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-[350px] w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Weekly Occupancy & Rate Trends</h3>
          <p className="text-sm text-muted-foreground">7-day rolling average</p>
        </div>
        
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date"
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                yAxisId="left"
                className="text-xs"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                className="text-xs"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'Occupancy %') return `${value}%`;
                  return `$${value.toFixed(2)}`;
                }}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="occupancy" 
                fill="hsl(var(--chart-2))" 
                name="Occupancy %"
              />
              <Bar 
                yAxisId="right"
                dataKey="avgRate" 
                fill="hsl(var(--chart-4))" 
                name="Avg Rate"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};
