import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";

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

export default function CompetitorConfig() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [editingCompetitor, setEditingCompetitor] = useState<string | null>(null);
  const [newCompetitor, setNewCompetitor] = useState({ name: "", booking_url: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchCompetitors(selectedProperty);
    }
  }, [selectedProperty]);

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProperties(data || []);
      if (data && data.length > 0 && !selectedProperty) {
        setSelectedProperty(data[0].id);
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCompetitors(data || []);
    }
  };

  const addCompetitor = async () => {
    if (!newCompetitor.name || !newCompetitor.booking_url) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("competitors")
      .insert({
        property_id: selectedProperty,
        name: newCompetitor.name,
        booking_url: newCompetitor.booking_url,
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Competitor added" });
      setNewCompetitor({ name: "", booking_url: "" });
      fetchCompetitors(selectedProperty);
    }
  };

  const updateCompetitor = async (id: string, updates: Partial<Competitor>) => {
    const { error } = await supabase
      .from("competitors")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Competitor updated" });
      setEditingCompetitor(null);
      fetchCompetitors(selectedProperty);
    }
  };

  const deleteCompetitor = async (id: string) => {
    const { error } = await supabase
      .from("competitors")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Competitor deleted" });
      fetchCompetitors(selectedProperty);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-6">
        <h1 className="mb-6 text-3xl font-bold">Competitor Configuration</h1>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium">Select Property</label>
          <select
            className="w-full rounded-md border bg-card p-2"
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
          >
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>

        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-xl font-semibold">Add New Competitor</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Competitor Name</label>
              <Input
                placeholder="Hotel Name"
                value={newCompetitor.name}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Booking.com URL</label>
              <Input
                placeholder="https://www.booking.com/..."
                value={newCompetitor.booking_url}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, booking_url: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={addCompetitor} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add Competitor
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Competitors</h2>
          <div className="space-y-4">
            {competitors.map((competitor) => (
              <div key={competitor.id} className="flex items-center gap-4 rounded-lg border p-4">
                {editingCompetitor === competitor.id ? (
                  <>
                    <div className="flex-1 grid gap-4 md:grid-cols-2">
                      <Input
                        defaultValue={competitor.name}
                        id={`name-${competitor.id}`}
                      />
                      <Input
                        defaultValue={competitor.booking_url}
                        id={`url-${competitor.id}`}
                      />
                    </div>
                    <Button
                      size="icon"
                      onClick={() => {
                        const name = (document.getElementById(`name-${competitor.id}`) as HTMLInputElement).value;
                        const booking_url = (document.getElementById(`url-${competitor.id}`) as HTMLInputElement).value;
                        updateCompetitor(competitor.id, { name, booking_url });
                      }}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingCompetitor(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-medium">{competitor.name}</div>
                      <div className="text-sm text-muted-foreground">{competitor.booking_url}</div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingCompetitor(competitor.id)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteCompetitor(competitor.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
            {competitors.length === 0 && (
              <p className="text-center text-muted-foreground">No competitors configured yet</p>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}