export interface AppSettings {
  apiKey: string;
  defaultStartAddress: string;
  defaultEndAddress: string;
  trafficModel: "best_guess" | "optimistic" | "pessimistic";
  units: "metric" | "imperial";
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  defaultStartAddress: "",
  defaultEndAddress: "",
  trafficModel: "best_guess",
  units: "metric",
};

export const getSettings = (): AppSettings => {
  try {
    const apiKey = localStorage.getItem("google_maps_api_key") || "";
    const defaultStartAddress = localStorage.getItem("default_start_address") || "";
    const defaultEndAddress = localStorage.getItem("default_end_address") || "";
    const trafficModel = (localStorage.getItem("traffic_model") as AppSettings["trafficModel"]) || "best_guess";
    const units = (localStorage.getItem("units") as AppSettings["units"]) || "metric";

    return {
      apiKey,
      defaultStartAddress,
      defaultEndAddress,
      trafficModel,
      units,
    };
  } catch (error) {
    console.error("Error loading settings:", error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: Partial<AppSettings>): void => {
  try {
    if (settings.apiKey !== undefined) {
      localStorage.setItem("google_maps_api_key", settings.apiKey);
    }
    if (settings.defaultStartAddress !== undefined) {
      localStorage.setItem("default_start_address", settings.defaultStartAddress);
    }
    if (settings.defaultEndAddress !== undefined) {
      localStorage.setItem("default_end_address", settings.defaultEndAddress);
    }
    if (settings.trafficModel !== undefined) {
      localStorage.setItem("traffic_model", settings.trafficModel);
    }
    if (settings.units !== undefined) {
      localStorage.setItem("units", settings.units);
    }
    console.log("✅ Inställningar sparade");
  } catch (error) {
    console.error("Error saving settings:", error);
  }
};
