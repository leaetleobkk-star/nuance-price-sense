import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, Filter, RefreshCw, Download, BarChart3, Table2, Grid3x3 } from "lucide-react";

export const FilterBar = () => {
  return (
    <div className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            October 2025
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          <div className="h-6 w-px bg-border" />
          
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Best flex
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" className="gap-2">
            Booking.com
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" className="gap-2">
            Desktop
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" className="gap-2">
            1 night
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" className="gap-2">
            2 guests
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" className="gap-2">
            Any room
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" className="gap-2">
            Any meal
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Compare
          </Button>
          
          <Button variant="ghost" size="sm" className="gap-2">
            <Table2 className="h-4 w-4" />
            Table settings
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          <div className="flex gap-1 border-l pl-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Table2 className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          <Button size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh rates
          </Button>
        </div>
      </div>
    </div>
  );
};
