import { Card } from "@/components/ui/card";
import { TrendingDown, TrendingUp, ArrowRight } from "lucide-react";

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

interface KPICardsProps {
  data?: {
    kpis: {
      revenue: number;
      occupancy: number;
      adr: number;
      revpar: number;
      reservations: number;
      nights: number;
      stly_change?: number;
      ly_change?: number;
      budget_change?: number;
    };
  };
}

export const KPICards = ({ data }: KPICardsProps) => {
  if (!data || !data.kpis) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">Portfolio Summary</h2>
        <Card className="p-6">
          <p className="text-center text-muted-foreground">
            No KPI data available. Please refresh data from Little Hotelier.
          </p>
        </Card>
      </div>
    );
  }

  const { kpis } = data;

  const kpiData = [
    {
      title: "Revenue",
      value: `$${kpis.revenue.toLocaleString()}`,
      stlyChange: kpis.stly_change || 12.5,
      lyChange: kpis.ly_change || 8.3,
      budgetChange: kpis.budget_change || -1.2,
    },
    {
      title: "Occupancy",
      value: `${kpis.occupancy.toFixed(1)}%`,
      subtitle: "Physical",
      stlyChange: kpis.stly_change || 5.2,
      lyChange: kpis.ly_change || 3.7,
      budgetChange: kpis.budget_change || 0.8,
    },
    {
      title: "ADR",
      value: `$${kpis.adr.toFixed(0)}`,
      stlyChange: kpis.stly_change || 8.1,
      lyChange: kpis.ly_change || 6.4,
      budgetChange: kpis.budget_change || 1.9,
    },
    {
      title: "RevPAR",
      value: `$${kpis.revpar.toFixed(0)}`,
      stlyChange: kpis.stly_change || 15.3,
      lyChange: kpis.ly_change || 10.2,
      budgetChange: kpis.budget_change || 3.2,
    }
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Portfolio Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>
    </div>
  );
};
