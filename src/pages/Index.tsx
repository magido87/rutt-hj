import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressInput } from "@/components/AddressInput";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { optimizeRoute, OptimizedRoute } from "@/utils/routeOptimizer";
import { toast } from "sonner";
import { Plus, Settings as SettingsIcon, Route, AlertCircle, Loader2 } from "lucide-react";

interface Address {
  value: string;
  placeId?: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>(
    Array(10).fill({ value: "", placeId: undefined })
  );
  const [apiKey, setApiKey] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const { isLoaded, error } = useGoogleMaps(apiKey);

  useEffect(() => {
    const savedKey = localStorage.getItem("google_maps_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleAddressChange = (index: number, value: string, placeId?: string) => {
    const newAddresses = [...addresses];
    newAddresses[index] = { value, placeId };
    setAddresses(newAddresses);
  };

  const handleRemoveAddress = (index: number) => {
    const newAddresses = addresses.filter((_, i) => i !== index);
    setAddresses(newAddresses);
    toast.success("Adress borttagen");
  };

  const handleAddMore = () => {
    const newAddresses = [
      ...addresses,
      ...Array(10).fill({ value: "", placeId: undefined }),
    ];
    setAddresses(newAddresses);
    toast.success("10 fält tillagda");
  };

  const handleOptimize = async () => {
    console.log("🚀 Optimera rutt - START");
    
    // Validering 1: API-nyckel
    if (!apiKey) {
      console.error("❌ API-nyckel saknas");
      toast.error("Lägg till din API-nyckel i inställningar först");
      return;
    }

    // Validering 2: Minst 2 adresser
    const filledAddresses = addresses.filter((addr) => addr.value.trim() !== "");
    console.log(`📍 ${filledAddresses.length} adresser ifyllda`, filledAddresses);
    
    if (filledAddresses.length < 2) {
      console.error("❌ För få adresser");
      toast.error("Du behöver minst 2 adresser för att optimera en rutt");
      return;
    }

    // Validering 3: Max 50 stopp (vi hanterar upp till 50)
    if (filledAddresses.length > 50) {
      console.error("❌ För många adresser");
      toast.error("Max 50 stopp stöds. Ta bort några adresser.");
      return;
    }

    // Validering 4: Google Maps måste vara laddat
    if (!isLoaded || !(window as any).google) {
      console.error("❌ Google Maps inte laddat");
      toast.error("Google Maps laddas fortfarande. Vänta ett ögonblick.");
      return;
    }

    setIsOptimizing(true);
    setOptimizedRoute(null);

    try {
      console.log("⚙️ Kör optimering...");
      const result = await optimizeRoute(filledAddresses, apiKey);
      console.log("✅ Optimering klar!", result);
      
      setOptimizedRoute(result);
      toast.success(`Rutt optimerad! ${result.segments.length} stopp`);
      
      // Navigera till karta-sidan med resultatet
      console.log("🗺️ Navigerar till /karta");
      navigate("/karta", { 
        state: { routeData: result }
      });
    } catch (error: any) {
      console.error("❌ Optimeringsfel:", error);
      toast.error(error.message || "Kunde inte optimera rutten. Kontrollera din API-nyckel och internetanslutning.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const filledCount = addresses.filter((addr) => addr.value.trim() !== "").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Ruttoptimering
          </h1>
          <Link to="/settings">
            <Button variant="outline" className="h-12 px-4">
              <SettingsIcon className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Inställningar</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* API Key Warning */}
        {!apiKey && (
          <Card className="border-warning border-2">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="h-6 w-6 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">API-nyckel saknas</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Du behöver lägga till din Google Maps API-nyckel i inställningar för att
                  använda ruttoptimering.
                </p>
                <Link to="/settings">
                  <Button size="sm" className="h-10">
                    Gå till inställningar
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Google Maps Error */}
        {error && (
          <Card className="border-destructive border-2">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">Google Maps-fel</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Address Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Adresser ({filledCount} ifyllda)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {addresses.map((address, index) => (
              <AddressInput
                key={index}
                index={index}
                value={address.value}
                onChange={handleAddressChange}
                onRemove={handleRemoveAddress}
                showRemove={addresses.length > 10}
                apiKey={apiKey}
              />
            ))}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleAddMore}
                variant="outline"
                className="h-12 flex-1"
              >
                <Plus className="h-5 w-5 mr-2" />
                Lägg till 10 fält till
              </Button>
              <Button
                onClick={handleOptimize}
                disabled={!apiKey || !isLoaded || filledCount < 2 || isOptimizing}
                className="h-12 flex-1 text-base font-semibold"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Optimerar...
                  </>
                ) : (
                  <>
                    <Route className="h-5 w-5 mr-2" />
                    Optimera rutt
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
