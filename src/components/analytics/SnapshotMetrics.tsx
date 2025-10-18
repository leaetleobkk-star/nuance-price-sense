import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';

const mockOccupancyData = Array.from({ length: 31 }, (_, i) => ({
  date: `Oct ${String(i + 1).padStart(2, '0')}`,
  day: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'][i % 7],
  otb: 97 + Math.random() * 3,
  forecast: 97 + Math.random() * 2,
  lya: 77 + Math.random() * 3,
  sply: 50 + Math.random() * 2,
}));

const GaugeCard = ({ title, value, subtitle, forecast, budget, sply, lya }: any) => {
  const percentage = (value / forecast) * 100;
  
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
              <span className="text-muted-foreground">Forecast</span>
              <span className="font-medium text-chart-4">{forecast}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SPLY</span>
              <span className="font-medium text-chart-1">{sply}</span>
            </div>
          </div>
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
        </div>
      </div>
    </Card>
  );
};

export const SnapshotMetrics = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Snapshot</h2>
          <p className="text-sm text-muted-foreground">Campus Perth • Oct 2025</p>
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
          <h3 className="text-sm font-medium">Revenue vs Budget & Forecast</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GaugeCard
            title="Occupancy"
            value="98.0%"
            subtitle="1,740,853"
            forecast={97.2}
            budget={95.8}
            sply={77.0}
            lya={77.3}
          />
          <GaugeCard
            title="ADR"
            value="62.6"
            subtitle="NZ$"
            forecast={63.1}
            budget={59.0}
            sply={50.4}
            lya={50.7}
          />
          <GaugeCard
            title="RevPAR"
            value="61.3"
            subtitle="NZ$"
            forecast={61.4}
            budget={56.5}
            sply={38.8}
            lya={39.2}
          />
          <GaugeCard
            title="Revenue"
            value="1,740,853"
            subtitle="NZ$"
            forecast={1742411}
            budget={1605376}
            sply={1102851}
            lya={1113474}
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
