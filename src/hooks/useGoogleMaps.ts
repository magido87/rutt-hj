import { useEffect, useState } from "react";

export const useGoogleMaps = (apiKey: string) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setIsLoaded(false);
      return;
    }

    // Check if already loaded
    if ((window as any).google && (window as any).google.maps) {
      setIsLoaded(true);
      return;
    }

    // Load the Google Maps script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=sv`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
      setError(null);
    };

    script.onerror = () => {
      setError("Kunde inte ladda Google Maps. Kontrollera din API-nyckel.");
      setIsLoaded(false);
    };

    document.head.appendChild(script);

    // Don't cleanup - keep script loaded for navigation between pages
  }, [apiKey]);

  return { isLoaded, error };
};
