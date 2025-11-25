import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RouteMap } from "@/components/RouteMap";
import { TrafficTicker } from "@/components/TrafficTicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExportMenu } from "@/components/ExportMenu";
import { SendEmailDialog } from "@/components/SendEmailDialog";
import { ShareRouteDialog } from "@/components/ShareRouteDialog";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Route, 
  AlertCircle, 
  Mail, 
  Share2,
  Navigation,
  Truck,
  CheckCircle2,
  ChevronRight,
  Zap,
  Timer,
  TrendingUp,
  GripVertical
} from "lucide-react";
import { DraggableStopList } from "@/components/DraggableStopList";
import { cn } from "@/lib/utils";

interface RouteSegment {
  order: number;
  address: string;
  distance: number;
  duration: number;
  cumulativeDistance: number;
  cumulativeDuration: number;
}

interface OptimizedRoute {
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  polyline: string;
  apiCalls: number;
  warnings?: string[];
  departureTime?: number;
  routeMode?: "standard" | "traffic";
  alternativeRoutes?: Array<{
    segments: RouteSegment[];
    totalDistance: number;
    totalDuration: number;
    polyline: string;
  }>;
}

const formatDistance = (meters: number): string => {
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
};

const formatDurationShort = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export default function MapView() {
  const location = useLocation();
  const navigate = useNavigate();
  const [routeData, setRouteData] = useState<OptimizedRoute | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [routeId, setRouteId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("map");
  const [modifiedSegments, setModifiedSegments] = useState<RouteSegment[] | null>(null);
  const [isOrderModified, setIsOrderModified] = useState(false);

  const { isLoaded } = useGoogleMaps(apiKey);

  useEffect(() => {
    // Hämta API-nyckel
    const savedKey = localStorage.getItem("google_maps_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    }

    // Kolla om det är en delad rutt
    const urlParams = new URLSearchParams(location.search);
    const sharedId = urlParams.get('shared');
    
    if (sharedId) {
      // Ladda delad rutt från localStorage
      const savedRoutes = localStorage.getItem("saved_routes");
      if (savedRoutes) {
        try {
          const routes = JSON.parse(savedRoutes);
          const sharedRoute = routes.find((r: any) => r.id === sharedId);
          if (sharedRoute) {
            setRouteData(sharedRoute.route);
            setRouteId(sharedId);
            return;
          }
        } catch (e) {
          console.error("Failed to load shared route:", e);
        }
      }
    }

    // Hämta rutt-data från state eller sessionStorage
    const stateData = location.state?.routeData;
    if (stateData) {
      setRouteData(stateData);
      // Generera ID för denna rutt
      const newId = `route-${Date.now()}`;
      setRouteId(newId);
      // Spara i sessionStorage som backup
      sessionStorage.setItem("optimized_route", JSON.stringify(stateData));
    } else {
      // Försök läsa från sessionStorage
      const savedRoute = sessionStorage.getItem("optimized_route");
      if (savedRoute) {
        try {
          const parsed = JSON.parse(savedRoute);
          setRouteData(parsed);
          setRouteId(`route-${Date.now()}`);
        } catch (e) {
          console.error("Failed to parse saved route:", e);
        }
      }
    }
  }, [location]);

  if (!routeData) {
    return (
      <div className="min-h-screen bg-background relative">
        <div className="animated-bg" />
        <div className="max-w-6xl mx-auto p-4 md:p-8 pt-20">
          <Card className="card-elevated border-warning/50 bg-warning/5 animate-fade-in-up">
            <CardContent className="flex items-start gap-4 pt-6">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="font-semibold text-lg text-foreground mb-2">Ingen rutt hittades</p>
                <p className="text-muted-foreground mb-4">
                  Gå tillbaka till startsidan och optimera en rutt först.
                </p>
                <Link to="/">
                  <Button className="btn-shine">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Tillbaka till start
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { segments, totalDistance, totalDuration, polyline, apiCalls, warnings, alternativeRoutes } = routeData;
  
  // Välj vilken rutt som ska visas (huvudrutt eller alternativ)
  const baseRoute = selectedRouteIndex === 0 
    ? { segments, totalDistance, totalDuration, polyline }
    : alternativeRoutes?.[selectedRouteIndex - 1] || { segments, totalDistance, totalDuration, polyline };
  
  // Use modified segments if user has reordered
  const currentRoute = {
    ...baseRoute,
    segments: modifiedSegments || baseRoute.segments
  };

  const handleReorderSegments = (newSegments: RouteSegment[]) => {
    setModifiedSegments(newSegments);
    setIsOrderModified(true);
  };

  const handleResetOrder = () => {
    setModifiedSegments(null);
    setIsOrderModified(false);
  };

  // Calculate average speed
  const avgSpeed = currentRoute.totalDistance > 0 && currentRoute.totalDuration > 0
    ? Math.round((currentRoute.totalDistance / 1000) / (currentRoute.totalDuration / 3600))
    : 0;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Animated Background */}
      <div className="animated-bg" />
      
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Back & Title */}
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center shadow-lg shadow-accent/20">
                  <Navigation className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">Optimerad rutt</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {currentRoute.segments.length} stopp • {formatDistance(currentRoute.totalDistance)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmailDialog(true)}
                className="hidden sm:flex h-9"
              >
                <Mail className="h-4 w-4 mr-2" />
                Maila
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareDialog(true)}
                className="hidden sm:flex h-9"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Dela
              </Button>
              <ExportMenu
                segments={segments}
                totalDistance={totalDistance}
                totalDuration={totalDuration}
              />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-24">
        {/* Traffic Ticker */}
        <TrafficTicker />
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up">
          <Card className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{currentRoute.segments.length}</p>
                <p className="text-xs text-muted-foreground">stopp</p>
              </div>
            </div>
          </Card>
          
          <Card className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Route className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{formatDistance(currentRoute.totalDistance).replace(' km', '')}</p>
                <p className="text-xs text-muted-foreground">km totalt</p>
              </div>
            </div>
          </Card>
          
          <Card className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Timer className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{formatDurationShort(currentRoute.totalDuration)}</p>
                <p className="text-xs text-muted-foreground">körtid</p>
              </div>
            </div>
          </Card>
          
          <Card className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{avgSpeed}</p>
                <p className="text-xs text-muted-foreground">km/h snitt</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Route Info Banner */}
        {(routeData.departureTime || routeData.routeMode || warnings?.length) && (
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-muted/50 border border-border/50 animate-fade-in-up stagger-1">
            {routeData.departureTime && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium">
                <Zap className="h-3.5 w-3.5" />
                <span>
                  {new Date(routeData.departureTime).toLocaleDateString("sv-SE", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })} kl {new Date(routeData.departureTime).toLocaleTimeString("sv-SE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            {routeData.routeMode === "traffic" && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-sm font-medium">
                <Zap className="h-3.5 w-3.5" />
                Trafikoptimerad
              </div>
            )}
            {routeData.routeMode === "standard" && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Route className="h-3.5 w-3.5" />
                Standardrutt
              </div>
            )}
            {apiCalls && (
              <div className="text-xs text-muted-foreground ml-auto">
                {apiCalls} API-anrop
              </div>
            )}
          </div>
        )}

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <Card className="border-warning/50 bg-warning/5 animate-fade-in-up stagger-2">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm">{warnings.join(" • ")}</p>
            </CardContent>
          </Card>
        )}

        {/* Alternative Routes */}
        {alternativeRoutes && alternativeRoutes.length > 0 && (
          <Card className="card-elevated animate-fade-in-up stagger-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Välj rutt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedRouteIndex(0)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all hover-lift",
                    selectedRouteIndex === 0 
                      ? "border-primary bg-primary/5 shadow-md" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {selectedRouteIndex === 0 && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    <span className="font-semibold">Huvudrutt</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    {formatDistance(totalDistance)} • {formatDuration(totalDuration)}
                  </p>
                </button>
                {alternativeRoutes.map((alt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedRouteIndex(idx + 1)}
                    className={cn(
                      "p-3 rounded-xl border-2 text-left transition-all hover-lift",
                      selectedRouteIndex === idx + 1 
                        ? "border-accent bg-accent/5 shadow-md" 
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {selectedRouteIndex === idx + 1 && <CheckCircle2 className="h-4 w-4 text-accent" />}
                      <span className="font-semibold">Alternativ {idx + 1}</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {formatDistance(alt.totalDistance)} • {formatDuration(alt.totalDuration)}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map & List Tabs */}
        <Card className="card-elevated overflow-hidden animate-fade-in-up stagger-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full max-w-xs grid-cols-2 h-10">
                <TabsTrigger value="map" className="text-sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  Karta
                </TabsTrigger>
                <TabsTrigger value="list" className="text-sm">
                  <Route className="h-4 w-4 mr-2" />
                  Lista
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-0">
              <TabsContent value="map" className="mt-0">
                <div className="p-4">
                  <RouteMap apiKey={apiKey} polyline={currentRoute.polyline} segments={currentRoute.segments} />
                </div>
              </TabsContent>

              <TabsContent value="list" className="mt-0">
                <div className="p-4">
                  <DraggableStopList 
                    segments={currentRoute.segments}
                    onReorder={handleReorderSegments}
                    onReset={handleResetOrder}
                    isModified={isOrderModified}
                  />
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Mobile Action Buttons */}
        <div className="flex gap-2 sm:hidden">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => setShowEmailDialog(true)}
          >
            <Mail className="h-4 w-4 mr-2" />
            Maila PDF
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Dela rutt
          </Button>
        </div>
      </main>

      {/* Dialogs */}
      <SendEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        routeData={routeData}
      />
      <ShareRouteDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        routeId={routeId}
      />
    </div>
  );
}
