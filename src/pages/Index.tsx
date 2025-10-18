import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { PropertySelector } from "@/components/PropertySelector";
import { FilterBar } from "@/components/FilterBar";
import { PricingTable } from "@/components/PricingTable";
import { PropertyProvider, useProperty } from "@/contexts/PropertyContext";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

interface PricingData {
  date: string;
  day: string;
  myProperty: number | string;
  competitorPrices: Record<string, number | string>;
}

const IndexContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedProperty, competitors } = useProperty();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 30),
  });
  const [pricingData, setPricingData] = useState<PricingData[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const [scrapingProgress, setScrapingProgress] = useState(0);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingRefresh, setPendingRefresh] = useState<(() => void) | null>(null);

  const performRefresh = async () => {
    if (!selectedProperty || competitors.length === 0) {
      toast({
        title: "Cannot refresh",
        description: "Please select a property with competitors configured",
        variant: "destructive",
      });
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Select date range",
        description: "Please select a date range to scrape rates",
        variant: "destructive",
      });
      return;
    }

    setIsRefreshing(true);
    setScrapingProgress(0);
    
    try {
      const { data, error } = await supabase.functions.invoke("scrape-rates", {
        body: {
          propertyId: selectedProperty.id,
          propertyName: selectedProperty.name,
          propertyUrl: selectedProperty.booking_url,
          competitors: competitors.map(c => ({
            id: c.id,
            name: c.name,
            url: c.booking_url,
          })),
          startDate: dateRange.from.toISOString().split('T')[0],
          endDate: dateRange.to.toISOString().split('T')[0],
        },
      });

      if (error) throw error;

      // Simulate progress updates
      const interval = setInterval(() => {
        setScrapingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return Math.min(prev + 10, 100);
        });
      }, 500);

      if (data?.hasRecentData) {
        toast({
          title: "Notice",
          description: "This period was scraped recently. Data has been updated.",
        });
      }

      toast({
        title: "Success",
        description: `Scraped ${data?.data?.length || 0} rates successfully`,
      });
      
      // Reload the table data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error refreshing rates:", error);
      toast({
        title: "Error",
        description: "Failed to refresh rates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
      setScrapingProgress(0);
    }
  };

  const handleRefresh = async () => {
    // Check if data exists for this period
    if (dateRange?.from && dateRange?.to) {
      const { data: existingData } = await supabase
        .from('scraped_rates')
        .select('id')
        .gte('check_in_date', dateRange.from.toISOString().split('T')[0])
        .lte('check_in_date', dateRange.to.toISOString().split('T')[0])
        .limit(1);

      if (existingData && existingData.length > 0) {
        setShowDuplicateWarning(true);
        setPendingRefresh(() => performRefresh);
        return;
      }
    }

    await performRefresh();
  };

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
      const myPrice = typeof row.myProperty === 'number' ? row.myProperty : 0;
      if (myPrice === 0) return;

      const competitorPrices = Object.values(row.competitorPrices)
        .filter((p): p is number => typeof p === 'number');

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
      const competitorPrices = competitors.map(c => {
        const price = row.competitorPrices[c.id];
        return typeof price === 'number' ? price.toString() : price;
      });
      
      return [
        row.date,
        row.day,
        typeof row.myProperty === 'number' ? row.myProperty.toString() : row.myProperty,
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
        onRefresh={handleRefresh} 
        isRefreshing={isRefreshing}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={handleExportCSV}
        scrapingProgress={scrapingProgress}
      />
      
      {/* Duplicate warning dialog */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md mx-4 shadow-xl border">
            <h3 className="text-lg font-semibold mb-2">Data Already Exists</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Rates for this period have already been scraped. Do you want to update them with fresh data?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDuplicateWarning(false);
                  setPendingRefresh(null);
                }}
                className="px-4 py-2 text-sm border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDuplicateWarning(false);
                  if (pendingRefresh) {
                    pendingRefresh();
                  }
                  setPendingRefresh(null);
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Yes, Update Data
              </button>
            </div>
          </div>
        </div>
      )}
        <main className="p-6">
        <PricingTable dateRange={dateRange} onDataLoaded={setPricingData} />
        
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
