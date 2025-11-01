import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RevenuePerformanceChartProps {
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

export const RevenuePerformanceChart = ({ data }: RevenuePerformanceChartProps) => {
  if (!data) return null;

  const chartData = data.trend_data.map(item => ({
    month: new Date(item.period + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    revenue: item.revenue,
    budget: item.revenue * 1.1,
  }));

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
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
          *Budget values represent Overnight Accommodation Revenue only.
        </p>
      </div>
    </Card>
  );
};
