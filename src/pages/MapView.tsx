import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RouteMap } from "@/components/RouteMap";
import { ArrowLeft, MapPin, Clock, Route, AlertCircle } from "lucide-react";

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
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    // Hämta API-nyckel
    const savedKey = localStorage.getItem("google_maps_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    }

    // Hämta rutt-data från state eller sessionStorage
    const stateData = location.state?.routeData;
    if (stateData) {
      setRouteData(stateData);
      // Spara i sessionStorage som backup
      sessionStorage.setItem("optimized_route", JSON.stringify(stateData));
    } else {
      // Försök läsa från sessionStorage
      const savedRoute = sessionStorage.getItem("optimized_route");
      if (savedRoute) {
        try {
          setRouteData(JSON.parse(savedRoute));
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

  const { segments, totalDistance, totalDuration, polyline, apiCalls } = routeData;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-2 border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="icon" className="h-12 w-12">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Optimerad rutt
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
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
                  <strong>{segments.length}</strong> stopp
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                <span>
                  <strong>{formatDistance(totalDistance)}</strong> total
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  <strong>{formatDuration(totalDuration)}</strong> körtid
                </span>
              </div>
              {apiCalls && (
                <div className="text-xs">
                  ({apiCalls} API-anrop)
                </div>
              )}
            </div>
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
                <RouteMap apiKey={apiKey} polyline={polyline} segments={segments} />
              </TabsContent>

              <TabsContent value="list" className="space-y-2 mt-4">
                {segments.map((segment, index) => (
                  <Card
                    key={index}
                    className={`border-l-4 ${
                      index === 0
                        ? "border-l-accent"
                        : index === segments.length - 1
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
    </div>
  );
}
