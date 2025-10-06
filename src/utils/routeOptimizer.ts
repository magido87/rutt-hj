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
  alternativeRoutes?: Array<{
    segments: RouteSegment[];
    totalDistance: number;
    totalDuration: number;
    polyline: string;
  }>;
}

// Routes API 2.0 interfaces
interface RoutesAPILocation {
  latLng: {
    latitude: number;
    longitude: number;
  };
}

interface RoutesAPIWaypoint {
  location?: RoutesAPILocation;
  placeId?: string;
  address?: string;
  via?: boolean;
}

interface RoutesAPIRequest {
  origin: RoutesAPIWaypoint;
  destination: RoutesAPIWaypoint;
  intermediates?: RoutesAPIWaypoint[];
  travelMode: string;
  routingPreference?: string;
  departureTime?: string;
  computeAlternativeRoutes: boolean;
  routeModifiers?: {
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidFerries?: boolean;
  };
  languageCode: string;
  units: string;
  optimizeWaypointOrder?: boolean;
}

// Hjälpfunktion: Dela upp waypoints i segment (max 23 waypoints per segment för säkerhet)
const segmentWaypoints = (waypoints: RoutesAPIWaypoint[], maxPerSegment: number = 23) => {
  const segments: RoutesAPIWaypoint[][] = [];
  for (let i = 0; i < waypoints.length; i += maxPerSegment) {
    segments.push(waypoints.slice(i, i + maxPerSegment));
  }
  return segments;
};

// Hjälpfunktion: Geocoda adress till lat/lng om placeId saknas
const geocodeAddress = async (address: string, apiKey: string): Promise<{ latitude: number; longitude: number }> => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status !== "OK" || !data.results[0]) {
    throw new Error(`Kunde inte hitta adress: ${address}`);
  }
  
  const location = data.results[0].geometry.location;
  return { latitude: location.lat, longitude: location.lng };
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
  console.log("🔧 optimizeRoute() START - Routes API 2.0", { addressCount: addresses.length });
  
  if (addresses.length < 2) {
    throw new Error("Behöver minst 2 adresser");
  }

  const google = (window as any).google;
  if (!google || !google.maps || !google.maps.geometry) {
    throw new Error("Google Maps geometry library är inte laddat");
  }

  const warnings: string[] = [];
  let apiCalls = 0;

  // Hämta inställningar för trafikmodell
  const settings = getSettings();
  const trafficModel = settings.trafficModel || "best_guess";
  
  // Logga trafikläge
  let routingPreference = "TRAFFIC_AWARE";
  if (departureTime) {
    const now = new Date();
    if (departureTime <= now) {
      console.warn("⚠️ departureTime är i det förflutna, justerar till 5min i framtiden");
      departureTime = new Date(now.getTime() + 5 * 60 * 1000);
    }
    console.log("🚦 TRAFIKLÄGE AKTIVERAT (Routes API 2.0)");
    console.log("📅 Avresetid:", departureTime.toISOString());
    console.log("🎯 Routing preference:", routingPreference);
  } else {
    console.log("📍 STANDARD-LÄGE (ingen trafikdata)");
    routingPreference = "TRAFFIC_UNAWARE";
  }

  // Konvertera adresser till Routes API 2.0 waypoints
  const origin: RoutesAPIWaypoint = {
    address: addresses[0].value
  };
  const destination: RoutesAPIWaypoint = {
    address: addresses[addresses.length - 1].value
  };
  const intermediates: RoutesAPIWaypoint[] = addresses.slice(1, -1).map((addr: Address) => ({
    address: addr.value
  }));

  console.log("📍 Rutt:", { 
    origin: addresses[0].value, 
    destination: addresses[addresses.length - 1].value, 
    totalIntermediates: intermediates.length,
    totalStops: addresses.length 
  });

  // Om <= 25 intermediates, kör som vanligt
  if (intermediates.length <= 25) {
    console.log("✅ Standard rutt (≤25 intermediates)");
    apiCalls++;
    
    try {
      console.log("🌐 Anropar Routes API 2.0...");
      
      // Bygg request object för Routes API 2.0
      const requestBody: RoutesAPIRequest = {
        origin,
        destination,
        intermediates: intermediates.length > 0 ? intermediates : undefined,
        travelMode: "DRIVE",
        routingPreference,
        computeAlternativeRoutes: true, // Hämta alternativa rutter
        languageCode: "sv",
        units: "METRIC",
        // Aktivera waypoint-optimering alltid för bästa resultat
        optimizeWaypointOrder: true,
      };

      // Lägg till departureTime om det finns
      if (departureTime) {
        requestBody.departureTime = departureTime.toISOString();
        console.log("🚦 departureTime tillagt:", requestBody.departureTime);
      }
      
      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration,routes.legs.staticDuration,routes.legs.startLocation,routes.legs.endLocation,routes.optimizedIntermediateWaypointIndex"
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Routes API error:", response.status, errorText);
        throw new Error(`Routes API fel: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("📡 Routes API 2.0 svar:", result);

      if (!result.routes || result.routes.length === 0) {
        throw new Error("Inga rutter hittades mellan dessa adresser");
      }

      const route = result.routes[0];
      
      // Extrahera alternativa rutter om de finns
      const alternativeRoutes = result.routes.slice(1, 3).map((altRoute: any) => {
        const altResult = buildRouteResultFromRoutesAPI(altRoute, addresses, 0, [], google);
        return {
          segments: altResult.segments,
          totalDistance: altResult.totalDistance,
          totalDuration: altResult.totalDuration,
          polyline: altRoute.polyline?.encodedPolyline || "",
        };
      });
      
      console.log(`🔀 Hittade ${alternativeRoutes.length} alternativa rutter`);
      
      // Detaljerad loggning av trafikdata
      console.log("=== TRAFIKDATA ANALYS (Routes API 2.0) ===");
      console.log("Antal legs:", route.legs?.length || 0);
      
      let totalStatic = 0;
      let totalTraffic = 0;
      let hasTrafficData = false;
      
      if (route.legs) {
        route.legs.forEach((leg: any, i: number) => {
          const staticDuration = parseInt(leg.staticDuration?.replace('s', '') || '0');
          const trafficDuration = parseInt(leg.duration?.replace('s', '') || '0');
          const distance = leg.distanceMeters;
          
          totalStatic += staticDuration;
          totalTraffic += trafficDuration;
          
          console.log(`Leg ${i+1}:`);
          console.log(`  📏 Avstånd: ${(distance/1000).toFixed(1)} km`);
          console.log(`  ⏱️ Static duration: ${Math.round(staticDuration/60)} min`);
          console.log(`  🚦 Traffic duration: ${Math.round(trafficDuration/60)} min`);
          
          if (trafficDuration !== staticDuration) {
            hasTrafficData = true;
            const diff = trafficDuration - staticDuration;
            const diffMin = Math.round(diff / 60);
            console.log(`  📊 Skillnad: ${diffMin > 0 ? '+' : ''}${diffMin} min`);
          }
        });
      }
      
      console.log("=== TOTALT ===");
      console.log(`Static duration: ${Math.round(totalStatic/60)} min (${(totalStatic/3600).toFixed(1)} h)`);
      console.log(`Traffic duration: ${Math.round(totalTraffic/60)} min (${(totalTraffic/3600).toFixed(1)} h)`);
      if (hasTrafficData) {
        const totalDiff = totalTraffic - totalStatic;
        console.log(`Skillnad: ${Math.round(totalDiff/60)} min (${totalDiff > 0 ? 'längre' : 'kortare'} med trafik)`);
      } else {
        console.log("⚠️ Samma tid - ingen trafikpåverkan eller trafikdata saknas");
      }
      console.log("====================");

      const optimizedResult = buildRouteResultFromRoutesAPI(route, addresses, apiCalls, warnings, google);
      
      // Lägg till alternativa rutter
      if (alternativeRoutes.length > 0) {
        optimizedResult.alternativeRoutes = alternativeRoutes;
      }
      
      return optimizedResult;
    } catch (error: any) {
      console.error("❌ Route optimization error:", error);
      throw error;
    }
  }

  // SEGMENTERING: Dela upp i flera segment
  console.log("🔀 Segmenterad rutt (>25 intermediates) - delar upp i segment");
  const intermediateSegments = segmentWaypoints(intermediates);
  console.log(`📦 Skapade ${intermediateSegments.length} segment`);

  const allLegs: any[] = [];
  const allPolylines: string[] = [];
  let currentOrigin = origin;

  // Kör varje segment
  for (let i = 0; i < intermediateSegments.length; i++) {
    const segment = intermediateSegments[i];
    const isLastSegment = i === intermediateSegments.length - 1;
    
    let segmentDestination: RoutesAPIWaypoint;
    let segmentIntermediates: RoutesAPIWaypoint[];
    
    if (isLastSegment) {
      segmentDestination = destination;
      segmentIntermediates = segment;
    } else {
      segmentDestination = segment[segment.length - 1];
      segmentIntermediates = segment.slice(0, -1);
    }

    console.log(`🔄 Segment ${i + 1}/${intermediateSegments.length}:`, {
      intermediates: segmentIntermediates.length,
    });

    apiCalls++;

    try {
      // Bygg request object för Routes API 2.0
      const requestBody: RoutesAPIRequest = {
        origin: currentOrigin,
        destination: segmentDestination,
        intermediates: segmentIntermediates.length > 0 ? segmentIntermediates : undefined,
        travelMode: "DRIVE",
        routingPreference,
        computeAlternativeRoutes: false,
        languageCode: "sv",
        units: "METRIC",
        optimizeWaypointOrder: false,
      };

      if (departureTime) {
        requestBody.departureTime = departureTime.toISOString();
      }

      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration,routes.legs.staticDuration"
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Segment ${i + 1}: Routes API fel: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.routes || result.routes.length === 0) {
        throw new Error(`Segment ${i + 1}: Inga rutter hittades`);
      }

      const route = result.routes[0];
      
      // Samla legs och polyline
      if (route.legs) {
        allLegs.push(...route.legs);
      }
      if (route.polyline?.encodedPolyline) {
        allPolylines.push(route.polyline.encodedPolyline);
      }

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

  // Alla legs (från Routes API 2.0)
  allLegs.forEach((leg: any, index: number) => {
    const distance = leg.distanceMeters || 0;
    // Använd traffic duration om tillgänglig, annars static duration
    const durationStr = leg.duration || leg.staticDuration || "0s";
    const duration = parseInt(durationStr.replace('s', ''));
    
    cumulativeDistance += distance;
    cumulativeDuration += duration;

    segments.push({
      order: index + 2,
      address: addresses[index + 1]?.value || "Unknown",
      distance: distance,
      duration: duration,
      cumulativeDistance,
      cumulativeDuration,
    });
  });

  warnings.push(`Rutten delades upp i ${intermediateSegments.length} segment`);

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

// Hjälpfunktion: Bygg resultat från Routes API 2.0 response
const buildRouteResultFromRoutesAPI = (
  route: any,
  addresses: Address[],
  apiCalls: number,
  warnings: string[],
  google: any
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
  const legs = route.legs || [];
  const optimizedOrder = route.optimizedIntermediateWaypointIndex || [];

  console.log("🗺️ Bearbetar", legs.length, "legs från Routes API 2.0");

  legs.forEach((leg: any, index: number) => {
    const distance = leg.distanceMeters || 0;
    // Använd traffic duration om tillgänglig, annars static duration
    const durationStr = leg.duration || leg.staticDuration || "0s";
    const duration = parseInt(durationStr.replace('s', ''));
    
    const staticDurationStr = leg.staticDuration || "0s";
    const staticDuration = parseInt(staticDurationStr.replace('s', ''));
    
    // Logga för debugging
    if (duration !== staticDuration) {
      console.log(`🚦 Leg ${index + 1}: Trafik ${Math.round(duration/60)}min vs Static ${Math.round(staticDuration/60)}min`);
    }
    
    cumulativeDistance += distance;
    cumulativeDuration += duration;

    let addressIndex: number;
    if (index === legs.length - 1) {
      // Sista destinationen
      addressIndex = addresses.length - 1;
    } else if (optimizedOrder.length > 0) {
      // Waypoint (justera för optimerad ordning)
      addressIndex = optimizedOrder[index] + 1;
    } else {
      // Ingen optimering
      addressIndex = index + 1;
    }

    segments.push({
      order: index + 2,
      address: addresses[addressIndex]?.value || "Unknown",
      distance: distance,
      duration: duration,
      cumulativeDistance,
      cumulativeDuration,
    });
  });

  console.log("✅ Rutt optimerad (Routes API 2.0)!", { segments: segments.length, apiCalls });

  return {
    segments,
    totalDistance: cumulativeDistance,
    totalDuration: cumulativeDuration,
    polyline: route.polyline?.encodedPolyline || "",
    apiCalls,
    warnings,
  };
};
