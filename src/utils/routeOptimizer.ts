import { getSettings } from "@/types/settings";

interface Address {
  value: string;
  placeId?: string;
}

interface RouteSegment {
  order: number;
  address: string;
  distance: number; // meters
  duration: number; // seconds
  cumulativeDistance: number;
  cumulativeDuration: number;
}

export interface OptimizedRoute {
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  polyline: string;
  apiCalls: number;
  warnings: string[];
}

// Hjälpfunktion: Dela upp waypoints i segment (max 23 waypoints per segment för säkerhet)
const segmentWaypoints = (waypoints: any[], maxPerSegment: number = 23) => {
  const segments: any[][] = [];
  for (let i = 0; i < waypoints.length; i += maxPerSegment) {
    segments.push(waypoints.slice(i, i + maxPerSegment));
  }
  return segments;
};

// Hjälpfunktion: Sy ihop polylines
const stitchPolylines = (polylines: string[], google: any): string => {
  if (polylines.length === 0) return "";
  if (polylines.length === 1) return polylines[0];
  
  // Avkoda alla polylines
  const allPaths = polylines.map(p => 
    google.maps.geometry.encoding.decodePath(p)
  );
  
  // Kombinera alla punkter
  const combinedPath = allPaths.flat();
  
  // Koda tillbaka
  return google.maps.geometry.encoding.encodePath(combinedPath);
};

export const optimizeRoute = async (
  addresses: Address[],
  apiKey: string,
  departureTime?: Date
): Promise<OptimizedRoute> => {
  console.log("🔧 optimizeRoute() START", { addressCount: addresses.length });
  
  if (addresses.length < 2) {
    throw new Error("Behöver minst 2 adresser");
  }

  const google = (window as any).google;
  if (!google) {
    throw new Error("Google Maps är inte laddat");
  }

  const directionsService = new google.maps.DirectionsService();
  const warnings: string[] = [];
  let apiCalls = 0;

  // Hämta inställningar för trafikmodell (används endast om departureTime finns)
  const settings = getSettings();
  const trafficModel = settings.trafficModel || "best_guess";
  if (departureTime) {
    console.log("🚦 Trafikoptimerad med modell:", trafficModel);
  } else {
    console.log("📍 Standard-rutt (ingen trafikdata)");
  }

  // Start och slutpunkt
  const origin = addresses[0].value;
  const destination = addresses[addresses.length - 1].value;
  const allWaypoints = addresses.slice(1, -1).map((addr: Address) => ({
    location: addr.value,
    stopover: true,
  }));

  console.log("📍 Rutt:", { 
    origin, 
    destination, 
    totalWaypoints: allWaypoints.length,
    totalStops: addresses.length 
  });

  // Om <= 25 waypoints, kör som vanligt
  if (allWaypoints.length <= 25) {
    console.log("✅ Standard rutt (≤25 waypoints)");
    apiCalls++;
    
    try {
      console.log("🌐 Anropar Directions API...");
      
      const result = await new Promise<any>((resolve, reject) => {
      directionsService.route(
        {
          origin,
          destination,
          waypoints: allWaypoints,
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.DRIVING,
          ...(departureTime && {
            drivingOptions: {
              departureTime: departureTime,
              trafficModel: google.maps.TrafficModel[trafficModel.toUpperCase() as keyof typeof google.maps.TrafficModel],
            }
          }),
          region: "SE",
        },
          (result: any, status: any) => {
            console.log("📡 Directions API svar:", status);
            if (status === "OK") {
              resolve(result);
            } else if (status === "ZERO_RESULTS") {
              reject(new Error("Inga rutter hittades mellan dessa adresser"));
            } else if (status === "OVER_QUERY_LIMIT") {
              reject(new Error("API-gräns nådd. Vänta en stund och försök igen."));
            } else {
              reject(new Error(`Directions API-fel: ${status}`));
            }
          }
        );
      });

      return buildRouteResult(result, addresses, apiCalls, warnings);
    } catch (error: any) {
      console.error("❌ Route optimization error:", error);
      throw error;
    }
  }

  // SEGMENTERING: Dela upp i flera segment
  console.log("🔀 Segmenterad rutt (>25 waypoints) - delar upp i segment");
  const waypointSegments = segmentWaypoints(allWaypoints);
  console.log(`📦 Skapade ${waypointSegments.length} segment`);

  const allLegs: any[] = [];
  const allPolylines: string[] = [];
  let currentOrigin = origin;

  // Kör varje segment
  for (let i = 0; i < waypointSegments.length; i++) {
    const segment = waypointSegments[i];
    const isLastSegment = i === waypointSegments.length - 1;
    const segmentDestination = isLastSegment ? destination : segment[segment.length - 1].location;
    const segmentWaypoints = isLastSegment ? segment : segment.slice(0, -1);

    console.log(`🔄 Segment ${i + 1}/${waypointSegments.length}:`, {
      origin: currentOrigin,
      waypoints: segmentWaypoints.length,
      destination: segmentDestination,
    });

    apiCalls++;

    try {
      const result = await new Promise<any>((resolve, reject) => {
      directionsService.route(
        {
          origin: currentOrigin,
          destination: segmentDestination,
          waypoints: segmentWaypoints,
          optimizeWaypoints: false,
          travelMode: google.maps.TravelMode.DRIVING,
          ...(departureTime && {
            drivingOptions: {
              departureTime: departureTime,
              trafficModel: google.maps.TrafficModel[trafficModel.toUpperCase() as keyof typeof google.maps.TrafficModel],
            }
          }),
          region: "SE",
        },
          (result: any, status: any) => {
            if (status === "OK") {
              resolve(result);
            } else if (status === "ZERO_RESULTS") {
              reject(new Error(`Segment ${i + 1}: Inga rutter hittades`));
            } else if (status === "OVER_QUERY_LIMIT") {
              reject(new Error("API-gräns nådd. Vänta en stund och försök igen."));
            } else {
              reject(new Error(`Segment ${i + 1}: Directions API-fel: ${status}`));
            }
          }
        );
      });

      // Samla legs och polyline
      allLegs.push(...result.routes[0].legs);
      allPolylines.push(result.routes[0].overview_polyline);

      // Nästa segment börjar där detta slutar
      currentOrigin = segmentDestination;

      console.log(`✅ Segment ${i + 1} klart`);
    } catch (error: any) {
      console.error(`❌ Segment ${i + 1} misslyckades:`, error);
      throw error;
    }
  }

  // Sy ihop polylines
  const combinedPolyline = stitchPolylines(allPolylines, google);
  console.log("🧵 Polylines ihopsydda");

  // Bygg resultat från alla legs
  const segments: RouteSegment[] = [];
  let cumulativeDistance = 0;
  let cumulativeDuration = 0;

  // Första segmentet (start)
  segments.push({
    order: 1,
    address: addresses[0].value,
    distance: 0,
    duration: 0,
    cumulativeDistance: 0,
    cumulativeDuration: 0,
  });

  // Alla legs
  allLegs.forEach((leg: any, index: number) => {
    cumulativeDistance += leg.distance.value;
    cumulativeDuration += leg.duration.value;

    segments.push({
      order: index + 2,
      address: addresses[index + 1]?.value || leg.end_address,
      distance: leg.distance.value,
      duration: leg.duration.value,
      cumulativeDistance,
      cumulativeDuration,
    });
  });

  warnings.push(`Rutten delades upp i ${waypointSegments.length} segment`);

  console.log("✅ Segmenterad rutt klar!", { 
    segments: segments.length, 
    apiCalls,
    totalDistance: cumulativeDistance,
    totalDuration: cumulativeDuration
  });

  return {
    segments,
    totalDistance: cumulativeDistance,
    totalDuration: cumulativeDuration,
    polyline: combinedPolyline,
    apiCalls,
    warnings,
  };
};

// Hjälpfunktion: Bygg resultat från Directions response
const buildRouteResult = (
  result: any,
  addresses: Address[],
  apiCalls: number,
  warnings: string[]
): OptimizedRoute => {
  const segments: RouteSegment[] = [];
  let cumulativeDistance = 0;
  let cumulativeDuration = 0;

  // Första segmentet (start)
  segments.push({
    order: 1,
    address: addresses[0].value,
    distance: 0,
    duration: 0,
    cumulativeDistance: 0,
    cumulativeDuration: 0,
  });

  // Mellanliggande segment
  const legs = result.routes[0].legs;
  const waypointOrder = result.routes[0].waypoint_order || [];

  console.log("🗺️ Bearbetar", legs.length, "legs");

  legs.forEach((leg: any, index: number) => {
    cumulativeDistance += leg.distance.value;
    cumulativeDuration += leg.duration.value;

    let addressIndex: number;
    if (index === legs.length - 1) {
      // Sista destinationen
      addressIndex = addresses.length - 1;
    } else if (waypointOrder.length > 0) {
      // Waypoint (justera för optimerad ordning)
      addressIndex = waypointOrder[index] + 1;
    } else {
      // Ingen optimering
      addressIndex = index + 1;
    }

    segments.push({
      order: index + 2,
      address: addresses[addressIndex]?.value || leg.end_address,
      distance: leg.distance.value,
      duration: leg.duration.value,
      cumulativeDistance,
      cumulativeDuration,
    });
  });

  console.log("✅ Rutt optimerad!", { segments: segments.length, apiCalls });

  return {
    segments,
    totalDistance: cumulativeDistance,
    totalDuration: cumulativeDuration,
    polyline: result.routes[0].overview_polyline,
    apiCalls,
    warnings,
  };
};
