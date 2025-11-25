import { useEffect, useRef } from "react";

interface RouteMapProps {
  apiKey: string;
  polyline: string;
  segments: Array<{
    order: number;
    address: string;
  }>;
}

export const RouteMap = ({ apiKey, polyline, segments }: RouteMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !apiKey || !(window as any).google) return;

    const google = (window as any).google;

    // Skapa karta
    const map = new google.maps.Map(mapRef.current, {
      zoom: 7,
      center: { lat: 59.3293, lng: 18.0686 }, // Stockholm som default
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;

    // Rita polyline
    if (polyline) {
      const decodedPath = google.maps.geometry.encoding.decodePath(polyline);
      const routePath = new google.maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: "#1e40af",
        strokeOpacity: 0.8,
        strokeWeight: 4,
      });
      routePath.setMap(map);

      // Zooma till rutten
      const bounds = new google.maps.LatLngBounds();
      decodedPath.forEach((point: any) => bounds.extend(point));
      map.fitBounds(bounds);
    }

    // Lägg till numrerade markörer
    segments.forEach((segment, index) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: segment.address }, (results: any, status: any) => {
        if (status === "OK" && results[0]) {
          const position = results[0].geometry.location;

          // Välj färg baserat på position
          let markerColor = "#1e40af"; // Blå för mellanliggande
          if (index === 0) markerColor = "#16a34a"; // Grön för start
          if (index === segments.length - 1) markerColor = "#dc2626"; // Röd för slut

          const marker = new google.maps.Marker({
            position,
            map,
            label: {
              text: segment.order.toString(),
              color: "white",
              fontSize: "14px",
              fontWeight: "bold",
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 20,
              fillColor: markerColor,
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 3,
            },
            title: segment.address,
          });

          // Info window
          const infoWindow = new google.maps.InfoWindow({
            content: `<div style="padding: 8px;"><strong>Stopp ${segment.order}</strong><br/>${segment.address}</div>`,
          });

          marker.addListener("click", () => {
            infoWindow.open(map, marker);
          });
        }
      });
    });
  }, [apiKey, polyline, segments]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[600px] rounded-lg border-2 border-border"
      style={{ minHeight: "400px" }}
    />
  );
};
