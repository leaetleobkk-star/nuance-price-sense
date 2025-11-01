import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface WeeklyPickupData {
  this_week: {
    revenue: number;
    reservations: number;
    nights: number;
    occupancy: number;
    adr: number;
  };
  last_week: {
    revenue: number;
    reservations: number;
    nights: number;
    occupancy: number;
    adr: number;
  };
}

interface WeeklyPickupComparisonProps {
  data: WeeklyPickupData | null;
  currency: string;
}

export function WeeklyPickupComparison({ data, currency }: WeeklyPickupComparisonProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Pickup Analysis</CardTitle>
          <CardDescription>No pickup data available</CardDescription>
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

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const renderChangeIndicator = (current: number, previous: number, isPercentage = false) => {
    const change = calculateChange(current, previous);
    const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
    const colorClass = change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-muted-foreground";

    return (
      <div className={`flex items-center gap-1 text-sm ${colorClass}`}>
        <Icon className="h-4 w-4" />
        <span>{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  const metrics = [
    {
      label: "Revenue",
      thisWeek: data.this_week.revenue,
      lastWeek: data.last_week.revenue,
      format: formatCurrency,
    },
    {
      label: "Reservations",
      thisWeek: data.this_week.reservations,
      lastWeek: data.last_week.reservations,
      format: (val: number) => val.toString(),
    },
    {
      label: "Nights",
      thisWeek: data.this_week.nights,
      lastWeek: data.last_week.nights,
      format: (val: number) => val.toString(),
    },
    {
      label: "Occupancy",
      thisWeek: data.this_week.occupancy,
      lastWeek: data.last_week.occupancy,
      format: (val: number) => `${val.toFixed(1)}%`,
    },
    {
      label: "ADR",
      thisWeek: data.this_week.adr,
      lastWeek: data.last_week.adr,
      format: formatCurrency,
    },
  ];

  const chartData = metrics.map(metric => ({
    name: metric.label,
    "This Week": metric.thisWeek,
    "Last Week": metric.lastWeek,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Pickup Analysis</CardTitle>
        <CardDescription>Compare this week vs last week performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="bg-muted/50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <div className="space-y-1">
                    <p className="text-lg font-bold">{metric.format(metric.thisWeek)}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">vs {metric.format(metric.lastWeek)}</p>
                      {renderChangeIndicator(metric.thisWeek, metric.lastWeek)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comparison Chart */}
        <div>
          <h4 className="text-sm font-medium mb-4">Week-over-Week Comparison</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="This Week" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Last Week" fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}