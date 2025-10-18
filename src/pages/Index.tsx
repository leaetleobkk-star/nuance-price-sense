import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { PropertySelector } from "@/components/PropertySelector";
import { FilterBar } from "@/components/FilterBar";
import { PricingTable } from "@/components/PricingTable";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PropertySelector />
      <FilterBar />
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

export default Index;
