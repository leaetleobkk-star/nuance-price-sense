import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useProperty } from "@/contexts/PropertyContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";

interface PricingData {
  date: string;
  day: string;
  myProperty: number | string;
  competitorPrices: Record<string, number | string>;
}

interface PricingTableProps {
  dateRange?: DateRange;
  onDataLoaded?: (data: PricingData[]) => void;
}

const getPriceClass = (price: number, myPrice: number) => {
  if (typeof price !== 'number' || typeof myPrice !== 'number') return "";
  const diff = ((price - myPrice) / myPrice) * 100;
  if (diff > 15) return "text-destructive";
  if (diff < -10) return "text-success";
  return "";
};

const getDayName = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export const PricingTable = ({ dateRange, onDataLoaded }: PricingTableProps) => {
  const { selectedProperty, competitors } = useProperty();
  const [pricingData, setPricingData] = useState<PricingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (selectedProperty && competitors.length > 0 && dateRange?.from && dateRange?.to) {
      fetchPricingData();
    } else {
      setPricingData([]);
      setIsLoading(false);
    }
  }, [selectedProperty, competitors, dateRange]);

  const fetchPricingData = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    setIsLoading(true);
    try {
      // Generate dates based on selected range
      const dates = [];
      const start = new Date(dateRange.from);
      const end = new Date(dateRange.to);
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        dates.push(new Date(date).toISOString().split('T')[0]);
      }

      // Fetch scraped rates for all competitors
      const { data: rates, error } = await supabase
        .from('scraped_rates')
        .select('*')
        .in('competitor_id', competitors.map(c => c.id))
        .gte('check_in_date', dates[0])
        .lte('check_in_date', dates[dates.length - 1])
        .order('check_in_date');

      if (error) {
        console.error('Error fetching rates:', error);
        return;
      }

      // Transform data into table format
      const tableData: PricingData[] = dates.map(date => {
        const competitorPrices: Record<string, number | string> = {};
        
        competitors.forEach(comp => {
          const rate = rates?.find(r => 
            r.competitor_id === comp.id && 
            r.check_in_date === date
          );
          competitorPrices[comp.id] = rate ? rate.price_amount : 'No data';
        });

        return {
          date: new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
          day: getDayName(date),
          myProperty: 4500, // Mock data for now - would come from your property management system
          competitorPrices,
        };
      });

      setPricingData(tableData);
      if (onDataLoaded) {
        onDataLoaded(tableData);
      }
    } catch (error) {
      console.error('Error in fetchPricingData:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading pricing data...
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 bg-muted/50 p-2 text-left text-xs font-medium"></th>
            <th className="p-2 text-left text-xs font-medium">Date</th>
            <th className="bg-orange-50 dark:bg-orange-950/20 p-2 text-left text-xs font-medium">
              {selectedProperty.name}
            </th>
            {competitors.map((comp) => (
              <th key={comp.id} className="p-2 text-left text-xs font-medium">{comp.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pricingData.map((row, idx) => (
            <tr
              key={idx}
              className="border-b transition-colors hover:bg-muted/30"
            >
              <td className="sticky left-0 bg-background p-2">
                <span className="text-[10px] text-muted-foreground">{row.day}</span>
              </td>
              <td className="p-2 text-xs font-medium">{row.date}</td>
              <td className="bg-orange-50 dark:bg-orange-950/20 p-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                    ฿ {typeof row.myProperty === 'number' ? row.myProperty.toLocaleString() : row.myProperty}
                  </span>
                </div>
              </td>
              {competitors.map((comp) => {
                const price = row.competitorPrices[comp.id];
                return (
                  <td key={comp.id} className="p-2">
                    {typeof price === 'number' ? (
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-xs font-medium", getPriceClass(price, typeof row.myProperty === 'number' ? row.myProperty : 0))}>
                          ฿ {price.toLocaleString()}
                        </span>
                        {price > (typeof row.myProperty === 'number' ? row.myProperty : 0) && (
                          <TrendingUp className="h-2.5 w-2.5 text-destructive" />
                        )}
                        {price < (typeof row.myProperty === 'number' ? row.myProperty : 0) && (
                          <TrendingDown className="h-2.5 w-2.5 text-success" />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">{price}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
