import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RefreshLHDataProps {
  propertyId: string;
}

export function RefreshLHData({ propertyId }: RefreshLHDataProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsUpdating(true);
    setProgress(0);
    setStatusMessage("Starting data refresh...");

    try {
      // Default: refresh next 60 days, adults=2
      const today = new Date();
      const startStr = today.toISOString().slice(0, 10);
      const end = new Date(today);
      end.setDate(end.getDate() + 60);
      const endStr = end.toISOString().slice(0, 10);

      const { data, error } = await supabase.functions.invoke('trigger-scrape', {
        body: {
          property_id: propertyId,
          date_from: startStr,
          date_to: endStr,
          adults: 2,
        },
      });

      if (error) throw error;

      setProgress(100);
      setStatusMessage('Request sent to update data. This may take a minute...');
      setIsUpdating(false);

      // Soft refresh charts after a short delay
      setTimeout(() => window.location.reload(), 2000);

      toast({ title: 'Started', description: 'Refresh initiated. Check back shortly.' });
    } catch (error: any) {
      setIsUpdating(false);
      toast({ title: 'Error', description: error.message || 'Failed to start refresh', variant: 'destructive' });
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Little Hotelier Data</h3>
        <Button 
          onClick={handleRefresh}
          disabled={isUpdating}
          size="sm"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
          {isUpdating ? "Updating..." : "Refresh Data"}
        </Button>
      </div>

      {isUpdating && (
        <div className="space-y-2 mt-4">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">{statusMessage}</p>
        </div>
      )}

      {!isUpdating && progress === 100 && (
        <p className="text-sm text-muted-foreground mt-2">
          Last update successful. Dashboard will refresh automatically.
        </p>
      )}
    </Card>
  );
}
