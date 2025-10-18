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
import { Plus, Trash2 } from "lucide-react";

interface Property {
  id: string;
  name: string;
  booking_url: string | null;
}

interface Competitor {
  id: string;
  property_id: string;
  name: string;
  booking_url: string;
}

const Competitors = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      booking_url: newCompetitorUrl,
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
          <p className="text-muted-foreground">Configure competitor URLs for price tracking</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Add Competitor</CardTitle>
              <CardDescription>Track competitor prices from Booking.com</CardDescription>
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
                  <Label htmlFor="competitor-url">Booking.com URL</Label>
                  <Input
                    id="competitor-url"
                    type="url"
                    placeholder="https://www.booking.com/hotel/..."
                    value={newCompetitorUrl}
                    onChange={(e) => setNewCompetitorUrl(e.target.value)}
                    required
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
              <CardTitle>Configured Competitors</CardTitle>
              <CardDescription>
                {selectedPropertyId
                  ? properties.find((p) => p.id === selectedPropertyId)?.name
                  : "Select a property"}
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
                        <p className="text-sm text-muted-foreground truncate">
                          {competitor.booking_url}
                        </p>
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
      </main>
    </div>
  );
};

export default Competitors;
