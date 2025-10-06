export interface Address {
  value: string;
  placeId?: string;
}

export interface SavedRoute {
  id: string;
  timestamp: number;
  startAddress: Address;
  endAddress: Address;
  addresses: Address[];
  totalStops: number;
}
