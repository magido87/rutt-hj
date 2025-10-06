import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Save, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const savedKey = localStorage.getItem("google_maps_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error("API-nyckel kan inte vara tom");
      return;
    }

    localStorage.setItem("google_maps_api_key", apiKey.trim());
    toast.success("API-nyckel sparad!");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="icon" className="h-12 w-12">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Inställningar</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Google Maps API-nyckel</CardTitle>
            <CardDescription>
              Din API-nyckel sparas lokalt i webbläsaren och delas aldrig med andra.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-base font-medium">
                API-nyckel
              </Label>
              <Input
                id="apiKey"
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Klistra in din Google Maps API-nyckel här..."
                className="h-12 text-base border-2"
              />
            </div>

            <Button onClick={handleSave} className="h-12 px-6 text-base w-full md:w-auto">
              <Save className="h-5 w-5 mr-2" />
              Spara nyckel
            </Button>

            <div className="pt-4 border-t space-y-2">
              <h3 className="font-semibold text-foreground">Hur skaffar jag en API-nyckel?</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground text-sm">
                <li>Gå till Google Cloud Console</li>
                <li>Skapa ett nytt projekt eller välj ett befintligt</li>
                <li>Aktivera "Maps JavaScript API", "Places API", "Directions API" och "Distance Matrix API"</li>
                <li>Skapa en API-nyckel under "Credentials"</li>
                <li>Kopiera nyckeln och klistra in den här</li>
              </ol>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline text-sm mt-2"
              >
                <ExternalLink className="h-4 w-4" />
                Öppna Google Cloud Console
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
