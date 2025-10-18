import { Card } from "@/components/ui/card";
import { TrendingDown, TrendingUp, ArrowRight } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  stlyChange: number;
  lyChange: number;
  forecastVsBudgetChange: number;
  budgetChange: number;
}

const KPICard = ({ title, value, subtitle, stlyChange, lyChange, forecastVsBudgetChange, budgetChange }: KPICardProps) => {
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
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Fcst vs Bdgt</span>
                <div className={`flex items-center gap-0.5 ${forecastVsBudgetChange < 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {forecastVsBudgetChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  <span className="font-medium">{Math.abs(forecastVsBudgetChange)}%</span>
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
  const kpis = [
    {
      title: "Revenue",
      value: "NZ$467,679",
      stlyChange: -22.7,
      lyChange: -53.7,
      forecastVsBudgetChange: -22.7,
      budgetChange: -58.1,
    },
    {
      title: "Occupancy",
      value: "43.7%",
      subtitle: "Physical",
      stlyChange: -1.7,
      lyChange: -33.2,
      forecastVsBudgetChange: -4.2,
      budgetChange: -34.0,
    },
    {
      title: "ADR",
      value: "NZ$31",
      stlyChange: -19.7,
      lyChange: -18.5,
      forecastVsBudgetChange: -18.2,
      budgetChange: -25.5,
    },
    {
      title: "RevPAR",
      value: "NZ$13",
      stlyChange: -22.7,
      lyChange: -53.7,
      forecastVsBudgetChange: -22.7,
      budgetChange: -58.1,
    },
  ];

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
