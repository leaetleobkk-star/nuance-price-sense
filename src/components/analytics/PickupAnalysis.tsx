import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

const mockPickupData = Array.from({ length: 14 }, (_, i) => {
  const date = new Date(2025, 6, 28 + i); // Starting July 28
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
    createdUnits: 400 + Math.random() * 400,
    unitPickup: 600 + Math.random() * 200,
    updatedUnits: 0,
    cancelledUnits: -100 - Math.random() * 100,
    createdRevenue: 12000 + Math.random() * 12000,
    revenuePickup: 18000 + Math.random() * 6000,
    updatedRevenue: 0,
    cancelledRevenue: -3000 - Math.random() * 3000,
  };
});

const mockRoomTypes = [
  { name: 'Cluster 2', color: 'hsl(var(--chart-1))' },
  { name: 'Campus 4', color: 'hsl(var(--chart-2))' },
  { name: 'Cluster 6', color: 'hsl(var(--chart-3))' },
  { name: 'TWODIO', color: 'hsl(var(--chart-4))' },
  { name: 'Studio', color: 'hsl(var(--chart-5))' },
];

export const PickupAnalysis = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    roomNights: true,
    avgRate: false,
    revenue: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pickup by Day</h2>
          <p className="text-sm text-muted-foreground">Campus Perth • Nov 2025</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select defaultValue="1day">
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1day">1 Day Ago</SelectItem>
              <SelectItem value="1week">1 Week Ago</SelectItem>
              <SelectItem value="1month">1 Month Ago</SelectItem>
            </SelectContent>
          </Select>
          
          <span className="text-sm text-muted-foreground">Occupancy pickup: <strong>0.3%</strong></span>
          
          <Select defaultValue="all">
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Segments: All</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="ota">OTA</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Today', sublabel: 'Revenue', value: 'NZ$3,113', volume: 84 },
          { label: 'Yesterday', sublabel: 'Revenue', value: 'NZ$4,218', volume: 116 },
          { label: 'Three Days', sublabel: 'Revenue', value: 'NZ$11,316', volume: 335 },
          { label: 'Seven Days', sublabel: 'Revenue', value: 'NZ$23,735', volume: 762 },
        ].map((card, i) => (
          <Card key={i} className="p-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="text-sm text-muted-foreground">{card.sublabel}</div>
              <div className="text-2xl font-semibold">{card.value}</div>
              <div className="text-sm text-muted-foreground">Volume</div>
              <div className="text-lg font-medium">{card.volume}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pick-up Breakdown Charts */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Pick-up Breakdown</h3>
            <Tabs defaultValue="week">
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* By Volume */}
          <div>
            <div 
              className="flex items-center gap-2 py-2 cursor-pointer hover:bg-muted/50 rounded"
              onClick={() => toggleSection('volume')}
            >
              {expandedSections['volume'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <h4 className="text-sm font-medium">By Volume</h4>
            </div>
            
            {expandedSections['volume'] && (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={mockPickupData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date"
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
                    <Legend />
                    <Bar dataKey="createdUnits" stackId="a" fill="hsl(var(--chart-1))" name="Created Units" />
                    <Bar dataKey="cancelledUnits" stackId="a" fill="hsl(var(--chart-5))" name="Cancelled Units" />
                    <Line 
                      type="monotone" 
                      dataKey="unitPickup" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      name="Unit Pick-up"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* By Revenue */}
          <div>
            <div 
              className="flex items-center gap-2 py-2 cursor-pointer hover:bg-muted/50 rounded"
              onClick={() => toggleSection('revenue')}
            >
              {expandedSections['revenue'] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <h4 className="text-sm font-medium">By Revenue</h4>
            </div>
            
            {expandedSections['revenue'] && (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={mockPickupData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date"
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
                    <Legend />
                    <Bar dataKey="createdRevenue" stackId="a" fill="hsl(var(--chart-1))" name="Created Revenue" />
                    <Bar dataKey="cancelledRevenue" stackId="a" fill="hsl(var(--chart-5))" name="Cancelled Revenue" />
                    <Line 
                      type="monotone" 
                      dataKey="revenuePickup" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      name="Revenue Pick-up"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Detailed Tables */}
      <Card className="p-6">
        <Tabs defaultValue="macrosegment">
          <TabsList>
            <TabsTrigger value="macrosegment">Macro Segment</TabsTrigger>
            <TabsTrigger value="segment">Segment</TabsTrigger>
            <TabsTrigger value="marketcode">Market Code</TabsTrigger>
            <TabsTrigger value="roomtype">Room Type</TabsTrigger>
            <TabsTrigger value="chargedroom">Charged Room Type</TabsTrigger>
            <TabsTrigger value="ratecode">Rate Code</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="channel">Channel</TabsTrigger>
            <TabsTrigger value="country">Country</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="mt-4">
          <p className="text-sm text-muted-foreground text-center py-8">
            Detailed pickup data tables will be integrated with Power BI
          </p>
        </div>
      </Card>
    </div>
  );
};
