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
import { ArrowLeft, MapPin, Clock, Route, AlertCircle, Mail, Share2 } from "lucide-react";

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
    return `${hours} h ${minutes} min`;
  }
  return `${minutes} min`;
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
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-warning border-2">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="h-6 w-6 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">Ingen rutt hittades</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Gå tillbaka till startsidan och optimera en rutt först.
                </p>
                <Link to="/">
                  <Button>Tillbaka till start</Button>
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
  const currentRoute = selectedRouteIndex === 0 
    ? { segments, totalDistance, totalDuration, polyline }
    : alternativeRoutes?.[selectedRouteIndex - 1] || { segments, totalDistance, totalDuration, polyline };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10 shadow-sm backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="icon" className="h-12 w-12">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">
              Optimerad rutt
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmailDialog(true)}
              className="h-10"
            >
              <Mail className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Maila PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareDialog(true)}
              className="h-10"
            >
              <Share2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Dela rutt</span>
            </Button>
            <ExportMenu
              segments={segments}
              totalDistance={totalDistance}
              totalDuration={totalDuration}
            />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Trafikvarningar */}
        <TrafficTicker />
        
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-6 w-6 text-accent" />
              Ruttinformation
            </CardTitle>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>
                  <strong>{currentRoute.segments.length}</strong> stopp
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                <span>
                  <strong>{formatDistance(currentRoute.totalDistance)}</strong> total
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  <strong>{formatDuration(currentRoute.totalDuration)}</strong> körtid
                </span>
              </div>
              {apiCalls && (
                <div className="text-xs text-muted-foreground">
                  ({apiCalls} API-anrop)
                </div>
              )}
              {routeData.departureTime && (
                <div className="flex items-center gap-2 text-accent font-semibold">
                  <span>🚦</span>
                  <span>
                    {new Date(routeData.departureTime).toLocaleDateString("sv-SE", {
                      month: "short",
                      day: "numeric",
                    })} kl {new Date(routeData.departureTime).toLocaleTimeString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {routeData.routeMode === "standard" && (
                <div className="flex items-center gap-2">
                  <span>📍 Standard</span>
                </div>
              )}
            </div>
            {warnings && warnings.length > 0 && (
              <div className="mt-2 p-2 bg-warning/10 border border-warning/20 rounded text-sm text-warning-foreground">
                <strong>OBS:</strong> {warnings.join(" • ")}
              </div>
            )}
            
            {/* Alternativa rutter */}
            {alternativeRoutes && alternativeRoutes.length > 0 && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/20">
                <h3 className="text-sm font-semibold mb-3">Alternativa rutter</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    variant={selectedRouteIndex === 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRouteIndex(0)}
                    className="w-full"
                  >
                    <div className="text-left w-full">
                      <div className="font-semibold">Huvudrutt</div>
                      <div className="text-xs opacity-80">
                        {formatDistance(totalDistance)} • {formatDuration(totalDuration)}
                      </div>
                    </div>
                  </Button>
                  {alternativeRoutes.map((alt, idx) => (
                    <Button
                      key={idx}
                      variant={selectedRouteIndex === idx + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedRouteIndex(idx + 1)}
                      className="w-full"
                    >
                      <div className="text-left w-full">
                        <div className="font-semibold">Alternativ {idx + 1}</div>
                        <div className="text-xs opacity-80">
                          {formatDistance(alt.totalDistance)} • {formatDuration(alt.totalDuration)}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="map" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="map" className="text-base">
                  Karta
                </TabsTrigger>
                <TabsTrigger value="list" className="text-base">
                  Lista
                </TabsTrigger>
              </TabsList>

              <TabsContent value="map" className="mt-4">
                <RouteMap apiKey={apiKey} polyline={currentRoute.polyline} segments={currentRoute.segments} />
              </TabsContent>

              <TabsContent value="list" className="space-y-2 mt-4">
                {currentRoute.segments.map((segment, index) => (
                  <Card
                    key={index}
                    className={`border-l-4 ${
                      index === 0
                        ? "border-l-accent"
                        : index === currentRoute.segments.length - 1
                        ? "border-l-destructive"
                        : "border-l-primary"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-lg text-primary">
                              {segment.order}.
                            </span>
                            <span className="font-medium text-foreground">
                              {segment.address}
                            </span>
                            {index === 0 && (
                              <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground">
                                Start
                              </span>
                            )}
                            {index === currentRoute.segments.length - 1 && (
                              <span className="text-xs px-2 py-1 rounded-full bg-destructive text-destructive-foreground">
                                Slut
                              </span>
                            )}
                          </div>
                          {index > 0 && (
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-7">
                              <span>
                                <strong>Från förra:</strong>{" "}
                                {formatDistance(segment.distance)} •{" "}
                                {formatDuration(segment.duration)}
                              </span>
                              <span>
                                <strong>Totalt:</strong>{" "}
                                {formatDistance(segment.cumulativeDistance)} •{" "}
                                {formatDuration(segment.cumulativeDuration)}
                              </span>
                            </div>
                          )}
                        </div>
                        {index === 0 && (
                          <span className="text-xs font-semibold bg-accent text-accent-foreground px-2 py-1 rounded">
                            START
                          </span>
                        )}
                        {index === segments.length - 1 && (
                          <span className="text-xs font-semibold bg-destructive text-destructive-foreground px-2 py-1 rounded">
                            MÅL
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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
