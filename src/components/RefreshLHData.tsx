import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RefreshLHDataProps {
  propertyId: string;
}

interface TaskInfo {
  task_id: string;
  type: string;
  name: string;
}

export function RefreshLHData({ propertyId }: RefreshLHDataProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsUpdating(true);
    setProgress(10);
    setStatus("loading");
    setStatusMessage("Initiating scrape...");

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

      setProgress(30);
      setStatusMessage(`Scraping started: ${data.data.total} tasks initiated`);

      // Wait and check for completion
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
        const progressPercent = 30 + (attempts / maxAttempts) * 60;
        setProgress(progressPercent);
        setStatusMessage(`Scraping in progress... (${attempts}s)`);
        
        // Check if any rates have been added
        const { count } = await supabase
          .from('scraped_rates')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', propertyId)
          .gte('scraped_at', new Date(Date.now() - 60000).toISOString());
        
        if (count && count > 0) {
          setProgress(100);
          setStatusMessage(`✓ Success! ${count} rates updated`);
          setStatus("success");
          setIsUpdating(false);
          
          toast({ 
            title: 'Data refreshed successfully', 
            description: `${count} rates have been updated` 
          });
          
          // Refresh the page after success
          setTimeout(() => window.location.reload(), 2000);
          return;
        }
      }
      
      // Timeout - but scraping might still be in progress
      setProgress(100);
      setStatusMessage('Scraping initiated but taking longer than expected. Check back in a minute.');
      setStatus("success");
      setIsUpdating(false);
      
      toast({ 
        title: 'Scrape started', 
        description: 'Data refresh in progress. This may take 1-2 minutes.' 
      });

    } catch (error: any) {
      setStatus("error");
      setIsUpdating(false);
      setStatusMessage(`Error: ${error.message}`);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to start refresh', 
        variant: 'destructive' 
      });
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
          variant={status === "success" ? "default" : status === "error" ? "destructive" : "default"}
        >
          {status === "success" ? (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          ) : status === "error" ? (
            <AlertCircle className="mr-2 h-4 w-4" />
          ) : (
            <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
          )}
          {isUpdating ? "Updating..." : status === "success" ? "Updated" : status === "error" ? "Failed" : "Refresh Data"}
        </Button>
      </div>

      {isUpdating && (
        <div className="space-y-2 mt-4">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">{statusMessage}</p>
        </div>
      )}

      {!isUpdating && status === "success" && (
        <p className="text-sm text-green-600 dark:text-green-400 mt-2">
          {statusMessage}
        </p>
      )}
      
      {!isUpdating && status === "error" && (
        <p className="text-sm text-destructive mt-2">
          {statusMessage}
        </p>
      )}
    </Card>
  );
}
