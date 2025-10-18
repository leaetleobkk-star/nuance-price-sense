import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useProperty } from "@/contexts/PropertyContext";

interface PricingData {
  date: string;
  day: string;
  occupancy: number;
  demand: number;
  myProperty: number | string;
  competitorPrices: (number | string)[];
}

// Mock data for demonstration - in real app this would come from scraped_rates table
const mockData: PricingData[] = [
  { date: "05/10", day: "Sun", occupancy: 73, demand: 0, myProperty: 4031, competitorPrices: [] },
  { date: "18/10", day: "Sat", occupancy: 75, demand: 28, myProperty: 5515, competitorPrices: [] },
  { date: "19/10", day: "Sun", occupancy: 61, demand: 17, myProperty: 4031, competitorPrices: [] },
  { date: "22/10", day: "Wed", occupancy: 83, demand: 26, myProperty: 4820, competitorPrices: [] },
  { date: "25/10", day: "Sat", occupancy: 87, demand: 46, myProperty: 4855, competitorPrices: [] },
];

const getPriceClass = (price: number, myPrice: number) => {
  if (typeof price !== 'number' || typeof myPrice !== 'number') return "";
  const diff = ((price - myPrice) / myPrice) * 100;
  if (diff > 15) return "text-destructive";
  if (diff < -10) return "text-success";
  return "";
};

export const PricingTable = () => {
  const { selectedProperty, competitors } = useProperty();

  if (!selectedProperty) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Please select a property to view rates
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground mb-2">No competitors configured for this property</p>
        <p className="text-sm text-muted-foreground">
          Add competitors in the Competitors page to see pricing comparisons
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 bg-muted/50 p-3 text-left font-medium"></th>
            <th className="p-3 text-left font-medium">Date</th>
            <th className="p-3 text-left font-medium">My OTB</th>
            <th className="p-3 text-left font-medium">
              <div className="flex items-center gap-1">
                Market Demand
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
              </div>
            </th>
            <th className="bg-primary/5 p-3 text-left font-medium">
              <div className="flex items-center gap-1">
                {selectedProperty.name}
                <Badge variant="secondary" className="ml-2 text-xs">My Property</Badge>
              </div>
            </th>
            {competitors.map((comp) => (
              <th key={comp.id} className="p-3 text-left font-medium">{comp.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mockData.map((row, idx) => (
            <tr
              key={idx}
              className={cn(
                "border-b transition-colors hover:bg-muted/30",
                row.demand > 25 && "bg-accent/5"
              )}
            >
              <td className="sticky left-0 bg-background p-3">
                <span className="text-xs text-muted-foreground">{row.day}</span>
              </td>
              <td className="p-3 font-medium">{row.date}</td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.occupancy}%</span>
                </div>
              </td>
              <td className="p-3">
                {row.demand > 0 && (
                  <Badge variant="secondary" className="font-normal">
                    {row.demand}%
                  </Badge>
                )}
              </td>
              <td className="bg-primary/5 p-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">฿ {row.myProperty.toLocaleString()}</span>
                </div>
              </td>
              {competitors.map((comp) => (
                <td key={comp.id} className="p-3">
                  <span className="text-muted-foreground text-sm">No data</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
