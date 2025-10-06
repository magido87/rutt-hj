import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressInput } from "@/components/AddressInput";
import { StartEndInput } from "@/components/StartEndInput";
import { SavedRoutes } from "@/components/SavedRoutes";
import { TrafficTicker } from "@/components/TrafficTicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FontToggle } from "@/components/FontToggle";
import { BulkImport } from "@/components/BulkImport";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { optimizeRoute, OptimizedRoute } from "@/utils/routeOptimizer";
import { saveRoute } from "@/utils/routeStorage";
import { getSettings } from "@/types/settings";
import { Address } from "@/types/route";
import { toast } from "sonner";
import { Plus, Settings as SettingsIcon, Route, AlertCircle, Loader2, CalendarIcon, Clock, Upload } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();

  // Kontrollera inloggning
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);
  
  // Ladda inställningar
  const settings = getSettings();
  
  // Start och slutadress
  const [startAddress, setStartAddress] = useState<Address>({
    value: settings.defaultStartAddress || "Fraktvägen, Mölnlycke",
    placeId: undefined,
  });
  const [endAddress, setEndAddress] = useState<Address>({
    value: settings.defaultEndAddress || "Fraktvägen, Mölnlycke",
    placeId: undefined,
  });
  
  // Mellanliggande stopp
  const [addresses, setAddresses] = useState<Address[]>([
    { value: "Dalhemsvägen 2, Torslanda", placeId: undefined },
    { value: "Lingonvägen 35, Floda", placeId: undefined },
    { value: "Importgatan 15, Hisings Backa", placeId: undefined },
    { value: "Tranvägen 8, Sävedalen", placeId: undefined },
    { value: "Tranbärsvägen 3, Floda", placeId: undefined },
    { value: "Norra Dalhemsvägen 10, Torslanda", placeId: undefined },
    { value: "Exportgatan 32, Hisings Backa", placeId: undefined },
    { value: "Östra Hamngatan 37, Göteborg", placeId: undefined },
    { value: "Kungsportsavenyen 21, Göteborg", placeId: undefined },
    { value: "Lundby Hamngata 10, Göteborg", placeId: undefined },
  ]);
  const [apiKey, setApiKey] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  
  // Trafikoptimering
  const [routeMode, setRouteMode] = useState<"standard" | "traffic">("standard");
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [departureTime, setDepartureTime] = useState("07:00");
  
  // Bulk import
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  const { isLoaded, error } = useGoogleMaps(apiKey);

  useEffect(() => {
    const settings = getSettings();
    if (settings.apiKey) {
      setApiKey(settings.apiKey);
    }
  }, []);

  const handleAddressChange = (index: number, value: string, placeId?: string) => {
    const newAddresses = [...addresses];
    newAddresses[index] = { value, placeId };
    
    // Om det sista fältet fylls i, lägg till ett nytt tomt fält
    if (index === addresses.length - 1 && value.trim() !== "") {
      newAddresses.push({ value: "", placeId: undefined });
    }
    
    setAddresses(newAddresses);
  };

  const handleRemoveAddress = (index: number) => {
    const newAddresses = addresses.filter((_, i) => i !== index);
    setAddresses(newAddresses);
    toast.success("Adress borttagen");
  };

  const handleClearAll = () => {
    setAddresses([{ value: "", placeId: undefined }]);
    toast.success("Listan rensad");
  };

  const handleAddMore = () => {
    const newAddresses = [
      ...addresses,
      ...Array(10).fill({ value: "", placeId: undefined }),
    ];
    setAddresses(newAddresses);
    toast.success("10 fält tillagda");
  };

  const handleBulkImport = (importedAddresses: Address[]) => {
    // Ta bort tomma adresser först
    const nonEmptyAddresses = addresses.filter(addr => addr.value.trim() !== "");
    
    // Lägg till importerade adresser
    const newAddresses = [...nonEmptyAddresses, ...importedAddresses];
    
    // Lägg till ett tomt fält i slutet
    newAddresses.push({ value: "", placeId: undefined });
    
    setAddresses(newAddresses);
  };

  const handleOptimize = async () => {
    console.log("🚀 Optimera rutt - START");
    
    // Validering 1: API-nyckel
    if (!apiKey) {
      console.error("❌ API-nyckel saknas");
      toast.error("Lägg till din API-nyckel i inställningar först");
      return;
    }

    // Validering 2: Start och slut måste finnas
    if (!startAddress.value.trim()) {
      console.error("❌ Startadress saknas");
      toast.error("Du måste ange en startadress");
      return;
    }

    // Validering 3: Minst 1 adress (start räknas)
    const filledAddresses = addresses.filter((addr) => addr.value.trim() !== "");
    console.log(`📍 Start: ${startAddress.value}`);
    console.log(`📍 ${filledAddresses.length} mellanliggande stopp`);
    console.log(`📍 Slut: ${endAddress.value || startAddress.value}`);

    // Bygg komplett adresslista: start + mellanliggande + slut
    const finalEndAddress = endAddress.value.trim() || startAddress.value;
    const allAddresses = [
      startAddress,
      ...filledAddresses,
      { value: finalEndAddress, placeId: endAddress.placeId }
    ];

    console.log(`📦 Total: ${allAddresses.length} stopp`);
    
    if (allAddresses.length < 2) {
      console.error("❌ För få adresser");
      toast.error("Du behöver minst en startadress och en slutadress (eller mellanliggande stopp)");
      return;
    }

    // Validering 4: Max 100 stopp
    if (allAddresses.length > 100) {
      console.error("❌ För många adresser");
      toast.error("Max 100 stopp stöds. Ta bort några adresser.");
      return;
    }

    // Validering 5: Google Maps måste vara laddat
    if (!isLoaded || !(window as any).google) {
      console.error("❌ Google Maps inte laddat");
      toast.error("Google Maps laddas fortfarande. Vänta ett ögonblick.");
      return;
    }

    setIsOptimizing(true);
    setOptimizedRoute(null);

    try {
      console.log("⚙️ Kör optimering...");
      
      // Bygg departureTime för API:et
      let apiDepartureTime: Date | undefined = undefined;
      if (routeMode === "traffic") {
        if (departureDate) {
          const [hours, minutes] = departureTime.split(":").map(Number);
          apiDepartureTime = new Date(departureDate);
          apiDepartureTime.setHours(hours, minutes, 0, 0);
          
          // VIKTIGT: Kontrollera att tiden är i framtiden
          const now = new Date();
          if (apiDepartureTime <= now) {
            console.warn("⚠️ Vald tid är i det förflutna, använder 'nu' istället");
            apiDepartureTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 min framåt
          }
          
          console.log(`🚦 TRAFIKOPTIMERAD FÖR: ${format(apiDepartureTime, "EEEE 'den' do MMMM 'kl' HH:mm", { locale: sv })}`);
          console.log(`📅 Timestamp: ${apiDepartureTime.getTime()}`);
        } else {
          // "Nu" = 5 minuter framåt för att Google Maps ska acceptera det
          apiDepartureTime = new Date(Date.now() + 5 * 60 * 1000);
          console.log(`🚦 TRAFIKOPTIMERAD FÖR: NU (${format(apiDepartureTime, "EEEE HH:mm", { locale: sv })})`);
        }
      } else {
        console.log("📍 STANDARD-RUTT (ingen trafikdata används)");
      }
      
      const result = await optimizeRoute(allAddresses, apiKey, apiDepartureTime);
      console.log("✅ Optimering klar!", result);
      console.log(`⏱️ TOTAL TID: ${Math.floor(result.totalDuration / 3600)}h ${Math.floor((result.totalDuration % 3600) / 60)}min`);
      console.log(`📏 TOTAL STRÄCKA: ${(result.totalDistance / 1000).toFixed(1)} km`);
      
      // Spara hela det optimerade resultatet med avresetid
      saveRoute(result, apiDepartureTime, routeMode);
      
      setOptimizedRoute(result);
      toast.success(`Rutt optimerad! ${result.segments.length} stopp`);
      
      // Navigera till karta-sidan med resultatet
      console.log("🗺️ Navigerar till /karta");
      navigate("/karta", { 
        state: { 
          routeData: {
            ...result,
            departureTime: apiDepartureTime?.getTime(),
            routeMode: routeMode
          }
        }
      });
    } catch (error: any) {
      console.error("❌ Optimeringsfel:", error);
      toast.error(error.message || "Kunde inte optimera rutten. Kontrollera din API-nyckel och internetanslutning.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const filledCount = addresses.filter((addr) => addr.value.trim() !== "").length;
  const totalStops = 1 + filledCount + (endAddress.value.trim() ? 1 : 0); // start + mellanliggande + slut

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10 shadow-sm backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Ruttoptimering
          </h1>
          <div className="flex items-center gap-2">
            <FontToggle />
            <ThemeToggle />
            <Link to="/settings">
              <Button variant="outline" className="h-12 px-4">
                <SettingsIcon className="h-5 w-5 md:mr-2" />
                <span className="hidden md:inline">Inställningar</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Trafikvarningar - nu som floating widget */}
        <TrafficTicker />
        
        {/* Tidigare rutter */}
        <SavedRoutes />

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
            <CardTitle>Start och slutadress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StartEndInput
              value={startAddress.value}
              onChange={(value, placeId) => setStartAddress({ value, placeId })}
              label="Startadress"
              type="start"
              apiKey={apiKey}
              placeholder="Var börjar rutten?"
            />
            <StartEndInput
              value={endAddress.value}
              onChange={(value, placeId) => setEndAddress({ value, placeId })}
              label="Slutadress (valfritt)"
              type="end"
              apiKey={apiKey}
              placeholder="Lämna tomt för att återvända till start"
            />
          </CardContent>
        </Card>

        {/* Ruttläge och avresetid */}
        <Card>
          <CardHeader>
            <CardTitle>Ruttläge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={routeMode} onValueChange={(value) => setRouteMode(value as "standard" | "traffic")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard" id="standard" />
                <Label htmlFor="standard" className="cursor-pointer">
                  Standard
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="traffic" id="traffic" />
                <Label htmlFor="traffic" className="cursor-pointer">
                  Trafikoptimerad
                </Label>
              </div>
            </RadioGroup>

            {routeMode === "traffic" && (
              <div className="space-y-4 pt-2 border-t">
                <Label>Avresetid (valfritt - lämna tomt för "nu")</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal h-12",
                          !departureDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {departureDate ? format(departureDate, "PPP", { locale: sv }) : "Välj datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={departureDate}
                        onSelect={setDepartureDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Google använder historisk trafikdata för vald veckodag och tid
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Mellanliggande stopp ({filledCount} ifyllda)</span>
              <span className="text-sm font-normal text-muted-foreground">
                Totalt {totalStops} stopp
              </span>
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
                showRemove={true}
                apiKey={apiKey}
              />
            ))}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleClearAll}
                variant="outline"
                className="h-12 flex-1"
              >
                Rensa lista
              </Button>
              <Button
                onClick={() => setShowBulkImport(true)}
                variant="outline"
                className="h-12 flex-1"
                disabled={!apiKey || !isLoaded}
              >
                <Upload className="h-5 w-5 mr-2" />
                Bulk Import
              </Button>
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
                disabled={!apiKey || !isLoaded || !startAddress.value.trim() || isOptimizing}
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

      {/* Bulk Import Dialog */}
      <BulkImport
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        onImport={handleBulkImport}
        apiKey={apiKey}
      />
    </div>
  );
};

export default Index;
