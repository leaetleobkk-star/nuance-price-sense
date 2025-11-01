import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DailyPerformanceData {
  date: string;
  occupancy: number;
  revenue: number;
  adr: number;
  rooms_sold: number;
}

interface DailyPerformanceChartProps {
  data: DailyPerformanceData[];
  currency: string;
}

export function DailyPerformanceChart({ data, currency }: DailyPerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Performance</CardTitle>
          <CardDescription>No performance data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Occupancy & Revenue Performance</CardTitle>
        <CardDescription>Track daily metrics across the period</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Occupancy Chart */}
          <div>
            <h4 className="text-sm font-medium mb-4">Daily Occupancy %</h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  className="text-xs"
                />
                <YAxis 
                  tickFormatter={(value) => `${value}%`}
                  className="text-xs"
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Occupancy']}
                  labelFormatter={formatDate}
                />
                <Area 
                  type="monotone" 
                  dataKey="occupancy" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#occupancyGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Chart */}
          <div>
            <h4 className="text-sm font-medium mb-4">Daily Revenue ({currency})</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  className="text-xs"
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  className="text-xs"
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={formatDate}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--chart-2))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Combined ADR & Rooms Sold */}
          <div>
            <h4 className="text-sm font-medium mb-4">ADR & Rooms Sold</h4>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  className="text-xs"
                />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={(value) => formatCurrency(value)}
                  className="text-xs"
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  className="text-xs"
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'ADR') return [formatCurrency(value), name];
                    return [value, name];
                  }}
                  labelFormatter={formatDate}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="adr" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  name="ADR"
                  dot={false}
                />
                <Bar 
                  yAxisId="right"
                  dataKey="rooms_sold" 
                  fill="hsl(var(--chart-4))" 
                  name="Rooms Sold"
                  opacity={0.6}
                  radius={[4, 4, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}