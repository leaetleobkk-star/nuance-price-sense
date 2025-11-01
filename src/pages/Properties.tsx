import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Save, X, Building2 } from "lucide-react";

interface Property {
  id: string;
  name: string;
  booking_url: string | null;
  pms_type?: string | null;
  lh_email?: string | null;
  lh_password?: string | null;
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);
  const [newProperty, setNewProperty] = useState({ name: "", booking_url: "" });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedPMS, setSelectedPMS] = useState<string>("");
  const [lhEmail, setLhEmail] = useState("");
  const [lhPassword, setLhPassword] = useState("");
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

  const savePropertyCredentials = async () => {
    if (!selectedPropertyId || selectedPMS !== "little-hotelier" || !lhEmail || !lhPassword) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("properties")
      .update({
        pms_type: selectedPMS,
        lh_email: lhEmail,
        lh_password: lhPassword,
      })
      .eq("id", selectedPropertyId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Little Hotelier credentials saved!" });
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

        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Configure Little Hotelier Integration</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Set up Little Hotelier credentials to enable automatic data updates from the Analytics page.
          </p>

          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Select Property</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
              >
                <option value="">Select a property...</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">PMS Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedPMS}
                onChange={(e) => setSelectedPMS(e.target.value)}
                disabled={!selectedPropertyId}
              >
                <option value="">Select PMS type...</option>
                <option value="little-hotelier">Little Hotelier</option>
                <option value="na">N/A</option>
              </select>
            </div>
          </div>

          {selectedPMS === "little-hotelier" && (
            <>
              <div className="grid gap-4 md:grid-cols-2 mb-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Little Hotelier Email</label>
                  <Input
                    type="email"
                    placeholder="your-email@example.com"
                    value={lhEmail}
                    onChange={(e) => setLhEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Little Hotelier Password</label>
                  <Input
                    type="password"
                    placeholder="Your password"
                    value={lhPassword}
                    onChange={(e) => setLhPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={savePropertyCredentials}
                disabled={!selectedPropertyId || !lhEmail || !lhPassword}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Credentials
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                After saving, go to Analytics page and click "Refresh Data" to pull latest Little Hotelier data.
              </p>
            </>
          )}
        </Card>

        {properties.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Configure Little Hotelier Integration:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Select a property above</li>
              <li>Choose "Little Hotelier" as PMS type</li>
              <li>Enter your Little Hotelier credentials</li>
              <li>Click "Save Credentials"</li>
              <li>Go to Analytics page and click "Refresh Data" to pull latest data</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}
