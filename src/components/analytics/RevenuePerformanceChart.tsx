import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const mockData = [
  { month: 'May 2025', revenue: 85000, sameTimeLY: 80000, lastYear: 95000, forecast: 88000, budget: 92000 },
  { month: 'Jun 2025', revenue: 78000, sameTimeLY: 75000, lastYear: 85000, forecast: 80000, budget: 88000 },
  { month: 'Jul 2025', revenue: 72000, sameTimeLY: 70000, lastYear: 78000, forecast: 75000, budget: 82000 },
  { month: 'Aug 2025', revenue: 71000, sameTimeLY: 68000, lastYear: 76000, forecast: 73000, budget: 80000 },
  { month: 'Sep 2025', revenue: 82000, sameTimeLY: 78000, lastYear: 88000, forecast: 85000, budget: 92000 },
  { month: 'Oct 2025', revenue: 88000, sameTimeLY: 85000, lastYear: 95000, forecast: 90000, budget: 98000 },
  { month: 'Nov 2025', revenue: 65000, sameTimeLY: null, lastYear: 95000, forecast: 92000, budget: 105000 },
  { month: 'Dec 2025', revenue: null, sameTimeLY: null, lastYear: 82000, forecast: 95000, budget: 108000 },
  { month: 'Jan 2026', revenue: null, sameTimeLY: null, lastYear: 98000, forecast: 102000, budget: 115000 },
  { month: 'Feb 2026', revenue: null, sameTimeLY: null, lastYear: 105000, forecast: 108000, budget: 118000 },
  { month: 'Mar 2026', revenue: null, sameTimeLY: null, lastYear: 112000, forecast: 98000, budget: 125000 },
  { month: 'Apr 2026', revenue: null, sameTimeLY: null, lastYear: 95000, forecast: 88000, budget: 110000 },
];

export const RevenuePerformanceChart = () => {
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
              <span className="text-sm text-muted-foreground">Haka House Auckland K'Road</span>
              <span className="text-sm font-medium text-destructive">-22.7%</span>
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
            <ComposedChart data={mockData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              <Bar dataKey="sameTimeLY" fill="hsl(var(--chart-2))" name="Same Time Last Year" />
              <Bar dataKey="lastYear" fill="hsl(var(--chart-3))" name="Last Year" />
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
