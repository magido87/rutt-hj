import { SavedRoute } from "@/types/route";

const STORAGE_KEY = "saved_routes";
const MAX_SAVED_ROUTES = 5;

export const saveRoute = (routeData: any): void => {
  try {
    const existingRoutes = getSavedRoutes();
    
    const newRoute: SavedRoute = {
      id: `route_${Date.now()}`,
      timestamp: Date.now(),
      routeData,
      startAddress: routeData.segments[0]?.address || "Start",
      endAddress: routeData.segments[routeData.segments.length - 1]?.address || "Slut",
      totalStops: routeData.segments.length,
    };

    // Lägg till först i listan
    const updatedRoutes = [newRoute, ...existingRoutes].slice(0, MAX_SAVED_ROUTES);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRoutes));
    console.log("✅ Rutt sparad:", newRoute.id);
  } catch (error) {
    console.error("Failed to save route:", error);
  }
};

export const getSavedRoutes = (): SavedRoute[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    
    const routes = JSON.parse(saved);
    if (!Array.isArray(routes)) return [];
    
    // Migrera gamla rutter med Address-objekt till nya formatet
    const migratedRoutes = routes.map((route: any) => {
      // Om det redan är nytt format, returnera som det är
      if (typeof route.startAddress === 'string') {
        return route;
      }
      
      // Migrera gammalt format
      return {
        ...route,
        startAddress: route.startAddress?.value || route.startAddress || "Okänd",
        endAddress: route.endAddress?.value || route.endAddress || "Okänd",
      };
    });
    
    // Spara migrerade rutter
    if (migratedRoutes.some((r: any, i: number) => r !== routes[i])) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedRoutes));
      console.log("✅ Migrerade gamla rutter till nytt format");
    }
    
    return migratedRoutes;
  } catch (error) {
    console.error("Failed to load saved routes:", error);
    // Vid fel, rensa localStorage för att undvika fortsatta problem
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

export const deleteSavedRoute = (id: string): void => {
  try {
    const routes = getSavedRoutes();
    const filtered = routes.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log("🗑️ Rutt borttagen:", id);
  } catch (error) {
    console.error("Failed to delete route:", error);
  }
};

export const clearAllRoutes = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log("🗑️ Alla rutter rensade");
  } catch (error) {
    console.error("Failed to clear routes:", error);
  }
};
