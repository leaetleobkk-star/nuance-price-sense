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
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

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
  const [scrapingProgress, setScrapingProgress] = useState(0);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingRefresh, setPendingRefresh] = useState<(() => void) | null>(null);
  const [updatedDates, setUpdatedDates] = useState<Set<string>>(new Set());
  const [pendingDates, setPendingDates] = useState<Set<string>>(new Set());
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [isRefreshingFromCSV, setIsRefreshingFromCSV] = useState(false);

  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const dateIdx = headers.findIndex(h => h.toLowerCase() === 'date');
    if (dateIdx === -1) {
      throw new Error('CSV must have a "Date" column');
    }

    const roomA1Idx = headers.findIndex(h => h.includes('Room_A1'));
    const priceA1Idx = headers.findIndex(h => h.includes('Price_A1'));
    const roomA2Idx = headers.findIndex(h => h.includes('Room_A2'));
    const priceA2Idx = headers.findIndex(h => h.includes('Price_A2'));

    const rates: Array<{
      check_in_date: string;
      adults: number;
      room_type: string | null;
      price_amount: number;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const dateStr = values[dateIdx];
      
      if (!dateStr) continue;

      let isoDate: string;
      if (dateStr.includes('/')) {
        const [month, day, year] = dateStr.split('/');
        isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        isoDate = dateStr;
      }

      if (roomA1Idx !== -1 && priceA1Idx !== -1) {
        const room = values[roomA1Idx];
        const price = parseFloat(values[priceA1Idx]);
        if (!isNaN(price) && price > 0) {
          rates.push({
            check_in_date: isoDate,
            adults: 1,
            room_type: room || null,
            price_amount: price,
          });
        }
      }

      if (roomA2Idx !== -1 && priceA2Idx !== -1) {
        const room = values[roomA2Idx];
        const price = parseFloat(values[priceA2Idx]);
        if (!isNaN(price) && price > 0) {
          rates.push({
            check_in_date: isoDate,
            adults: 2,
            room_type: room || null,
            price_amount: price,
          });
        }
      }
    }

    return rates;
  };

  const handleRefreshFromCSV = async () => {
    if (!selectedProperty || competitors.length === 0) {
      toast({
        title: "Cannot refresh",
        description: "Please select a property with competitors configured",
        variant: "destructive",
      });
      return;
    }

    setIsRefreshingFromCSV(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      let totalProcessed = 0;

      // Process property CSV
      const propertyPath = `${session.user.id}/property_${selectedProperty.id}.csv`;
      const { data: propertyFile, error: propertyError } = await supabase.storage
        .from('rate-csvs')
        .download(propertyPath);

      if (!propertyError && propertyFile) {
        const text = await propertyFile.text();
        const rates = parseCSV(text);
        
        // Delete existing rates for this property
        await supabase.from('scraped_rates')
          .delete()
          .eq('property_id', selectedProperty.id);

        // Insert new rates
        const ratesToInsert = rates.map(rate => {
          const checkInDate = new Date(rate.check_in_date);
          const checkOutDate = new Date(checkInDate);
          checkOutDate.setDate(checkOutDate.getDate() + 1);
          
          return {
            ...rate,
            check_out_date: checkOutDate.toISOString().split('T')[0],
            property_id: selectedProperty.id,
            currency: 'THB',
          };
        });

        await supabase.from('scraped_rates').insert(ratesToInsert);
        totalProcessed += rates.length;
      }

      // Process competitor CSVs
      for (const competitor of competitors) {
        const competitorPath = `${session.user.id}/competitor_${competitor.id}.csv`;
        const { data: compFile, error: compError } = await supabase.storage
          .from('rate-csvs')
          .download(competitorPath);

        if (!compError && compFile) {
          const text = await compFile.text();
          const rates = parseCSV(text);
          
          // Delete existing rates for this competitor
          await supabase.from('scraped_rates')
            .delete()
            .eq('competitor_id', competitor.id);

          // Insert new rates
          const ratesToInsert = rates.map(rate => {
            const checkInDate = new Date(rate.check_in_date);
            const checkOutDate = new Date(checkInDate);
            checkOutDate.setDate(checkOutDate.getDate() + 1);
            
            return {
              ...rate,
              check_out_date: checkOutDate.toISOString().split('T')[0],
              competitor_id: competitor.id,
              currency: 'THB',
            };
          });

          await supabase.from('scraped_rates').insert(ratesToInsert);
          totalProcessed += rates.length;
        }
      }

      setTableRefreshKey(k => k + 1);

      toast({
        title: "Success",
        description: `Refreshed ${totalProcessed} rates from stored CSV files`,
      });
    } catch (error: any) {
      console.error('CSV refresh error:', error);
      toast({
        title: "Refresh failed",
        description: error.message || "Failed to refresh from CSV files",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingFromCSV(false);
    }
  };
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

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

    // Build pending dates from selected range
    const dates: string[] = [];
    const start = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }
    setPendingDates(new Set(dates));
    
    try {
      const startedAt = new Date().toISOString();
      const { data, error } = await supabase.functions.invoke("scrape-rates", {
        body: {
          propertyId: selectedProperty.id,
          propertyName: selectedProperty.name,
          propertyUrl: selectedProperty.booking_url?.replace(/\?$/, ''),
          competitors: competitors.map(c => ({
            id: c.id,
            name: c.name,
            url: (c.booking_url || '').replace(/\?$/, ''),
          })),
          startDate: dateRange.from.toISOString().split('T')[0],
          endDate: dateRange.to.toISOString().split('T')[0],
        },
      });

      if (error) throw error;

      // Simulate progress updates while function runs
      const interval = setInterval(() => {
        setScrapingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return Math.min(prev + 8, 100);
        });
      }, 500);

      if (data?.hasRecentData) {
        toast({
          title: "Notice",
          description: "This period was scraped recently. Data has been updated.",
        });
      }

      // Mark updated dates and refresh table
      const completed = new Set<string>(Array.from(new Set((data?.data || []).map((r: any) => r.date))));
      setUpdatedDates(completed);
      setPendingDates(new Set());
      setTableRefreshKey(k => k + 1);

      toast({
        title: "Success",
        description: `Scraped ${data?.data?.length || 0} rates successfully`,
      });
    } catch (error) {
      console.error("Error refreshing rates:", error);
      // Fallback: check if data was actually inserted despite network error
      try {
        const fromStr = dateRange.from!.toISOString().split('T')[0];
        const toStr = dateRange.to!.toISOString().split('T')[0];
        const compIds = competitors.map(c => c.id);
        const [compRes, mineRes] = await Promise.all([
          supabase
            .from('scraped_rates')
            .select('check_in_date')
            .in('competitor_id', compIds)
            .gte('check_in_date', fromStr)
            .lte('check_in_date', toStr),
          supabase
            .from('scraped_rates')
            .select('check_in_date')
            .eq('property_id', selectedProperty.id)
            .gte('check_in_date', fromStr)
            .lte('check_in_date', toStr),
        ]);
        const seen = new Set<string>([
          ...((compRes.data || []) as any[]).map(r => r.check_in_date),
          ...((mineRes.data || []) as any[]).map(r => r.check_in_date),
        ]);
        if (seen.size > 0) {
          setUpdatedDates(seen);
          setPendingDates(new Set());
          setTableRefreshKey(k => k + 1);
          toast({
            title: "Completed",
            description: "Rates updated despite a network interruption.",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to refresh rates. Please try again.",
            variant: "destructive",
          });
        }
      } catch (fallbackErr) {
        console.error('Fallback verification failed:', fallbackErr);
        toast({
          title: "Error",
          description: "Failed to refresh rates. Please try again.",
          variant: "destructive",
        });
      }
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
      
      <div className="px-6 pb-4">
        <Button 
          onClick={handleRefreshFromCSV}
          disabled={isRefreshingFromCSV}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshingFromCSV ? 'animate-spin' : ''}`} />
          {isRefreshingFromCSV ? 'Refreshing...' : 'Refresh from CSV'}
        </Button>
      </div>
      
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
        <PricingTable 
          key={tableRefreshKey}
          dateRange={dateRange} 
          onDataLoaded={setPricingData}
          updatedDates={updatedDates}
          pendingDates={pendingDates}
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
