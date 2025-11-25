export interface Address {
  value: string;
  placeId?: string;
}

export interface RouteSegment {
  order: number;
  address: string;
  distance: number;
  duration: number;
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

export interface SavedRoute {
  id: string;
  timestamp: number;
  routeData: OptimizedRoute;
  startAddress: string;
  endAddress: string;
  totalStops: number;
  departureTime?: number; // Unix timestamp för vald avresetid
  routeMode?: "standard" | "traffic";
}
