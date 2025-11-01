import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Save, X, Building2, RefreshCw, Download } from "lucide-react";

interface Property {
  id: string;
  name: string;
  booking_url: string | null;
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);
  const [newProperty, setNewProperty] = useState({ name: "", booking_url: "" });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedPMS, setSelectedPMS] = useState<string>("");
  const [lhEmail, setLhEmail] = useState("");
  const [lhPassword, setLhPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [scrapedData, setScrapedData] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const RAILWAY_API_URL = import.meta.env.VITE_RAILWAY_API_URL || "https://your-app.up.railway.app";

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

  const handleUpdateLittleHotelier = async () => {
    if (!lhEmail || !lhPassword) {
      toast({ 
        title: "Error", 
        description: "Please enter Little Hotelier credentials", 
        variant: "destructive" 
      });
      return;
    }

    setIsUpdating(true);
    setProgress(0);
    setStatusMessage("Starting Little Hotelier scraper...");
    setScrapedData(null);

    try {
      // Trigger Railway scraper
      const response = await fetch(`${RAILWAY_API_URL}/api/little-hotelier/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: lhEmail,
          password: lhPassword
        })
      });

      if (!response.ok) {
        throw new Error("Failed to start scraper");
      }

      const data = await response.json();
      const newTaskId = data.task_id;
      setTaskId(newTaskId);
      setStatusMessage("Scraper started, checking progress...");

      // Poll for progress
      let retries = 0;
      const maxRetries = 300; // 5 minutes max
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${RAILWAY_API_URL}/api/status/${newTaskId}`);
          
          if (!statusResponse.ok) {
            retries++;
            if (retries > 5) {
              throw new Error("Task not found");
            }
            return;
          }

          const statusData = await statusResponse.json();
          setProgress(statusData.progress || 0);
          setStatusMessage(statusData.message || "Processing...");

          if (statusData.status === "completed") {
            clearInterval(pollInterval);
            setIsUpdating(false);
            setProgress(100);
            setStatusMessage("Update completed successfully!");
            setScrapedData(statusData.result);
            
            toast({ 
              title: "Success", 
              description: `Scraped ${statusData.result?.room_types_count || 0} room types and ${statusData.result?.channels_count || 0} channels` 
            });
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
          console.error("Status check error:", error);
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

  const handleDownloadCSV = async (type: "room-types" | "channels") => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`${RAILWAY_API_URL}/api/little-hotelier/download/${type}/${taskId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({ title: "Error", description: "Failed to download CSV", variant: "destructive" });
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

        <Card className="mt-6 p-6 bg-gradient-to-br from-primary/5 to-primary/10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Little Hotelier Data Updater
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Connect to Little Hotelier to automatically update your Business Intelligence dashboard with the latest data.
          </p>

          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Select Property</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                disabled={isUpdating}
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
                disabled={isUpdating || !selectedPropertyId}
              >
                <option value="">Select PMS type...</option>
                <option value="little-hotelier">Little Hotelier</option>
                <option value="na">N/A</option>
              </select>
            </div>
          </div>

          {selectedPMS === "little-hotelier" && (
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Little Hotelier Email</label>
                <Input
                  type="email"
                  placeholder="your-email@example.com"
                  value={lhEmail}
                  onChange={(e) => setLhEmail(e.target.value)}
                  disabled={isUpdating}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Little Hotelier Password</label>
                <Input
                  type="password"
                  placeholder="Your password"
                  value={lhPassword}
                  onChange={(e) => setLhPassword(e.target.value)}
                  disabled={isUpdating}
                />
              </div>
            </div>
          )}

          <Button 
            onClick={handleUpdateLittleHotelier}
            disabled={isUpdating || !selectedPropertyId || selectedPMS !== "little-hotelier" || !lhEmail || !lhPassword}
            className="w-full mb-4"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
            {isUpdating ? "Updating..." : "Update BI Dashboard Data"}
          </Button>

          {isUpdating && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">{statusMessage}</p>
            </div>
          )}

          {scrapedData && !isUpdating && (
            <div className="mt-4 p-4 bg-background rounded-lg border border-primary/20">
              <h3 className="font-semibold text-primary mb-2">✓ Update Complete</h3>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>Room Types: <span className="font-semibold">{scrapedData.room_types_count || 0}</span></div>
                <div>Channels: <span className="font-semibold">{scrapedData.channels_count || 0}</span></div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDownloadCSV("room-types")}
                  className="flex-1"
                >
                  <Download className="mr-2 h-3 w-3" />
                  Room Types CSV
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDownloadCSV("channels")}
                  className="flex-1"
                >
                  <Download className="mr-2 h-3 w-3" />
                  Channels CSV
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-muted-foreground">
            <strong>Note:</strong> Your credentials are used only for this session and are not stored. 
            Railway will scrape your Little Hotelier data and update the BI dashboard automatically.
          </div>
        </Card>

        {properties.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Next Steps:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Add competitors for your properties (click "Manage Competitors" above)</li>
              <li>Update Little Hotelier data using the section above</li>
              <li>Go to the Analytics page to view your Business Intelligence dashboard</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}
