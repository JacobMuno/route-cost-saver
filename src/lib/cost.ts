import type { Leg, VehicleConfig } from "./types";

export function legEnergyCostSEK(distanceKm: number, vehicle: VehicleConfig): number {
  if (!vehicle.consumption || !vehicle.pricePerUnit) return 0;
  // consumption is per 100km, units (L or kWh)
  const units = (distanceKm / 100) * vehicle.consumption;
  return units * vehicle.pricePerUnit;
}

export function tripTotals(legs: Leg[], vehicle: VehicleConfig) {
  const distanceKm = legs.reduce((sum, l) => sum + (l.route?.distanceKm ?? 0), 0);
  const durationMin = legs.reduce((sum, l) => sum + (l.route?.durationMin ?? 0), 0);
  const energyCost = legEnergyCostSEK(distanceKm, vehicle);
  return { distanceKm, durationMin, energyCost };
}

export function formatSEK(value: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDuration(minutes: number): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}
