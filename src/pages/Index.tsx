import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { PropertySelector } from "@/components/PropertySelector";
import { FilterBar } from "@/components/FilterBar";
import { PricingTable } from "@/components/PricingTable";
import { TriggerScrapeButton } from "@/components/TriggerScrapeButton";
import { PropertyProvider, useProperty } from "@/contexts/PropertyContext";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

interface RateDetail {
  price: number | string;
  roomType: string | null;
  previousPrice?: number;
  percentChange?: number;
}

interface PricingData {
  date: string;
  day: string;
  myProperty: RateDetail;
  competitorPrices: Record<string, RateDetail>;
}

const IndexContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedProperty, competitors } = useProperty();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 30),
  });
  const [adults, setAdults] = useState(2);
  const [currency, setCurrency] = useState('THB');
  const [pricingData, setPricingData] = useState<PricingData[]>([]);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const calculateRecommendations = () => {
    if (pricingData.length === 0) {
      return {
        competitiveDays: 0,
        optimizationDays: 0,
        avgMarketRate: 0,
      };
    }

    let competitiveDays = 0;
    let optimizationDays = 0;
    let totalMarketRate = 0;
    let marketRateCount = 0;

    pricingData.forEach(row => {
      if (!row.myProperty) return;
      const myPrice = typeof row.myProperty === 'number' ? row.myProperty : (typeof row.myProperty === 'object' && row.myProperty && typeof row.myProperty.price === 'number' ? row.myProperty.price : 0);
      if (myPrice === 0) return;

      const competitorPrices = Object.values(row.competitorPrices)
        .map(cp => {
          if (!cp) return null;
          return typeof cp === 'number' ? cp : (typeof cp === 'object' && cp && typeof cp.price === 'number' ? cp.price : null);
        })
        .filter((p): p is number => p !== null && p > 0);

      if (competitorPrices.length === 0) return;

      const avgCompPrice = competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length;
      totalMarketRate += avgCompPrice;
      marketRateCount++;

      const priceDiff = ((myPrice - avgCompPrice) / avgCompPrice) * 100;

      if (priceDiff <= 10) {
        competitiveDays++;
      } else if (priceDiff > 10) {
        optimizationDays++;
      }
    });

    return {
      competitiveDays,
      optimizationDays,
      avgMarketRate: marketRateCount > 0 ? Math.round(totalMarketRate / marketRateCount) : 0,
    };
  };

  const recommendations = calculateRecommendations();

  const handleExportCSV = () => {
    if (!selectedProperty || pricingData.length === 0) {
      toast({
        title: "No data to export",
        description: "Please refresh rates first",
        variant: "destructive",
      });
      return;
    }

    // Prepare CSV data
    const headers = ['Date', 'Day', selectedProperty.name, ...competitors.map(c => c.name)];
    
    const rows = pricingData.map(row => {
      const myPropertyPrice = !row.myProperty ? 'No data' : 
        typeof row.myProperty === 'number' ? row.myProperty : 
        (typeof row.myProperty === 'object' && row.myProperty && typeof row.myProperty.price === 'number' ? row.myProperty.price : 'No data');
      
      const competitorPrices = competitors.map(c => {
        const detail = row.competitorPrices[c.id];
        if (!detail) return 'No data';
        const price = typeof detail === 'number' ? detail : 
          (typeof detail === 'object' && detail && typeof detail.price === 'number' ? detail.price : 'No data');
        return typeof price === 'number' ? price.toString() : price;
      });
      
      return [
        row.date,
        row.day,
        typeof myPropertyPrice === 'number' ? myPropertyPrice.toString() : myPropertyPrice,
        ...competitorPrices
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rates_${selectedProperty.name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: "CSV file has been downloaded",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PropertySelector />
      <FilterBar 
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={handleExportCSV}
        adults={adults}
        onAdultsChange={setAdults}
        currency={currency}
        onCurrencyChange={setCurrency}
      />
      
      <div className="px-6 py-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Rate Comparison</h2>
            <p className="text-sm text-muted-foreground">Trigger Railway scraper or upload CSVs in Competitors page</p>
          </div>
          <div className="flex gap-2">
            <TriggerScrapeButton
              dateFrom={dateRange?.from?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]}
              dateTo={dateRange?.to?.toISOString().split('T')[0] || addDays(new Date(), 30).toISOString().split('T')[0]}
              adults={adults}
            />
          </div>
        </div>
      </div>
      
      <main className="p-6">
        <PricingTable 
          key={tableRefreshKey}
          dateRange={dateRange} 
          onDataLoaded={setPricingData}
          adults={adults}
        />
        
        <div className="mt-6 rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Price Recommendations</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-success/5 p-3">
              <div className="text-xs font-medium text-success">Competitive Advantage</div>
              <div className="mt-1.5 text-xl font-bold">{recommendations.competitiveDays} days</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Your pricing is competitive or better than the market
              </div>
            </div>
            
            <div className="rounded-lg border bg-warning/5 p-3">
              <div className="text-xs font-medium text-warning">Optimization Opportunities</div>
              <div className="mt-1.5 text-xl font-bold">{recommendations.optimizationDays} days</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Consider adjusting prices to match market demand
              </div>
            </div>
            
            <div className="rounded-lg border bg-accent/5 p-3">
              <div className="text-xs font-medium text-accent">Average Market Rate</div>
              <div className="mt-1.5 text-xl font-bold">
                {recommendations.avgMarketRate > 0 ? `฿ ${recommendations.avgMarketRate.toLocaleString()}` : 'N/A'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Average competitor pricing for this period
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const Index = () => {
  return (
    <PropertyProvider>
      <IndexContent />
    </PropertyProvider>
  );
};

export default Index;
