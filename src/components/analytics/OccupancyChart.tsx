import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const mockData = [
  { date: '28 Jul 25', day: 'Mon', occupancy: 85, avgRate: 42.3 },
  { date: '04 Aug 25', day: 'Mon', occupancy: 92, avgRate: 42.3 },
  { date: '11 Aug 25', day: 'Mon', occupancy: 88, avgRate: 42.3 },
  { date: '18 Aug 25', day: 'Mon', occupancy: 87, avgRate: 42.3 },
  { date: '25 Aug 25', day: 'Mon', occupancy: 78, avgRate: 42.3 },
  { date: '01 Sep 25', day: 'Mon', occupancy: 94, avgRate: 42.3 },
  { date: '08 Sep 25', day: 'Mon', occupancy: 76, avgRate: 55.9 },
  { date: '15 Sep 25', day: 'Mon', occupancy: 92, avgRate: 61.5 },
  { date: '22 Sep 25', day: 'Mon', occupancy: 85, avgRate: 61.0 },
  { date: '29 Sep 25', day: 'Mon', occupancy: 89, avgRate: 63.3 },
  { date: '06 Oct 25', day: 'Mon', occupancy: 88, avgRate: 63.3 },
  { date: '13 Oct 25', day: 'Mon', occupancy: 92, avgRate: 63.3 },
];

export const OccupancyChart = () => {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Weekly Occupancy & Rate Trends</h3>
          <p className="text-sm text-muted-foreground">7-day rolling average</p>
        </div>
        
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockData}>
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
