import { SavedRoute, Address } from "@/types/route";

const STORAGE_KEY = "saved_routes";
const MAX_SAVED_ROUTES = 5;

export const saveRoute = (
  startAddress: Address,
  endAddress: Address,
  addresses: Address[]
): void => {
  try {
    const existingRoutes = getSavedRoutes();
    
    const newRoute: SavedRoute = {
      id: `route_${Date.now()}`,
      timestamp: Date.now(),
      startAddress,
      endAddress,
      addresses,
      totalStops: 1 + addresses.filter(a => a.value.trim()).length + (endAddress.value.trim() ? 1 : 0),
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
    return Array.isArray(routes) ? routes : [];
  } catch (error) {
    console.error("Failed to load saved routes:", error);
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
