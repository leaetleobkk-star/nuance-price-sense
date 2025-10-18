import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { PropertySelector } from "@/components/PropertySelector";
import { FilterBar } from "@/components/FilterBar";
import { PricingTable } from "@/components/PricingTable";
import { PropertyProvider, useProperty } from "@/contexts/PropertyContext";
import { useToast } from "@/hooks/use-toast";

const IndexContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedProperty, competitors } = useProperty();
  const [isRefreshing, setIsRefreshing] = useState(false);

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

    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-rates", {
        body: {
          propertyId: selectedProperty.id,
          competitors: competitors.map(c => ({
            id: c.id,
            name: c.name,
            url: c.booking_url,
          })),
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PropertySelector />
      <FilterBar onRefresh={handleRefresh} isRefreshing={isRefreshing} />
        <main className="p-6">
        <PricingTable />
        
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
