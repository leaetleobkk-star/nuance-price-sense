import { Button } from "@/components/ui/button";
import { Settings, User } from "lucide-react";

export const Header = () => {
  return (
    <header className="border-b bg-card shadow-sm">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold text-primary">Nuance Pricing</h1>
          <nav className="flex gap-1">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Overview
            </Button>
            <Button variant="ghost" className="bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary">
              Rates
            </Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              BI
            </Button>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
