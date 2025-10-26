import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Save, X, Building2 } from "lucide-react";

interface Property {
  id: string;
  name: string;
  booking_url: string | null;
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);
  const [newProperty, setNewProperty] = useState({ name: "", booking_url: "" });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchProperties();
  }, []);

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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProperties(data || []);
    }
  };

  const addProperty = async () => {
    if (!newProperty.name) {
      toast({ title: "Error", description: "Please enter a property name", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("properties")
      .insert({
        name: newProperty.name,
        booking_url: newProperty.booking_url || null,
        user_id: user.id,
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Property added successfully" });
      setNewProperty({ name: "", booking_url: "" });
      fetchProperties();
    }
  };

  const updateProperty = async (id: string, updates: Partial<Property>) => {
    const { error } = await supabase
      .from("properties")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Property updated successfully" });
      setEditingProperty(null);
      fetchProperties();
    }
  };

  const deleteProperty = async (id: string) => {
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Property deleted successfully" });
      fetchProperties();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            My Properties
          </h1>
          <Button variant="outline" onClick={() => navigate("/competitors")}>
            Manage Competitors
          </Button>
        </div>

        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-xl font-semibold">Add New Property</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Property Name</label>
              <Input
                placeholder="My Hotel Name"
                value={newProperty.name}
                onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Booking.com URL (Optional)</label>
              <Input
                placeholder="https://www.booking.com/..."
                value={newProperty.booking_url}
                onChange={(e) => setNewProperty({ ...newProperty, booking_url: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={addProperty} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Your Properties</h2>
          <div className="space-y-4">
            {properties.map((property) => (
              <div key={property.id} className="flex items-center gap-4 rounded-lg border p-4">
                {editingProperty === property.id ? (
                  <>
                    <div className="flex-1 grid gap-4 md:grid-cols-2">
                      <Input
                        defaultValue={property.name}
                        id={`name-${property.id}`}
                      />
                      <Input
                        defaultValue={property.booking_url || ""}
                        placeholder="Booking URL (optional)"
                        id={`url-${property.id}`}
                      />
                    </div>
                    <Button
                      size="icon"
                      onClick={() => {
                        const name = (document.getElementById(`name-${property.id}`) as HTMLInputElement).value;
                        const booking_url = (document.getElementById(`url-${property.id}`) as HTMLInputElement).value;
                        updateProperty(property.id, { name, booking_url: booking_url || null });
                      }}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingProperty(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-medium">{property.name}</div>
                      {property.booking_url && (
                        <div className="text-sm text-muted-foreground">{property.booking_url}</div>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingProperty(property.id)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteProperty(property.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
            {properties.length === 0 && (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No properties yet. Add your first property to get started!</p>
              </div>
            )}
          </div>
        </Card>

        {properties.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Next Steps:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Add competitors for your properties (click "Manage Competitors" above)</li>
              <li>Go to the main dashboard to start comparing rates</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}
