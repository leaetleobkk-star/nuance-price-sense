import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export const PropertySelector = () => {
  return (
    <div className="border-b bg-card px-6 py-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          <ChevronDown className="mr-1 h-4 w-4 rotate-90" />
        </Button>
        <Button variant="ghost" size="sm">
          <ChevronDown className="mr-1 h-4 w-4 -rotate-90" />
        </Button>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">7540 - Pullman Pattaya Hotel G</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};
