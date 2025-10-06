import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Construction, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface TrafficIncident {
  id: string;
  message: string;
  type: string;
  severity: string;
  location: string;
  startTime?: string;
}

export const TrafficTicker = () => {
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    fetchTrafficIncidents();
    
    // Uppdatera var 5:e minut
    const interval = setInterval(() => {
      fetchTrafficIncidents();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (incidents.length > 0 && isExpanded) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % incidents.length);
      }, 8000); // Byt meddelande var 8:e sekund

      return () => clearInterval(timer);
    }
  }, [incidents.length, isExpanded]);

  const fetchTrafficIncidents = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('trafikverket', {
        body: { 
          // Göteborgsområdet: lat ~57.7, lng ~11.9-12.1
          bounds: {
            north: 57.85,
            south: 57.60,
            east: 12.20,
            west: 11.75
          }
        }
      });

      if (error) throw error;

      if (data?.incidents) {
        setIncidents(data.incidents);
      }
    } catch (error) {
      console.error('Error fetching traffic:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Olycka':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'Vägarbete':
        return <Construction className="h-4 w-4 text-warning" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-accent" />;
    }
  };

  const getVariant = (type: string) => {
    switch (type) {
      case 'Olycka':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return null;
  }

  const currentIncident = incidents.length > 0 ? incidents[currentIndex] : null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm animate-in slide-in-from-top duration-500">
      {/* Header med minimize-knapp */}
      <div className="flex items-center justify-between bg-card border border-border rounded-t-lg px-3 py-1.5 shadow-md">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">
            Trafik Göteborg {incidents.length > 0 && `(${incidents.length})`}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Content (kan minimeras) */}
      {isExpanded && (
        <div className="bg-card border border-t-0 border-border rounded-b-lg shadow-md animate-in slide-in-from-top duration-300">
          {currentIncident ? (
            <Alert variant={getVariant(currentIncident.type)} className="border-0 rounded-none rounded-b-lg py-2">
              <div className="flex items-start gap-2">
                {getIcon(currentIncident.type)}
                <div className="flex-1 min-w-0">
                  <AlertDescription className="text-xs">
                    <span className="font-semibold">{currentIncident.type}:</span>{" "}
                    {currentIncident.message}
                    {currentIncident.location && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        📍 {currentIncident.location}
                      </div>
                    )}
                  </AlertDescription>
                </div>
                {incidents.length > 1 && (
                  <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {currentIndex + 1}/{incidents.length}
                  </div>
                )}
              </div>
            </Alert>
          ) : (
            <div className="p-3 text-xs text-muted-foreground text-center">
              Inga trafikvarningar i Göteborg just nu ✅
            </div>
          )}
        </div>
      )}
    </div>
  );
};