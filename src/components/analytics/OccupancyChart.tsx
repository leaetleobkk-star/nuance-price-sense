import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OccupancyChartProps {
  data?: {
    trend_data: Array<{
      period: string;
      revenue: number;
      occupancy: number;
      adr: number;
      nights: number;
    }>;
  };
}

export const OccupancyChart = ({ data }: OccupancyChartProps) => {
  if (!data || !data.trend_data || data.trend_data.length === 0) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Weekly Occupancy & Rate Trends</h3>
            <p className="text-sm text-muted-foreground">7-day rolling average</p>
          </div>
          <p className="text-center text-muted-foreground py-8">
            No occupancy data available. Please refresh data from Little Hotelier.
          </p>
        </div>
      </Card>
    );
  }

  const chartData = data.trend_data.map(item => ({
    date: new Date(item.period + '-01').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    occupancy: item.occupancy,
    avgRate: item.adr,
  }));

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Weekly Occupancy & Rate Trends</h3>
          <p className="text-sm text-muted-foreground">7-day rolling average</p>
        </div>
        
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
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
