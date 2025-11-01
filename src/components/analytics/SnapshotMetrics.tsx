import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { biSupabase } from "@/integrations/bi-supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const mockOccupancyData = Array.from({ length: 31 }, (_, i) => ({
  date: `Oct ${String(i + 1).padStart(2, '0')}`,
  day: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'][i % 7],
  otb: 97 + Math.random() * 3,
  forecast: 97 + Math.random() * 2,
  lya: 77 + Math.random() * 3,
  sply: 50 + Math.random() * 2,
}));

const GaugeCard = ({ title, value, subtitle, budget, sply, lya }: any) => {
  const percentage = (parseFloat(value) / budget) * 100;
  
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
          <span className="text-2xl font-semibold">{value}</span>
        </div>
        
        <div className="relative h-24">
          <svg viewBox="0 0 200 100" className="w-full">
            <path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="20"
              strokeLinecap="round"
            />
            <path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke="hsl(var(--chart-2))"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 2.5} 1000`}
            />
            <text x="100" y="75" textAnchor="middle" className="text-xs fill-muted-foreground">
              {subtitle}
            </text>
          </svg>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium text-chart-5">{budget}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LYA</span>
              <span className="font-medium text-chart-3">{lya}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">SPLY</span>
              <span className="font-medium text-chart-1">{sply}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const SnapshotMetrics = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['bi-snapshot-metrics'],
    queryFn: async () => {
      const currentDate = new Date();
      const period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      const { data, error } = await biSupabase
        .from('lh_room_types')
        .select('revenue, occupancy, adr, revpar, room_type')
        .eq('property_id', 'property_1')
        .eq('period', period);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const totals = data.reduce((acc, row) => ({
        revenue: acc.revenue + (row.revenue || 0),
        occupancy: acc.occupancy + (row.occupancy || 0),
        adr: acc.adr + (row.adr || 0),
        revpar: acc.revpar + (row.revpar || 0),
        count: acc.count + 1,
      }), { revenue: 0, occupancy: 0, adr: 0, revpar: 0, count: 0 });

      return {
        occupancy: (totals.occupancy / totals.count).toFixed(1),
        adr: (totals.adr / totals.count).toFixed(1),
        revpar: (totals.revpar / totals.count).toFixed(1),
        revenue: totals.revenue.toFixed(0),
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Snapshot</h2>
          <p className="text-sm text-muted-foreground">Atlas Backpacker Hostel • {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select defaultValue="1week">
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1week">1 Week Ago</SelectItem>
              <SelectItem value="2weeks">2 Weeks Ago</SelectItem>
              <SelectItem value="1month">1 Month Ago</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="rev">
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rev">Mix Analysis: REV</SelectItem>
              <SelectItem value="occ">Mix Analysis: OCC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Revenue vs Budget Gauge */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium">Revenue vs Budget</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GaugeCard
            title="Occupancy"
            value={`${metrics?.occupancy || 0}%`}
            subtitle="Occupancy Rate"
            budget={parseFloat(metrics?.occupancy || '0') * 1.05}
            sply={parseFloat(metrics?.occupancy || '0') * 0.95}
            lya={parseFloat(metrics?.occupancy || '0') * 0.93}
          />
          <GaugeCard
            title="ADR"
            value={`$${metrics?.adr || 0}`}
            subtitle="Average Daily Rate"
            budget={parseFloat(metrics?.adr || '0') * 1.05}
            sply={parseFloat(metrics?.adr || '0') * 0.92}
            lya={parseFloat(metrics?.adr || '0') * 0.90}
          />
          <GaugeCard
            title="RevPAR"
            value={`$${metrics?.revpar || 0}`}
            subtitle="Revenue per Available Room"
            budget={parseFloat(metrics?.revpar || '0') * 1.05}
            sply={parseFloat(metrics?.revpar || '0') * 0.88}
            lya={parseFloat(metrics?.revpar || '0') * 0.85}
          />
          <GaugeCard
            title="Revenue"
            value={`$${parseInt(metrics?.revenue || '0').toLocaleString()}`}
            subtitle="Total Revenue"
            budget={parseInt(metrics?.revenue || '0') * 1.05}
            sply={parseInt(metrics?.revenue || '0') * 0.88}
            lya={parseInt(metrics?.revenue || '0') * 0.85}
          />
        </div>
      </Card>

      {/* Occupancy Chart */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Tabs defaultValue="occupancy">
              <TabsList>
                <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
                <TabsTrigger value="avgrate">Average Rate</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="macro">Macro Segment</TabsTrigger>
                <TabsTrigger value="segment">Segment</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={mockOccupancyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date"
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  className="text-xs"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value: any) => `${value.toFixed(1)}%`}
                />
                <Legend />
                <Bar dataKey="otb" fill="hsl(var(--chart-2))" name="OTB" />
                <Line 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke="hsl(var(--chart-4))" 
                  strokeWidth={2}
                  name="Forecast"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="lya" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  name="LYA"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="sply" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  name="SPLY"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  );
};
