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
  warnings?: string[];
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

  // Hämta inställningar för trafikmodell
  const settings = getSettings();
  const trafficModel = settings.trafficModel || "best_guess";
  
  // Logga trafikläge
  if (departureTime) {
    // VIKTIGT: Google kräver att departureTime är i framtiden
    const now = new Date();
    if (departureTime <= now) {
      console.warn("⚠️ departureTime är i det förflutna, justerar till 5min i framtiden");
      departureTime = new Date(now.getTime() + 5 * 60 * 1000);
    }
    console.log("🚦 TRAFIKLÄGE AKTIVERAT");
    console.log("📅 Avresetid:", departureTime.toISOString());
    console.log("🎯 Trafikmodell:", trafficModel);
  } else {
    console.log("📍 STANDARD-LÄGE (ingen trafikdata)");
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
      
      // Bygg request object
      const requestOptions: any = {
        origin,
        destination,
        waypoints: allWaypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
        region: "SE",
      };

      // Lägg till trafikdata om departureTime finns
      if (departureTime) {
        requestOptions.drivingOptions = {
          departureTime: departureTime,
          trafficModel: google.maps.TrafficModel[trafficModel.toUpperCase() as keyof typeof google.maps.TrafficModel],
        };
        console.log("🚦 drivingOptions tillagt:", requestOptions.drivingOptions);
      }
      
      const result = await new Promise<any>((resolve, reject) => {
        directionsService.route(requestOptions, (result: any, status: any) => {
          console.log("📡 Directions API svar:", status);
          if (status === "OK") {
            // Detaljerad loggning av trafikdata
            console.log("=== TRAFIKDATA ANALYS ===");
            console.log("Antal legs:", result.routes[0].legs.length);
            
            let totalNormal = 0;
            let totalTraffic = 0;
            let hasTrafficData = false;
            
            result.routes[0].legs.forEach((leg: any, i: number) => {
              const normalDuration = leg.duration.value;
              const trafficDuration = leg.duration_in_traffic?.value;
              const distance = leg.distance.value;
              
              totalNormal += normalDuration;
              
              console.log(`Leg ${i+1}:`);
              console.log(`  📍 ${leg.start_address.substring(0, 40)}... → ${leg.end_address.substring(0, 40)}...`);
              console.log(`  📏 Avstånd: ${(distance/1000).toFixed(1)} km`);
              console.log(`  ⏱️ Standard tid: ${Math.round(normalDuration/60)} min`);
              
              if (trafficDuration) {
                hasTrafficData = true;
                totalTraffic += trafficDuration;
                const diff = trafficDuration - normalDuration;
                const diffMin = Math.round(diff / 60);
                console.log(`  🚦 Med trafik: ${Math.round(trafficDuration/60)} min (${diffMin > 0 ? '+' : ''}${diffMin} min)`);
              } else {
                console.log(`  ⚠️ Ingen trafikdata`);
                totalTraffic += normalDuration;
              }
            });
            
            console.log("=== TOTALT ===");
            console.log(`Standard tid: ${Math.round(totalNormal/60)} min (${(totalNormal/3600).toFixed(1)} h)`);
            if (hasTrafficData) {
              console.log(`Med trafik: ${Math.round(totalTraffic/60)} min (${(totalTraffic/3600).toFixed(1)} h)`);
              const totalDiff = totalTraffic - totalNormal;
              console.log(`Skillnad: ${Math.round(totalDiff/60)} min (${totalDiff > 0 ? 'längre' : 'kortare'} med trafik)`);
            } else {
              console.log("⚠️ INGEN TRAFIKDATA I NÅGOT LEG - Kontrollera API-inställningar");
            }
            console.log("====================");
            
            resolve(result);
          } else if (status === "ZERO_RESULTS") {
            reject(new Error("Inga rutter hittades mellan dessa adresser"));
          } else if (status === "OVER_QUERY_LIMIT") {
            reject(new Error("API-gräns nådd. Vänta en stund och försök igen."));
          } else {
            reject(new Error(`Directions API-fel: ${status}`));
          }
        });
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
      // Bygg request object
      const requestOptions: any = {
        origin: currentOrigin,
        destination: segmentDestination,
        waypoints: segmentWaypoints,
        optimizeWaypoints: false,
        travelMode: google.maps.TravelMode.DRIVING,
        region: "SE",
      };

      // Lägg till trafikdata om departureTime finns
      if (departureTime) {
        requestOptions.drivingOptions = {
          departureTime: departureTime,
          trafficModel: google.maps.TrafficModel[trafficModel.toUpperCase() as keyof typeof google.maps.TrafficModel],
        };
      }

      const result = await new Promise<any>((resolve, reject) => {
        directionsService.route(requestOptions, (result: any, status: any) => {
          if (status === "OK") {
            resolve(result);
          } else if (status === "ZERO_RESULTS") {
            reject(new Error(`Segment ${i + 1}: Inga rutter hittades`));
          } else if (status === "OVER_QUERY_LIMIT") {
            reject(new Error("API-gräns nådd. Vänta en stund och försök igen."));
          } else {
            reject(new Error(`Segment ${i + 1}: Directions API-fel: ${status}`));
          }
        });
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
    const distance = leg.distance.value;
    // Använd duration_in_traffic om tillgänglig (trafikdata), annars vanlig duration
    const duration = leg.duration_in_traffic?.value || leg.duration.value;
    
    cumulativeDistance += distance;
    cumulativeDuration += duration;

    segments.push({
      order: index + 2,
      address: addresses[index + 1]?.value || leg.end_address,
      distance: distance,
      duration: duration,
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
    const distance = leg.distance.value;
    // Använd duration_in_traffic om tillgänglig (trafikdata), annars vanlig duration
    const duration = leg.duration_in_traffic?.value || leg.duration.value;
    
    // Logga för debugging
    if (leg.duration_in_traffic) {
      console.log(`🚦 Leg ${index + 1}: Trafik ${Math.round(duration/60)}min vs Standard ${Math.round(leg.duration.value/60)}min`);
    }
    
    cumulativeDistance += distance;
    cumulativeDuration += duration;

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
      distance: distance,
      duration: duration,
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
