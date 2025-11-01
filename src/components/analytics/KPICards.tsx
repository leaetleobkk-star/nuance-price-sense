import { Card } from "@/components/ui/card";
import { TrendingDown, TrendingUp, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { biSupabase } from "@/integrations/bi-supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  stlyChange: number;
  lyChange: number;
  budgetChange: number;
}

const KPICard = ({ title, value, subtitle, stlyChange, lyChange, budgetChange }: KPICardProps) => {
  const isPositive = stlyChange > 0;
  
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="space-y-1">
          <div className="text-3xl font-semibold">{value}</div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">STLY</span>
                <div className={`flex items-center gap-0.5 ${stlyChange < 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {stlyChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  <span className="font-medium">{Math.abs(stlyChange)}%</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">LY</span>
                <div className={`flex items-center gap-0.5 ${lyChange < 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {lyChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  <span className="font-medium">{Math.abs(lyChange)}%</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Budget</span>
                <div className={`flex items-center gap-0.5 ${budgetChange < 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {budgetChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  <span className="font-medium">{Math.abs(budgetChange)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const KPICards = () => {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['bi-kpi-data'],
    queryFn: async () => {
      const currentDate = new Date();
      const period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      const { data, error } = await biSupabase
        .from('lh_room_types')
        .select('revenue, occupancy, adr, revpar')
        .eq('property_id', 'property_1')
        .eq('period', period);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const totals = data.reduce<{
        revenue: number;
        occupancy: number;
        adr: number;
        revpar: number;
        count: number;
      }>((acc, row) => ({
        revenue: acc.revenue + (row.revenue || 0),
        occupancy: acc.occupancy + (row.occupancy || 0),
        adr: acc.adr + (row.adr || 0),
        revpar: acc.revpar + (row.revpar || 0),
        count: acc.count + 1,
      }), { revenue: 0, occupancy: 0, adr: 0, revpar: 0, count: 0 });

      return [
        {
          title: "Revenue",
          value: `$${totals.revenue.toLocaleString()}`,
          stlyChange: 12.5,
          lyChange: 8.3,
          budgetChange: -1.2,
        },
        {
          title: "Occupancy",
          value: `${(totals.occupancy / totals.count).toFixed(1)}%`,
          subtitle: "Physical",
          stlyChange: 5.2,
          lyChange: 3.7,
          budgetChange: 0.8,
        },
        {
          title: "ADR",
          value: `$${(totals.adr / totals.count).toFixed(0)}`,
          stlyChange: 8.1,
          lyChange: 6.4,
          budgetChange: 1.9,
        },
        {
          title: "RevPAR",
          value: `$${(totals.revpar / totals.count).toFixed(0)}`,
          stlyChange: 15.3,
          lyChange: 10.2,
          budgetChange: 3.2,
        }
      ];
    },
  });

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">Portfolio Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Portfolio Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>
    </div>
  );
};
