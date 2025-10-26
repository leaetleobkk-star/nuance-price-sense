import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { toast } = useToast();
  const [showServiceKey, setShowServiceKey] = useState(false);
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const maskKey = (key: string) => {
    if (!key) return "";
    return `${key.substring(0, 20)}...${key.substring(key.length - 20)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-8 px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Manage your Lovable Cloud backend credentials
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Supabase Credentials</CardTitle>
              <CardDescription>
                Use these credentials to configure external services like Railway
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Supabase URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Supabase URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                    {supabaseUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(supabaseUrl, "Supabase URL")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Project ID */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Project ID</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                    {projectId}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(projectId, "Project ID")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Anon Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Anon (Public) Key</label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                    {showServiceKey ? supabaseAnonKey : maskKey(supabaseAnonKey)}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowServiceKey(!showServiceKey)}
                  >
                    {showServiceKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(supabaseAnonKey, "Anon Key")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Service Role Key Note */}
              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-medium text-destructive">Service Role Key</label>
                <p className="text-sm text-muted-foreground mb-3">
                  The service role key is a sensitive credential that bypasses Row Level Security. 
                  For security reasons, it's not exposed in the frontend app.
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  To get your service role key:
                </p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2 ml-2">
                  <li>Open your Lovable Cloud backend dashboard</li>
                  <li>Navigate to Settings → API</li>
                  <li>Find "Service Role Key" (starts with eyJ...)</li>
                  <li>Copy the entire JWT token</li>
                </ol>
                <div className="pt-4">
                  <Button
                    onClick={() => window.open(`https://supabase.com/dashboard/project/${projectId}/settings/api`, '_blank')}
                    variant="default"
                  >
                    Open Backend Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Railway Configuration</CardTitle>
              <CardDescription>
                Use these values in your Railway environment variables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
                <div>SUPABASE_URL={supabaseUrl}</div>
                <div>SUPABASE_SERVICE_ROLE_KEY=[Get from backend dashboard]</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
