import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";

interface PricingData {
  date: string;
  day: string;
  occupancy: number;
  demand: number;
  myProperty: number | string;
  competitors: Array<{
    name: string;
    price: number | string;
    isSoldOut?: boolean;
    isRecommended?: boolean;
  }>;
}

const mockData: PricingData[] = [
  { date: "05/10", day: "Sun", occupancy: 73, demand: 0, myProperty: 4031, competitors: [
    { name: "Dust Thani Pattaya", price: "No flex" },
    { name: "Amari Pattaya", price: "No flex" },
    { name: "Mövenpick Siam", price: 6577 },
    { name: "Centara Grand", price: "No flex" },
    { name: "Cape Dara Resort", price: "No flex" },
    { name: "Avani Pattaya", price: "No flex" },
  ]},
  { date: "18/10", day: "Sat", occupancy: 75, demand: 28, myProperty: 5515, competitors: [
    { name: "Dust Thani Pattaya", price: "No flex", isRecommended: true },
    { name: "Amari Pattaya", price: "No flex" },
    { name: "Mövenpick Siam", price: 8060 },
    { name: "Centara Grand", price: 9275 },
    { name: "Cape Dara Resort", price: 14080 },
    { name: "Avani Pattaya", price: "No flex" },
  ]},
  { date: "19/10", day: "Sun", occupancy: 61, demand: 17, myProperty: 4031, competitors: [
    { name: "Dust Thani Pattaya", price: "No flex" },
    { name: "Amari Pattaya", price: "No flex" },
    { name: "Mövenpick Siam", price: 5706 },
    { name: "Centara Grand", price: "No flex" },
    { name: "Cape Dara Resort", price: 5440 },
    { name: "Avani Pattaya", price: "No flex" },
  ]},
  { date: "22/10", day: "Wed", occupancy: 83, demand: 26, myProperty: 4820, competitors: [
    { name: "Dust Thani Pattaya", price: 5885 },
    { name: "Amari Pattaya", price: 10593 },
    { name: "Mövenpick Siam", price: 7122 },
    { name: "Centara Grand", price: 7156 },
    { name: "Cape Dara Resort", price: 11520 },
    { name: "Avani Pattaya", price: "Sold out", isSoldOut: true },
  ]},
  { date: "25/10", day: "Sat", occupancy: 87, demand: 46, myProperty: 4855, competitors: [
    { name: "Dust Thani Pattaya", price: 6709 },
    { name: "Amari Pattaya", price: 14830 },
    { name: "Mövenpick Siam", price: 7651 },
    { name: "Centara Grand", price: 15984 },
    { name: "Cape Dara Resort", price: 8832 },
    { name: "Avani Pattaya", price: 6958 },
  ]},
];

const getPriceClass = (price: number, myPrice: number) => {
  if (typeof price !== 'number' || typeof myPrice !== 'number') return "";
  const diff = ((price - myPrice) / myPrice) * 100;
  if (diff > 15) return "text-destructive";
  if (diff < -10) return "text-success";
  return "";
};

export const PricingTable = () => {
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
                Pullman Pattaya Hotel G
                <Badge variant="secondary" className="ml-2 text-xs">My Property</Badge>
              </div>
            </th>
            {mockData[0].competitors.map((comp) => (
              <th key={comp.name} className="p-3 text-left font-medium">{comp.name}</th>
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
                  {row.competitors.some(c => c.isRecommended) && (
                    <TrendingDown className="h-4 w-4 text-success" />
                  )}
                </div>
              </td>
              {row.competitors.map((comp, compIdx) => (
                <td key={compIdx} className="p-3">
                  {comp.isSoldOut ? (
                    <span className="text-muted-foreground">{comp.price}</span>
                  ) : typeof comp.price === 'number' ? (
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium", getPriceClass(comp.price, typeof row.myProperty === 'number' ? row.myProperty : 0))}>
                        ฿ {comp.price.toLocaleString()}
                      </span>
                      {comp.price > (typeof row.myProperty === 'number' ? row.myProperty : 0) && (
                        <TrendingUp className="h-3 w-3 text-destructive" />
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{comp.price}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
