import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CSVUpload {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
  record_count: number;
  property_id: string | null;
  competitor_id: string | null;
}

interface CSVUploadHistoryProps {
  propertyId?: string;
  competitorId?: string;
  entityName: string;
}

export const CSVUploadHistory = ({ propertyId, competitorId, entityName }: CSVUploadHistoryProps) => {
  const { toast } = useToast();
  const [uploads, setUploads] = useState<CSVUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUploads();
  }, [propertyId, competitorId]);

  // Auto-refresh when new CSV uploads are added
  useEffect(() => {
    const channel = supabase
      .channel('csv_uploads_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'csv_uploads',
        },
        (payload) => {
          // Check if the new upload matches our filter
          const newUpload = payload.new as CSVUpload;
          if (
            (propertyId && newUpload.property_id === propertyId) ||
            (competitorId && newUpload.competitor_id === competitorId) ||
            (!propertyId && !competitorId)
          ) {
            fetchUploads();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId, competitorId]);

  const fetchUploads = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('csv_uploads')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(10);

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      } else if (competitorId) {
        query = query.eq('competitor_id', competitorId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUploads(data || []);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (upload: CSVUpload) => {
    try {
      const { data, error } = await supabase.storage
        .from('rate-csvs')
        .download(upload.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = upload.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "CSV file downloaded",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (upload: CSVUpload) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('rate-csvs')
        .remove([upload.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('csv_uploads')
        .delete()
        .eq('id', upload.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Upload deleted",
      });

      fetchUploads();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload History - {entityName}</CardTitle>
        <CardDescription>Last 10 uploads (kept for 90 days)</CardDescription>
      </CardHeader>
      <CardContent>
        {uploads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No uploads yet
          </p>
        ) : (
          <div className="space-y-2">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{upload.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(upload.uploaded_at), 'MMM dd, yyyy HH:mm')} · {upload.record_count} rates
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(upload)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(upload)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};