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

  const RAILWAY_API_URL = import.meta.env.VITE_RAILWAY_API_URL || "https://your-app.up.railway.app";

  const handleRefresh = async () => {
    // Fetch property credentials
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("lh_email, lh_password, pms_type")
      .eq("id", propertyId)
      .single();

    if (propError || !property) {
      toast({ 
        title: "Error", 
        description: "Failed to load property credentials", 
        variant: "destructive" 
      });
      return;
    }

    if (property.pms_type !== "little-hotelier" || !property.lh_email || !property.lh_password) {
      toast({ 
        title: "Configuration Required", 
        description: "Please configure Little Hotelier credentials in Properties page", 
        variant: "destructive" 
      });
      return;
    }

    setIsUpdating(true);
    setProgress(0);
    setStatusMessage("Starting Little Hotelier data refresh...");

    try {
      const response = await fetch(`${RAILWAY_API_URL}/api/little-hotelier/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: property.lh_email,
          password: property.lh_password
        })
      });

      if (!response.ok) {
        throw new Error("Failed to start scraper");
      }

      const data = await response.json();
      const taskId = data.task_id;
      setStatusMessage("Scraper started, checking progress...");

      let retries = 0;
      const maxRetries = 300;
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${RAILWAY_API_URL}/api/status/${taskId}`);
          
          if (!statusResponse.ok) {
            retries++;
            if (retries > 5) throw new Error("Task not found");
            return;
          }

          const statusData = await statusResponse.json();
          setProgress(statusData.progress || 0);
          setStatusMessage(statusData.message || "Processing...");

          if (statusData.status === "completed") {
            clearInterval(pollInterval);
            setIsUpdating(false);
            setProgress(100);
            setStatusMessage("Data refreshed successfully!");
            
            toast({ 
              title: "Success", 
              description: "Little Hotelier data has been updated!" 
            });

            // Refresh the page after 2 seconds
            setTimeout(() => window.location.reload(), 2000);
          } else if (statusData.status === "failed") {
            clearInterval(pollInterval);
            setIsUpdating(false);
            throw new Error(statusData.message || "Scraping failed");
          }

          retries++;
          if (retries >= maxRetries) {
            clearInterval(pollInterval);
            throw new Error("Timeout waiting for scraper");
          }
        } catch (error: any) {
          clearInterval(pollInterval);
          setIsUpdating(false);
          toast({ 
            title: "Error", 
            description: error.message || "Failed to update data", 
            variant: "destructive" 
          });
        }
      }, 1000);

    } catch (error: any) {
      setIsUpdating(false);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update data", 
        variant: "destructive" 
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
