import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SavedRoute } from "@/types/route";
import { getSavedRoutes, deleteSavedRoute } from "@/utils/routeStorage";
import { Clock, MapPin, Trash2, RotateCcw, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";

export const SavedRoutes = () => {
  const navigate = useNavigate();
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);

  const loadRoutes = () => {
    const routes = getSavedRoutes();
    setSavedRoutes(routes);
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const handleLoadRoute = (route: SavedRoute) => {
    // Navigera direkt till karta-sidan med hela rutten
    navigate("/karta", {
      state: { routeData: route.routeData }
    });
    toast.success("Rutt laddad!");
  };

  const handleDeleteRoute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedRoute(id);
    loadRoutes();
    toast.success("Rutt borttagen");
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) return `Idag ${timeStr}`;
    if (isYesterday) return `Igår ${timeStr}`;

    return date.toLocaleDateString("sv-SE", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
    return `${minutes}min`;
  };

  if (savedRoutes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Tidigare rutter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {savedRoutes.map((route) => (
          <Card
            key={route.id}
            className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-primary"
            onClick={() => handleLoadRoute(route)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(route.timestamp)}</span>
                    <span>•</span>
                    <MapPin className="h-3 w-3" />
                    <span>{route.totalStops} stopp</span>
                    {route.departureTime && (
                      <>
                        <span>•</span>
                        <span className="text-accent font-medium">
                          🚦 {new Date(route.departureTime).toLocaleDateString("sv-SE", {
                            month: "short",
                            day: "numeric",
                          })} kl {new Date(route.departureTime).toLocaleTimeString("sv-SE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </>
                    )}
                    {route.routeMode === "standard" && (
                      <>
                        <span>•</span>
                        <span className="text-muted-foreground">📍 Standard</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-accent font-semibold min-w-[50px]">Start:</span>
                      <span className="truncate">{route.startAddress}</span>
                    </div>
                    {route.endAddress && route.endAddress !== route.startAddress && (
                      <div className="flex items-start gap-2">
                        <span className="text-destructive font-semibold min-w-[50px]">Slut:</span>
                        <span className="truncate">{route.endAddress}</span>
                      </div>
                    )}
                    {route.routeData && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <RouteIcon className="h-3 w-3" />
                          {formatDistance(route.routeData.totalDistance)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(route.routeData.totalDuration)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={(e) => handleDeleteRoute(route.id, e)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};
