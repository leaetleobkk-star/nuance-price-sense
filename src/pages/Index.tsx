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

  const handleRefresh = async () => {
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

      toast({
        title: "Success",
        description: "Rates refreshed successfully",
      });
    } catch (error) {
      console.error("Error refreshing rates:", error);
      toast({
        title: "Error",
        description: "Failed to refresh rates",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

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
      />
        <main className="p-6">
        <PricingTable dateRange={dateRange} onDataLoaded={setPricingData} />
        
        <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Price Recommendations</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-success/5 p-4">
              <div className="text-sm font-medium text-success">Competitive Advantage</div>
              <div className="mt-2 text-2xl font-bold">18 days</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Your pricing is competitive or better than the market
              </div>
            </div>
            
            <div className="rounded-lg border bg-warning/5 p-4">
              <div className="text-sm font-medium text-warning">Optimization Opportunities</div>
              <div className="mt-2 text-2xl font-bold">8 days</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Consider adjusting prices to match market demand
              </div>
            </div>
            
            <div className="rounded-lg border bg-accent/5 p-4">
              <div className="text-sm font-medium text-accent">Average Market Rate</div>
              <div className="mt-2 text-2xl font-bold">฿ 7,245</div>
              <div className="mt-1 text-sm text-muted-foreground">
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
