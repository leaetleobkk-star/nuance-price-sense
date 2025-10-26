import { Button } from "@/components/ui/button";
import { useProperty } from "@/contexts/PropertyContext";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Play } from "lucide-react";

interface TriggerScrapeButtonProps {
  dateFrom: string;
  dateTo: string;
  adults: number;
}

export const TriggerScrapeButton = ({ dateFrom, dateTo, adults }: TriggerScrapeButtonProps) => {
  const { selectedProperty, competitors } = useProperty();
  const [isLoading, setIsLoading] = useState(false);

  const handleTriggerScrape = async () => {
    if (!selectedProperty) {
      toast.error("Please select a property first");
      return;
    }

    if (competitors.length === 0) {
      toast.error("Please add competitors before scraping");
      return;
    }

    setIsLoading(true);
    console.log('Triggering scrape for:', {
      property: selectedProperty.name,
      competitors: competitors.map(c => c.name),
      dateFrom,
      dateTo,
      adults,
    });

    try {
      const { data, error } = await supabase.functions.invoke('trigger-scrape', {
        body: {
          property_id: selectedProperty.id,
          date_from: dateFrom,
          date_to: dateTo,
          adults,
        },
      });

      if (error) {
        console.error('Error triggering scrape:', error);
        toast.error(`Failed to trigger scrape: ${error.message}`);
        return;
      }

      console.log('Scrape triggered successfully:', data);
      toast.success('Scraping initiated! Railway will scrape and store the data.');
      
    } catch (error: any) {
      console.error('Error invoking function:', error);
      toast.error(`Error: ${error.message || 'Failed to trigger scrape'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleTriggerScrape}
      disabled={isLoading || !selectedProperty || competitors.length === 0}
      size="sm"
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Scraping...
        </>
      ) : (
        <>
          <Play className="h-4 w-4" />
          Trigger Scrape
        </>
      )}
    </Button>
  );
};
