import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Construction, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  useEffect(() => {
    fetchTrafficIncidents();
    
    // Uppdatera var 5:e minut
    const interval = setInterval(() => {
      fetchTrafficIncidents();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (incidents.length > 0) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % incidents.length);
      }, 8000); // Byt meddelande var 8:e sekund

      return () => clearInterval(timer);
    }
  }, [incidents.length]);

  const fetchTrafficIncidents = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('trafikverket', {
        body: { bounds: null }
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

  if (incidents.length === 0) {
    return (
      <div className="animate-in slide-in-from-top duration-500">
        <Alert className="border-l-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-accent" />
            <AlertDescription className="text-sm">
              Inga trafikvarningar just nu.
            </AlertDescription>
          </div>
        </Alert>
      </div>
    );
  }

  const currentIncident = incidents[currentIndex];

  return (
    <div className="animate-in slide-in-from-top duration-500">
      <Alert variant={getVariant(currentIncident.type)} className="border-l-4">
        <div className="flex items-center gap-3">
          {getIcon(currentIncident.type)}
          <div className="flex-1 min-w-0">
            <AlertDescription className="text-sm">
              <span className="font-semibold">{currentIncident.type}:</span>{" "}
              {currentIncident.message}
              {currentIncident.location && (
                <span className="text-muted-foreground ml-2">
                  📍 {currentIncident.location}
                </span>
              )}
            </AlertDescription>
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {currentIndex + 1} / {incidents.length}
          </div>
        </div>
      </Alert>
    </div>
  );
};