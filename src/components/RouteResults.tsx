import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RouteMap } from "./RouteMap";
import { MapPin, Clock, Route } from "lucide-react";

interface RouteSegment {
  order: number;
  address: string;
  distance: number;
  duration: number;
  cumulativeDistance: number;
  cumulativeDuration: number;
}

interface RouteResultsProps {
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  polyline: string;
  apiKey: string;
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

export const RouteResults = ({
  segments,
  totalDistance,
  totalDuration,
  polyline,
  apiKey,
}: RouteResultsProps) => {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-6 w-6 text-accent" />
          Optimerad rutt
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
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="list" className="text-base">
              Lista
            </TabsTrigger>
            <TabsTrigger value="map" className="text-base">
              Karta
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="map" className="mt-4">
            <RouteMap apiKey={apiKey} polyline={polyline} segments={segments} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
