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
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

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
      if (!lines[i].trim()) continue; // Skip empty lines
      
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

      // Only add rate for A1 if both room and price exist and price is valid
      if (roomA1Idx !== -1 && priceA1Idx !== -1) {
        const room = values[roomA1Idx];
        const priceStr = values[priceA1Idx];
        const price = parseFloat(priceStr);
        if (room && priceStr && !isNaN(price) && price > 0) {
          rates.push({
            check_in_date: isoDate,
            adults: 1,
            room_type: room,
            price_amount: price,
          });
        }
      }

      // Only add rate for A2 if both room and price exist and price is valid
      if (roomA2Idx !== -1 && priceA2Idx !== -1) {
        const room = values[roomA2Idx];
        const priceStr = values[priceA2Idx];
        const price = parseFloat(priceStr);
        if (room && priceStr && !isNaN(price) && price > 0) {
          rates.push({
            check_in_date: isoDate,
            adults: 2,
            room_type: room,
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
      let filesProcessed = 0;
      let errors: string[] = [];

      // Get the latest CSV upload for the property
      const { data: propertyUpload, error: propertyUploadError } = await supabase
        .from('csv_uploads')
        .select('file_path')
        .eq('property_id', selectedProperty.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (propertyUploadError) {
        console.error('Property upload fetch error:', propertyUploadError);
        errors.push(`Property: ${propertyUploadError.message}`);
      } else if (propertyUpload) {
        const { data: propertyFile, error: propertyError } = await supabase.storage
          .from('rate-csvs')
          .download(propertyUpload.file_path);

        if (propertyError) {
          console.error('Property file download error:', propertyError);
          errors.push(`Property file: ${propertyError.message}`);
        } else if (propertyFile) {
          try {
            const text = await propertyFile.text();
            const rates = parseCSV(text);
            
            console.log(`Parsed ${rates.length} rates for property from CSV`);
            
            // CRITICAL: Delete ALL existing rates for this property first
            const { error: deleteError } = await supabase.from('scraped_rates')
              .delete()
              .eq('property_id', selectedProperty.id);

            if (deleteError) {
              console.error('Delete error:', deleteError);
              throw deleteError;
            }

            console.log('Successfully deleted old property rates');

            if (rates.length > 0) {
              // Insert new rates
              const ratesToInsert = rates.map(rate => {
                const checkInDate = new Date(rate.check_in_date);
                const checkOutDate = new Date(checkInDate);
                checkOutDate.setDate(checkOutDate.getDate() + 1);
                
                return {
                  ...rate,
                  check_out_date: checkOutDate.toISOString().split('T')[0],
                  property_id: selectedProperty.id,
                  competitor_id: null,
                  currency: 'THB',
                };
              });

              const { error: insertError } = await supabase.from('scraped_rates').insert(ratesToInsert);
              if (insertError) {
                console.error('Insert error:', insertError);
                throw insertError;
              }

              console.log(`Successfully inserted ${rates.length} new rates for property`);
              totalProcessed += rates.length;
              filesProcessed++;
            } else {
              console.log('No valid rates found in property CSV');
            }
          } catch (error: any) {
            console.error('Property CSV processing error:', error);
            errors.push(`Property CSV: ${error.message}`);
          }
        }
      } else {
        errors.push('No CSV uploaded for property');
      }

      // Process competitor CSVs
      for (const competitor of competitors) {
        const { data: competitorUpload, error: compUploadError } = await supabase
          .from('csv_uploads')
          .select('file_path')
          .eq('competitor_id', competitor.id)
          .order('uploaded_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (compUploadError) {
          console.error(`Competitor ${competitor.name} upload fetch error:`, compUploadError);
          errors.push(`${competitor.name}: ${compUploadError.message}`);
          continue;
        }

        if (competitorUpload) {
          const { data: compFile, error: compError } = await supabase.storage
            .from('rate-csvs')
            .download(competitorUpload.file_path);

          if (compError) {
            console.error(`Competitor ${competitor.name} file download error:`, compError);
            errors.push(`${competitor.name} file: ${compError.message}`);
            continue;
          }

          if (compFile) {
            try {
              const text = await compFile.text();
              const rates = parseCSV(text);
              
              console.log(`Parsed ${rates.length} rates for competitor ${competitor.name}`);
              
              // CRITICAL: Delete ALL existing rates for this competitor first
              const { error: deleteError } = await supabase.from('scraped_rates')
                .delete()
                .eq('competitor_id', competitor.id);

              if (deleteError) {
                console.error(`Delete error for ${competitor.name}:`, deleteError);
                throw deleteError;
              }

              console.log(`Deleted old rates for competitor ${competitor.name}`);

              if (rates.length > 0) {
                // Insert new rates
                const ratesToInsert = rates.map(rate => {
                  const checkInDate = new Date(rate.check_in_date);
                  const checkOutDate = new Date(checkInDate);
                  checkOutDate.setDate(checkOutDate.getDate() + 1);
                  
                  return {
                    ...rate,
                    check_out_date: checkOutDate.toISOString().split('T')[0],
                    competitor_id: competitor.id,
                    property_id: null,
                    currency: 'THB',
                  };
                });

                const { error: insertError } = await supabase.from('scraped_rates').insert(ratesToInsert);
                if (insertError) {
                  console.error(`Insert error for ${competitor.name}:`, insertError);
                  throw insertError;
                }

                console.log(`Inserted ${rates.length} new rates for competitor ${competitor.name}`);
                totalProcessed += rates.length;
                filesProcessed++;
              }
            } catch (error: any) {
              console.error(`Competitor ${competitor.name} CSV processing error:`, error);
              errors.push(`${competitor.name} CSV: ${error.message}`);
            }
          }
        } else {
          errors.push(`No CSV uploaded for ${competitor.name}`);
        }
      }

      setTableRefreshKey(k => k + 1);

      if (errors.length > 0) {
        toast({
          title: "Partial success",
          description: `Refreshed ${totalProcessed} rates from ${filesProcessed} files. Errors: ${errors.join('; ')}`,
          variant: "destructive",
        });
      } else if (totalProcessed === 0) {
        toast({
          title: "No data processed",
          description: "Please upload CSV files first in the Competitors page",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Refreshed ${totalProcessed} rates from ${filesProcessed} CSV files`,
        });
      }
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
            <Button 
              onClick={handleRefreshFromCSV}
              disabled={isRefreshingFromCSV}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshingFromCSV ? 'animate-spin' : ''}`} />
              {isRefreshingFromCSV ? 'Refreshing...' : 'Refresh from CSV'}
            </Button>
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
