import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Settings, User, LogOut, Cloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/auth");
  };

  return (
    <header className="border-b bg-card shadow-sm">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold text-primary">Nuance Pricing</h1>
          <nav className="flex gap-1">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Overview
            </Button>
            <Button 
              variant="ghost" 
              className={location.pathname === "/" ? "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary" : "text-muted-foreground hover:text-foreground"}
              onClick={() => navigate("/")}
            >
              Rates
            </Button>
            <Button 
              variant="ghost" 
              className={location.pathname === "/properties" ? "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary" : "text-muted-foreground hover:text-foreground"}
              onClick={() => navigate("/properties")}
            >
              Properties
            </Button>
            <Button 
              variant="ghost" 
              className={location.pathname === "/competitors" ? "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary" : "text-muted-foreground hover:text-foreground"}
              onClick={() => navigate("/competitors")}
            >
              Competitors
            </Button>
            <Button 
              variant="ghost" 
              className={location.pathname === "/analytics" ? "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary" : "text-muted-foreground hover:text-foreground"}
              onClick={() => navigate("/analytics")}
            >
              BI
            </Button>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
            <Cloud className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Lovable Cloud</span>
          </Badge>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-5 w-5" />
          </Button>
          {user ? (
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => navigate("/auth")}>
              <User className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
