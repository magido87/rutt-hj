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
import { 
  Plus, 
  Settings as SettingsIcon, 
  Route, 
  AlertCircle, 
  Loader2, 
  CalendarIcon, 
  Clock, 
  Upload,
  Truck,
  Sparkles,
  MapPin,
  Zap,
  Trash2,
  Keyboard
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();
  const settings = getSettings();
  
  const [startAddress, setStartAddress] = useState<Address>({
    value: settings.defaultStartAddress || "",
    placeId: undefined,
  });
  const [endAddress, setEndAddress] = useState<Address>({
    value: settings.defaultEndAddress || "",
    placeId: undefined,
  });
  const [addresses, setAddresses] = useState<Address[]>([
    { value: "", placeId: undefined },
  ]);
  const [apiKey, setApiKey] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [routeMode, setRouteMode] = useState<"standard" | "traffic">("standard");
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [departureTime, setDepartureTime] = useState("07:00");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  const { isLoaded, error } = useGoogleMaps(apiKey);

  useEffect(() => {
    const settings = getSettings();
    if (settings.apiKey) {
      setApiKey(settings.apiKey);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      } else if (e.key === "o" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleOptimize();
      } else if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleAddMore();
      } else if (e.key === "i" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowBulkImport(true);
      } else if (e.key === "," && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        navigate("/settings");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [apiKey, isLoaded, startAddress]);

  const handleAddressChange = (index: number, value: string, placeId?: string) => {
    const newAddresses = [...addresses];
    newAddresses[index] = { value, placeId };
    
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
      ...Array(5).fill(null).map(() => ({ value: "", placeId: undefined })),
    ];
    setAddresses(newAddresses);
    toast.success("5 falt tillagda");
  };

  const handleBulkImport = (importedAddresses: Address[]) => {
    const nonEmptyAddresses = addresses.filter(addr => addr.value.trim() !== "");
    const newAddresses = [...nonEmptyAddresses, ...importedAddresses];
    newAddresses.push({ value: "", placeId: undefined });
    setAddresses(newAddresses);
  };

  const handleOptimize = async () => {
    if (!apiKey) {
      toast.error("Lagg till din API-nyckel i installningar forst");
      return;
    }

    if (!startAddress.value.trim()) {
      toast.error("Du maste ange en startadress");
      return;
    }

    const filledAddresses = addresses.filter((addr) => addr.value.trim() !== "");
    const finalEndAddress = endAddress.value.trim() || startAddress.value;
    const allAddresses = [
      startAddress,
      ...filledAddresses,
      { value: finalEndAddress, placeId: endAddress.placeId }
    ];
    
    if (allAddresses.length < 2) {
      toast.error("Du behover minst en startadress och en slutadress");
      return;
    }

    if (allAddresses.length > 100) {
      toast.error("Max 100 stopp stods. Ta bort nagra adresser.");
      return;
    }

    if (!isLoaded || !(window as any).google) {
      toast.error("Google Maps laddas fortfarande. Vanta ett ogonblick.");
      return;
    }

    setIsOptimizing(true);
    setOptimizedRoute(null);

    try {
      let apiDepartureTime: Date | undefined = undefined;
      if (routeMode === "traffic") {
        if (departureDate) {
          const [hours, minutes] = departureTime.split(":").map(Number);
          apiDepartureTime = new Date(departureDate);
          apiDepartureTime.setHours(hours, minutes, 0, 0);
          
          const now = new Date();
          if (apiDepartureTime <= now) {
            apiDepartureTime = new Date(now.getTime() + 5 * 60 * 1000);
          }
        } else {
          apiDepartureTime = new Date(Date.now() + 5 * 60 * 1000);
        }
      }
      
      const result = await optimizeRoute(allAddresses, apiKey, apiDepartureTime);
      saveRoute(result, apiDepartureTime, routeMode);
      setOptimizedRoute(result);
      toast.success(`Rutt optimerad! ${result.segments.length} stopp`);
      
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
      toast.error(error.message || "Kunde inte optimera rutten.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const filledCount = addresses.filter((addr) => addr.value.trim() !== "").length;
  const totalStops = 1 + filledCount + (endAddress.value.trim() ? 1 : 0);

  return (
    <div className="min-h-screen bg-background relative">
      <div className="animated-bg" />
      
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 animate-fade-in">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div className="animate-fade-in stagger-1">
                <h1 className="text-xl font-bold tracking-tight">RUTT</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Smart ruttplanering</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hidden sm:flex"
                onClick={() => setShowShortcuts(prev => !prev)}
                title="Tangentbordsgenvagar (?)"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
              <FontToggle />
              <ThemeToggle />
              <Link to="/settings">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {showShortcuts && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowShortcuts(false)}
        >
          <Card className="w-full max-w-md mx-4 glass-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Tangentbordsgenvagar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Optimera rutt</span>
                <div className="flex gap-1">
                  <span className="kbd">Cmd</span>
                  <span className="kbd">O</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Lagg till falt</span>
                <div className="flex gap-1">
                  <span className="kbd">Cmd</span>
                  <span className="kbd">N</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Bulk import</span>
                <div className="flex gap-1">
                  <span className="kbd">Cmd</span>
                  <span className="kbd">I</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Installningar</span>
                <div className="flex gap-1">
                  <span className="kbd">Cmd</span>
                  <span className="kbd">,</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Visa/dolj genvagar</span>
                <div className="flex gap-1">
                  <span className="kbd">?</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Tryck utanfor for att stanga
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-24">
        <TrafficTicker />
        
        {filledCount > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-border/50 animate-fade-in-up">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{totalStops}</p>
                <p className="text-xs text-muted-foreground">stopp totalt</p>
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Route className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{filledCount}</p>
                <p className="text-xs text-muted-foreground">mellanliggande</p>
              </div>
            </div>
            {routeMode === "traffic" && (
              <>
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Trafiklage</p>
                    <p className="text-xs text-muted-foreground">aktiverat</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <SavedRoutes />

        {!apiKey && (
          <Card className="border-warning/50 bg-warning/5 animate-fade-in-up">
            <CardContent className="flex items-start gap-4 pt-6">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">API-nyckel saknas</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Du behover lagga till din Google Maps API-nyckel for att anvanda ruttoptimering.
                </p>
                <Link to="/settings">
                  <Button size="sm" className="btn-shine">
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    Ga till installningar
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive/50 bg-destructive/5 animate-fade-in-up">
            <CardContent className="flex items-start gap-4 pt-6">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Google Maps-fel</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="card-elevated animate-fade-in-up stagger-1">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  Start & Slut
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <StartEndInput
                  value={startAddress.value}
                  onChange={(value, placeId) => setStartAddress({ value, placeId })}
                  label="Startadress"
                  type="start"
                  apiKey={apiKey}
                  placeholder="Var borjar rutten?"
                />
                <StartEndInput
                  value={endAddress.value}
                  onChange={(value, placeId) => setEndAddress({ value, placeId })}
                  label="Slutadress (valfritt)"
                  type="end"
                  apiKey={apiKey}
                  placeholder="Lamna tomt for att atervanda till start"
                />
              </CardContent>
            </Card>

            <Card className="card-elevated animate-fade-in-up stagger-2">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                      <Route className="h-4 w-4 text-white" />
                    </div>
                    Mellanliggande stopp
                  </CardTitle>
                  <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {filledCount} ifyllda
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {addresses.map((address, index) => (
                  <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.03}s` }}>
                    <AddressInput
                      index={index}
                      value={address.value}
                      onChange={handleAddressChange}
                      onRemove={handleRemoveAddress}
                      showRemove={addresses.length > 1}
                      apiKey={apiKey}
                    />
                  </div>
                ))}

                <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
                  <Button
                    onClick={handleClearAll}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Rensa
                  </Button>
                  <Button
                    onClick={() => setShowBulkImport(true)}
                    variant="ghost"
                    size="sm"
                    disabled={!apiKey || !isLoaded}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                  <Button
                    onClick={handleAddMore}
                    variant="ghost"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Lagg till 5
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="card-elevated animate-fade-in-up stagger-3">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-warning to-warning/50 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  Ruttlage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={routeMode} onValueChange={(value) => setRouteMode(value as "standard" | "traffic")}>
                  <label 
                    htmlFor="standard" 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      routeMode === "standard" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value="standard" id="standard" />
                    <div>
                      <p className="font-medium">Standard</p>
                      <p className="text-xs text-muted-foreground">Kortaste vagen</p>
                    </div>
                  </label>
                  <label 
                    htmlFor="traffic" 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      routeMode === "traffic" 
                        ? "border-accent bg-accent/5" 
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <RadioGroupItem value="traffic" id="traffic" />
                    <div>
                      <p className="font-medium">Trafikoptimerad</p>
                      <p className="text-xs text-muted-foreground">Anpassad efter trafik</p>
                    </div>
                  </label>
                </RadioGroup>

                {routeMode === "traffic" && (
                  <div className="space-y-3 pt-3 border-t border-border/50 animate-fade-in">
                    <Label className="text-sm">Avresetid (valfritt)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "justify-start text-left font-normal h-10",
                              !departureDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                            {departureDate ? format(departureDate, "d MMM", { locale: sv }) : "Datum"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                          <Calendar
                            mode="single"
                            selected={departureDate}
                            onSelect={setDepartureDate}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            className="p-3"
                          />
                        </PopoverContent>
                      </Popover>

                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="time"
                          value={departureTime}
                          onChange={(e) => setDepartureTime(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lamna tomt for att anvanda aktuell trafik
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleOptimize}
              disabled={!apiKey || !isLoaded || !startAddress.value.trim() || isOptimizing}
              className={cn(
                "w-full h-14 text-base font-semibold rounded-xl btn-shine transition-all",
                "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              )}
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Optimerar...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Optimera rutt
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Tryck <span className="kbd text-[10px]">Cmd</span> + <span className="kbd text-[10px]">O</span> for att optimera
            </p>
          </div>
        </div>
      </main>

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
