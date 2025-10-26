import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useProperty } from "@/contexts/PropertyContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";

interface RateDetail {
  price: number | string;
  roomType: string | null;
  previousPrice?: number;
  percentChange?: number;
}

interface PricingData {
  isoDate: string;
  date: string;
  day: string;
  myProperty: RateDetail;
  competitorPrices: Record<string, RateDetail>;
}

interface PricingTableProps {
  dateRange?: DateRange;
  onDataLoaded?: (data: any[]) => void;
  adults?: number;
  currency?: string;
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

const EXCHANGE_RATES: Record<string, { rate: number; symbol: string }> = {
  THB: { rate: 1, symbol: '฿' },
  USD: { rate: 0.028, symbol: '$' },
  EUR: { rate: 0.026, symbol: '€' },
  HKD: { rate: 0.22, symbol: 'HK$' },
};

const convertPrice = (price: number, currency: string = 'THB'): number => {
  return price * EXCHANGE_RATES[currency].rate;
};

const getCurrencySymbol = (currency: string = 'THB'): string => {
  return EXCHANGE_RATES[currency].symbol;
};

export const PricingTable = ({ dateRange, onDataLoaded, adults = 2, currency = 'THB' }: PricingTableProps) => {
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
  }, [selectedProperty, competitors, dateRange, adults, currency]);

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

      // Fetch current and previous scraped rates for competitors and property, filtered by adults
      const [compRes, myRes, compPrevRes, myPrevRes] = await Promise.all([
        supabase
          .from('scraped_rates')
          .select('*')
          .in('competitor_id', competitors.map(c => c.id))
          .eq('adults', adults)
          .gte('check_in_date', dates[0])
          .lte('check_in_date', dates[dates.length - 1])
          .order('check_in_date')
          .order('scraped_at', { ascending: false }),
        supabase
          .from('scraped_rates')
          .select('*')
          .eq('property_id', selectedProperty.id)
          .eq('adults', adults)
          .gte('check_in_date', dates[0])
          .lte('check_in_date', dates[dates.length - 1])
          .order('check_in_date')
          .order('scraped_at', { ascending: false }),
        // Get previous rates (older scraped_at)
        supabase
          .from('scraped_rates')
          .select('*')
          .in('competitor_id', competitors.map(c => c.id))
          .eq('adults', adults)
          .gte('check_in_date', dates[0])
          .lte('check_in_date', dates[dates.length - 1])
          .order('scraped_at', { ascending: false }),
        supabase
          .from('scraped_rates')
          .select('*')
          .eq('property_id', selectedProperty.id)
          .eq('adults', adults)
          .gte('check_in_date', dates[0])
          .lte('check_in_date', dates[dates.length - 1])
          .order('scraped_at', { ascending: false }),
      ]);

      const rates = compRes.data || [];
      const myRates = myRes.data || [];
      const prevRates = compPrevRes.data || [];
      const myPrevRates = myPrevRes.data || [];

      if (compRes.error || myRes.error) {
        console.error('Error fetching rates:', compRes.error || myRes.error);
        return;
      }

      // Helper to get previous rate
      const getPreviousRate = (currentRate: any, isProperty: boolean) => {
        const prevData = isProperty ? myPrevRates : prevRates;
        const identifier = isProperty ? 'property_id' : 'competitor_id';
        const idValue = isProperty ? selectedProperty.id : currentRate.competitor_id;

        // Find the previous rate for the same date but with older scraped_at
        const previous = prevData
          .filter(r => 
            r[identifier] === idValue && 
            r.check_in_date === currentRate.check_in_date &&
            r.scraped_at < currentRate.scraped_at
          )
          .sort((a, b) => new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime())[0];

        return previous;
      };

      // Transform data into table format
      const tableData: PricingData[] = dates.map(date => {
        const competitorPrices: Record<string, RateDetail> = {};
        
        competitors.forEach(comp => {
          const rate = rates.find(r => 
            r.competitor_id === comp.id && 
            r.check_in_date === date
          );
          
          if (rate) {
            const prevRate = getPreviousRate(rate, false);
            const currentPrice = Number(rate.price_amount);
            const previousPrice = prevRate ? Number(prevRate.price_amount) : undefined;
            const percentChange = previousPrice ? ((currentPrice - previousPrice) / previousPrice) * 100 : undefined;

            competitorPrices[comp.id] = {
              price: currentPrice,
              roomType: rate.room_type,
              previousPrice,
              percentChange,
            };
          } else {
            competitorPrices[comp.id] = {
              price: 'No data',
              roomType: null,
            };
          }
        });

        const myRate = myRates.find(r => r.property_id === selectedProperty.id && r.check_in_date === date);
        let myPropertyDetail: RateDetail;

        if (myRate) {
          const prevRate = getPreviousRate(myRate, true);
          const currentPrice = Number(myRate.price_amount);
          const previousPrice = prevRate ? Number(prevRate.price_amount) : undefined;
          const percentChange = previousPrice ? ((currentPrice - previousPrice) / previousPrice) * 100 : undefined;

          myPropertyDetail = {
            price: currentPrice,
            roomType: myRate.room_type,
            previousPrice,
            percentChange,
          };
        } else {
          myPropertyDetail = {
            price: 'No data',
            roomType: null,
          };
        }

        return {
          isoDate: date,
          date: new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
          day: getDayName(date),
          myProperty: myPropertyDetail,
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

  const renderPriceCell = (detail: RateDetail | undefined, isMyProperty: boolean = false, myPropertyPrice: number = 0) => {
    if (!detail || typeof detail.price === 'string') {
      return <span className="text-muted-foreground text-[10px]">{detail?.price || 'No data'}</span>;
    }

    const hasHistoricalData = detail.previousPrice !== undefined;
    const hasSignificantChange = hasHistoricalData && detail.percentChange && Math.abs(detail.percentChange) >= 10;

    const priceContent = (
      <div className="flex items-center gap-1.5">
        <span className={cn(
          "text-xs font-medium",
          isMyProperty ? "font-semibold text-orange-600 dark:text-orange-400" : getPriceClass(detail.price, myPropertyPrice)
        )}>
          {getCurrencySymbol(currency)} {convertPrice(detail.price, currency).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </span>
        {!isMyProperty && detail.price > myPropertyPrice && (
          <TrendingUp className="h-2.5 w-2.5 text-destructive" />
        )}
        {!isMyProperty && detail.price < myPropertyPrice && (
          <TrendingDown className="h-2.5 w-2.5 text-success" />
        )}
        {hasSignificantChange && (
          <Badge 
            variant="outline" 
            className={cn(
              "text-[9px] px-1 py-0 h-4",
              detail.percentChange! > 0 ? "text-destructive border-destructive" : "text-success border-success"
            )}
          >
            {detail.percentChange! > 0 ? '+' : ''}{detail.percentChange!.toFixed(1)}%
          </Badge>
        )}
      </div>
    );

    if (detail.roomType) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {priceContent}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{detail.roomType}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return priceContent;
  };

  return (
    <TooltipProvider>
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
                <td className="p-2 text-xs font-medium">
                  {row.date}
                </td>
                <td className="bg-orange-50 dark:bg-orange-950/20 p-2">
                  {renderPriceCell(row.myProperty, true, typeof row.myProperty.price === 'number' ? row.myProperty.price : 0)}
                </td>
                {competitors.map((comp) => {
                  const detail = row.competitorPrices[comp.id];
                  const myPrice = typeof row.myProperty.price === 'number' ? row.myProperty.price : 0;
                  return (
                    <td key={comp.id} className="p-2">
                      {renderPriceCell(detail, false, myPrice)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
};
