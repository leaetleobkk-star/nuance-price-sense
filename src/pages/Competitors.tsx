import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { PropertySelector } from "@/components/PropertySelector";
import { useProperty } from "@/contexts/PropertyContext";
import { CSVUploadHistory } from "@/components/CSVUploadHistory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ExternalLink } from "lucide-react";

interface Property {
  id: string;
  name: string;
  booking_url: string | null;
}

interface Competitor {
  id: string;
  property_id: string;
  name: string;
  booking_url: string | null;
}

const Competitors = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedProperty, properties, setSelectedProperty, refreshProperties } = useProperty();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>("");
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingCompetitor, setIsUploadingCompetitor] = useState(false);
  const [isUploadingProperty, setIsUploadingProperty] = useState(false);
  const [isAddPropertyDialogOpen, setIsAddPropertyDialogOpen] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState("");
  const [newPropertyUrl, setNewPropertyUrl] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchCompetitors(selectedProperty.id);
    }
  }, [selectedProperty]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };


  const fetchCompetitors = async (propertyId: string) => {
    const { data, error } = await supabase
      .from("competitors")
      .select("*")
      .eq("property_id", propertyId)
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load competitors",
        variant: "destructive",
      });
    } else {
      setCompetitors(data || []);
    }
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    setIsLoading(true);
    const { error } = await supabase.from("competitors").insert({
      property_id: selectedProperty.id,
      name: newCompetitorName,
      booking_url: newCompetitorUrl || null,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Competitor added successfully",
      });
      setNewCompetitorName("");
      setNewCompetitorUrl("");
      fetchCompetitors(selectedProperty.id);
    }
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setIsLoading(true);
    const { data, error } = await supabase.from("properties").insert({
      user_id: session.user.id,
      name: newPropertyName,
      booking_url: newPropertyUrl || null,
    }).select().single();

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Property created successfully",
      });
      setNewPropertyName("");
      setNewPropertyUrl("");
      setIsAddPropertyDialogOpen(false);
      
      // Refresh properties and select the new one
      await refreshProperties();
      if (data) {
        setSelectedProperty(data);
      }
    }
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Find Date column
    const dateIdx = headers.findIndex(h => h.toLowerCase() === 'date');
    if (dateIdx === -1) {
      throw new Error('CSV must have a "Date" column');
    }

    // Find Room and Price columns for A1 and A2
    const roomA1Idx = headers.findIndex(h => h.includes('Room_A1'));
    const priceA1Idx = headers.findIndex(h => h.includes('Price_A1'));
    const roomA2Idx = headers.findIndex(h => h.includes('Room_A2'));
    const priceA2Idx = headers.findIndex(h => h.includes('Price_A2'));

    const rates: Array<{
      check_in_date: string;
      adults: number;
      room_type: string | null;
      price_amount: number;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = lines[i].split(',').map(v => v.trim());
      const dateStr = values[dateIdx];
      
      if (!dateStr) continue;

      // Parse date - handle both YYYY-MM-DD and M/D/YYYY formats
      let isoDate: string;
      if (dateStr.includes('/')) {
        const [month, day, year] = dateStr.split('/');
        isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        isoDate = dateStr; // Already in YYYY-MM-DD format
      }

      // Only add rate for A1 if both room and price exist and price is valid
      if (roomA1Idx !== -1 && priceA1Idx !== -1) {
        const room = values[roomA1Idx];
        const priceStr = values[priceA1Idx];
        const price = parseFloat(priceStr);
        if (room && priceStr && !isNaN(price) && price > 0) {
          rates.push({
            check_in_date: isoDate,
            adults: 1,
            room_type: room,
            price_amount: price,
          });
        }
      }

      // Only add rate for A2 if both room and price exist and price is valid
      if (roomA2Idx !== -1 && priceA2Idx !== -1) {
        const room = values[roomA2Idx];
        const priceStr = values[priceA2Idx];
        const price = parseFloat(priceStr);
        if (room && priceStr && !isNaN(price) && price > 0) {
          rates.push({
            check_in_date: isoDate,
            adults: 2,
            room_type: room,
            price_amount: price,
          });
        }
      }
    }

    return rates;
  };

  const handleCompetitorCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompetitorId) return;

    setIsUploadingCompetitor(true);
    
    try {
      const text = await file.text();
      const rates = parseCSV(text);

      if (rates.length === 0) {
        throw new Error('No valid rate data found in CSV');
      }

      // Get user ID for storage path
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Store CSV file in storage with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `${session.user.id}/competitor_${selectedCompetitorId}_${timestamp}.csv`;
      const { error: uploadError } = await supabase.storage
        .from('rate-csvs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Delete existing rates for this competitor to avoid duplicates
      await supabase.from('scraped_rates')
        .delete()
        .eq('competitor_id', selectedCompetitorId);

      // Insert rates into database
      const ratesToInsert = rates.map(rate => {
        const checkInDate = new Date(rate.check_in_date);
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + 1);
        
        return {
          ...rate,
          check_out_date: checkOutDate.toISOString().split('T')[0],
          competitor_id: selectedCompetitorId,
          currency: 'THB',
        };
      });

      const { error } = await supabase.from('scraped_rates').insert(ratesToInsert);

      if (error) throw error;

      // Track upload in history
      await supabase.from('csv_uploads').insert({
        user_id: session.user.id,
        competitor_id: selectedCompetitorId,
        file_name: file.name,
        file_path: filePath,
        record_count: rates.length,
      });

      toast({
        title: "Success",
        description: `Uploaded ${rates.length} rates for competitor`,
      });

      // Reset file input
      e.target.value = '';
    } catch (error: any) {
      console.error('CSV upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to parse CSV file",
        variant: "destructive",
      });
    } finally {
      setIsUploadingCompetitor(false);
    }
  };

  const handlePropertyCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProperty) return;

    setIsUploadingProperty(true);
    
    try {
      const text = await file.text();
      const rates = parseCSV(text);

      if (rates.length === 0) {
        throw new Error('No valid rate data found in CSV');
      }

      // Get user ID for storage path
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Store CSV file in storage with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `${session.user.id}/property_${selectedProperty.id}_${timestamp}.csv`;
      const { error: uploadError } = await supabase.storage
        .from('rate-csvs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Delete existing rates for this property to avoid duplicates
      await supabase.from('scraped_rates')
        .delete()
        .eq('property_id', selectedProperty.id);

      // Insert rates into database
      const ratesToInsert = rates.map(rate => {
        const checkInDate = new Date(rate.check_in_date);
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + 1);
        
        return {
          ...rate,
          check_out_date: checkOutDate.toISOString().split('T')[0],
          property_id: selectedProperty.id,
          currency: 'THB',
        };
      });

      const { error } = await supabase.from('scraped_rates').insert(ratesToInsert);

      if (error) throw error;

      // Track upload in history
      await supabase.from('csv_uploads').insert({
        user_id: session.user.id,
        property_id: selectedProperty.id,
        file_name: file.name,
        file_path: filePath,
        record_count: rates.length,
      });

      toast({
        title: "Success",
        description: `Uploaded ${rates.length} rates for your property`,
      });

      // Reset file input
      e.target.value = '';
    } catch (error: any) {
      console.error('CSV upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to parse CSV file",
        variant: "destructive",
      });
    } finally {
      setIsUploadingProperty(false);
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    const { error } = await supabase.from("competitors").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete competitor",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Competitor deleted",
      });
      if (selectedProperty) {
        fetchCompetitors(selectedProperty.id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PropertySelector />
      <main className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Competitor Management</h1>
            <p className="text-muted-foreground">Add competitors and upload CSV pricing data</p>
          </div>
          <Dialog open={isAddPropertyDialogOpen} onOpenChange={setIsAddPropertyDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddProperty}>
                <DialogHeader>
                  <DialogTitle>Add New Property</DialogTitle>
                  <DialogDescription>
                    Create a new property to track rates and competitors
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="property-name">Property Name</Label>
                    <Input
                      id="property-name"
                      placeholder="e.g., My Hotel Bangkok"
                      value={newPropertyName}
                      onChange={(e) => setNewPropertyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="property-url">Booking.com URL (Optional)</Label>
                    <Input
                      id="property-url"
                      type="url"
                      placeholder="https://www.booking.com/hotel/..."
                      value={newPropertyUrl}
                      onChange={(e) => setNewPropertyUrl(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Property"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {!selectedProperty ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create Your First Property</CardTitle>
              <CardDescription>Start by adding a property to track competitors</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Create your first property to start managing competitors
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Property Data</CardTitle>
                  <CardDescription>Upload CSV file with your property's pricing data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="property-csv-upload">CSV File</Label>
                    <Input
                      id="property-csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handlePropertyCSVUpload}
                      disabled={isUploadingProperty}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Expected format: Date, Room_A1, Price_A1, Room_A2, Price_A2, Currency
                    </p>
                  </div>

                  {isUploadingProperty && (
                    <div className="text-sm text-muted-foreground">
                      Uploading and processing...
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Add Competitor</CardTitle>
                  <CardDescription>Add a competitor to track their pricing</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddCompetitor} className="space-y-4">

                    <div className="space-y-2">
                      <Label htmlFor="competitor-name">Competitor Name</Label>
                      <Input
                        id="competitor-name"
                        placeholder="e.g., Hilton Pattaya"
                        value={newCompetitorName}
                        onChange={(e) => setNewCompetitorName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="competitor-url">Booking.com URL (Optional)</Label>
                      <Input
                        id="competitor-url"
                        type="url"
                        placeholder="https://www.booking.com/hotel/..."
                        value={newCompetitorUrl}
                        onChange={(e) => setNewCompetitorUrl(e.target.value)}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Competitor
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upload Competitor Data</CardTitle>
                  <CardDescription>Upload CSV file with pricing data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="upload-competitor">Select Competitor</Label>
                    <Select value={selectedCompetitorId} onValueChange={setSelectedCompetitorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose competitor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {competitors.map((competitor) => (
                          <SelectItem key={competitor.id} value={competitor.id}>
                            {competitor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="csv-upload">CSV File</Label>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleCompetitorCSVUpload}
                      disabled={!selectedCompetitorId || isUploadingCompetitor}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Expected format: Date, Room_A1, Price_A1, Room_A2, Price_A2, Currency
                    </p>
                  </div>

                  {isUploadingCompetitor && (
                    <div className="text-sm text-muted-foreground">
                      Uploading and processing...
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>My Property</CardTitle>
                  <CardDescription>
                    {selectedProperty?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{selectedProperty?.name}</p>
                        {selectedProperty?.booking_url && (
                          <a
                            href={selectedProperty.booking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                          >
                            View on Booking.com
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Configured Competitors</CardTitle>
                  <CardDescription>
                    {competitors.length} competitor{competitors.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {competitors.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No competitors configured yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {competitors.map((competitor) => (
                        <div
                          key={competitor.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{competitor.name}</p>
                            {competitor.booking_url && (
                              <a
                                href={competitor.booking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                              >
                                View on Booking.com
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCompetitor(competitor.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Upload History Section */}
            <div className="mt-6">
              <Tabs defaultValue="property">
                <TabsList>
                  <TabsTrigger value="property">Property Uploads</TabsTrigger>
                  <TabsTrigger value="competitors">Competitor Uploads</TabsTrigger>
                </TabsList>
                <TabsContent value="property" className="mt-4">
                  {selectedProperty && (
                    <CSVUploadHistory 
                      propertyId={selectedProperty.id}
                      entityName={selectedProperty.name}
                    />
                  )}
                </TabsContent>
                <TabsContent value="competitors" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {competitors.map((competitor) => (
                      <CSVUploadHistory 
                        key={competitor.id}
                        competitorId={competitor.id}
                        entityName={competitor.name}
                      />
                    ))}
                    {competitors.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8 col-span-2">
                        No competitors configured
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Competitors;
