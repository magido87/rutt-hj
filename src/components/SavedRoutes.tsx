import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SavedRoute, Address } from "@/types/route";
import { getSavedRoutes, deleteSavedRoute } from "@/utils/routeStorage";
import { Clock, MapPin, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface SavedRoutesProps {
  onLoadRoute: (startAddress: Address, endAddress: Address, addresses: Address[]) => void;
}

export const SavedRoutes = ({ onLoadRoute }: SavedRoutesProps) => {
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);

  const loadRoutes = () => {
    const routes = getSavedRoutes();
    setSavedRoutes(routes);
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const handleLoadRoute = (route: SavedRoute) => {
    onLoadRoute(route.startAddress, route.endAddress, route.addresses);
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(route.timestamp)}</span>
                    <span>•</span>
                    <MapPin className="h-3 w-3" />
                    <span>{route.totalStops} stopp</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-accent font-semibold min-w-[50px]">Start:</span>
                      <span className="truncate">{route.startAddress.value}</span>
                    </div>
                    {route.endAddress.value && route.endAddress.value !== route.startAddress.value && (
                      <div className="flex items-start gap-2">
                        <span className="text-destructive font-semibold min-w-[50px]">Slut:</span>
                        <span className="truncate">{route.endAddress.value}</span>
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
