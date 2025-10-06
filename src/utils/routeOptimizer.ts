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
}

export const optimizeRoute = async (
  addresses: Address[],
  apiKey: string
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

  // Start och slutpunkt
  const origin = addresses[0].value;
  const destination = addresses[addresses.length - 1].value;
  const waypoints = addresses.slice(1, -1).map((addr: Address) => ({
    location: addr.value,
    stopover: true,
  }));

  console.log("📍 Rutt:", { origin, destination, waypointsCount: waypoints.length });

  // Google Maps begränsning: max 25 waypoints
  if (waypoints.length > 25) {
    throw new Error("Google Maps stödjer max 27 stopp totalt (25 waypoints). Dela upp din rutt i segment.");
  }

  let apiCalls = 0;

  try {
    console.log("🌐 Anropar Directions API...");
    apiCalls++;
    
    const result = await new Promise<any>((resolve, reject) => {
      directionsService.route(
        {
          origin,
          destination,
          waypoints,
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.DRIVING,
          region: "SE",
        },
        (result: any, status: any) => {
          console.log("📡 Directions API svar:", status);
          if (status === "OK") {
            resolve(result);
          } else {
            reject(new Error(`Directions API-fel: ${status}`));
          }
        }
      );
    });

    console.log("✅ Directions API success");

    // Bygg resultat med kumulativa värden
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
      } else {
        // Waypoint (justera för optimerad ordning)
        addressIndex = waypointOrder[index] + 1;
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
    };
  } catch (error: any) {
    console.error("❌ Route optimization error:", error);
    throw new Error(error.message || "Kunde inte optimera rutten");
  }
};
