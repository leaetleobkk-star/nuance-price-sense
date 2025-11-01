import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface ChannelMixChartProps {
  data?: {
    channels: Array<{
      channel: string;
      revenue: number;
      reservations: number;
    }>;
  };
}

export const ChannelMixChart = ({ data }: ChannelMixChartProps) => {
  if (!data || !data.channels || data.channels.length === 0) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Channel Mix</h3>
            <p className="text-sm text-muted-foreground">Revenue distribution by channel</p>
          </div>
          <p className="text-center text-muted-foreground py-8">
            No channel data available. Please refresh data from Little Hotelier.
          </p>
        </div>
      </Card>
    );
  }

  const chartData = data.channels.map(item => ({
    name: item.channel || 'Unknown',
    value: item.revenue || 0,
    reservations: item.reservations || 0,
  }));

  const totalRevenue = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Channel Mix</h3>
          <p className="text-sm text-muted-foreground">Revenue distribution by channel</p>
        </div>
        
        {chartData && chartData.length > 0 ? (
          <>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              {chartData.slice(0, 5).map((channel, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{channel.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${channel.value.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {((channel.value / totalRevenue) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No channel data available for the current period
          </p>
        )}
      </div>
    </Card>
  );
};