export type GeoPoint = { lat: number; lng: number };

export type LocationInput = {
  query: string;
  point: GeoPoint | null;
  label: string | null;
};

export type Leg = {
  id: string;
  origin: LocationInput;
  destination: LocationInput;
  waypoints: LocationInput[];
  route: {
    coordinates: GeoPoint[];
    distanceKm: number;
    durationMin: number;
  } | null;
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
};

export type VehicleType = "petrol" | "diesel" | "electric" | "hybrid";

export type VehicleConfig = {
  type: VehicleType;
  /** L/100km for fuel, kWh/100km for electric */
  consumption: number;
  /** SEK per litre or per kWh */
  pricePerUnit: number;
  /** Optional friendly name (e.g. "My Volvo"). */
  name?: string;
  /** True when consumption was filled from API Ninjas lookup. */
  consumptionFromLookup?: boolean;
};
