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
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 30),
  });
  const [pricingData, setPricingData] = useState<PricingData[]>([]);
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

      // Get the latest CSV upload for the property
      const { data: propertyUpload } = await supabase
        .from('csv_uploads')
        .select('file_path')
        .eq('property_id', selectedProperty.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .single();

      if (propertyUpload) {
        const { data: propertyFile, error: propertyError } = await supabase.storage
          .from('rate-csvs')
          .download(propertyUpload.file_path);

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
      }

      // Process competitor CSVs
      for (const competitor of competitors) {
        const { data: competitorUpload } = await supabase
          .from('csv_uploads')
          .select('file_path')
          .eq('competitor_id', competitor.id)
          .order('uploaded_at', { ascending: false })
          .limit(1)
          .single();

        if (competitorUpload) {
          const { data: compFile, error: compError } = await supabase.storage
            .from('rate-csvs')
            .download(competitorUpload.file_path);

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
      }

      setTableRefreshKey(k => k + 1);

      toast({
        title: "Success",
        description: `Refreshed ${totalProcessed} rates from latest CSV files`,
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
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={handleExportCSV}
      />
      
      <div className="px-6 py-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Rate Comparison</h2>
            <p className="text-sm text-muted-foreground">Upload CSVs in Competitors page, then refresh to see rates</p>
          </div>
          <Button 
            onClick={handleRefreshFromCSV}
            disabled={isRefreshingFromCSV}
            size="default"
            className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold shadow-lg"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshingFromCSV ? 'animate-spin' : ''}`} />
            {isRefreshingFromCSV ? 'Refreshing...' : 'Refresh Rates'}
          </Button>
        </div>
      </div>
      
      <main className="p-6">
        <PricingTable 
          key={tableRefreshKey}
          dateRange={dateRange} 
          onDataLoaded={setPricingData}
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
