import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [properties, setProperties] = useState<Property[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>("");
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchCompetitors(selectedPropertyId);
    }
  }, [selectedPropertyId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive",
      });
    } else if (data) {
      setProperties(data);
      if (data.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(data[0].id);
      }
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
    if (!selectedPropertyId) return;

    setIsLoading(true);
    const { error } = await supabase.from("competitors").insert({
      property_id: selectedPropertyId,
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
      fetchCompetitors(selectedPropertyId);
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
      const values = lines[i].split(',').map(v => v.trim());
      const dateStr = values[dateIdx];
      
      if (!dateStr) continue;

      // Parse date (M/D/YYYY format)
      const [month, day, year] = dateStr.split('/');
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Add A1 (1 adult) rate if available
      if (roomA1Idx !== -1 && priceA1Idx !== -1) {
        const room = values[roomA1Idx];
        const price = parseFloat(values[priceA1Idx]);
        if (!isNaN(price) && price > 0) {
          rates.push({
            check_in_date: isoDate,
            adults: 1,
            room_type: room || null,
            price_amount: price,
          });
        }
      }

      // Add A2 (2 adults) rate if available
      if (roomA2Idx !== -1 && priceA2Idx !== -1) {
        const room = values[roomA2Idx];
        const price = parseFloat(values[priceA2Idx]);
        if (!isNaN(price) && price > 0) {
          rates.push({
            check_in_date: isoDate,
            adults: 2,
            room_type: room || null,
            price_amount: price,
          });
        }
      }
    }

    return rates;
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompetitorId) return;

    setIsUploading(true);
    
    try {
      const text = await file.text();
      const rates = parseCSV(text);

      if (rates.length === 0) {
        throw new Error('No valid rate data found in CSV');
      }

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
      setIsUploading(false);
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
      fetchCompetitors(selectedPropertyId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Competitor Management</h1>
          <p className="text-muted-foreground">Add competitors and upload CSV pricing data</p>
        </div>

        {properties.length === 0 ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create Your First Property</CardTitle>
              <CardDescription>Start by adding a property to track competitors</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('property-name') as string;
                const booking_url = formData.get('property-url') as string;
                
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const { error } = await supabase.from("properties").insert({
                  user_id: session.user.id,
                  name,
                  booking_url: booking_url || null,
                });

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
                  fetchProperties();
                  e.currentTarget.reset();
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="property-name">Property Name</Label>
                  <Input
                    id="property-name"
                    name="property-name"
                    placeholder="e.g., My Hotel Pattaya"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property-url">Booking.com URL (Optional)</Label>
                  <Input
                    id="property-url"
                    name="property-url"
                    type="url"
                    placeholder="https://www.booking.com/hotel/..."
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Property
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Add Competitor</CardTitle>
                  <CardDescription>Add a competitor to track their pricing</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddCompetitor} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="property">Property</Label>
                      <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

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
                      onChange={handleCSVUpload}
                      disabled={!selectedCompetitorId || isUploading}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Expected format: Date, Room_A1, Price_A1, Room_A2, Price_A2
                    </p>
                  </div>

                  {isUploading && (
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
                    {selectedPropertyId && properties.find((p) => p.id === selectedPropertyId)?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedPropertyId && (() => {
                    const property = properties.find((p) => p.id === selectedPropertyId);
                    return (
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{property?.name}</p>
                            {property?.booking_url && (
                              <a
                                href={property.booking_url}
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
                    );
                  })()}
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
          </>
        )}
      </main>
    </div>
  );
};

export default Competitors;
