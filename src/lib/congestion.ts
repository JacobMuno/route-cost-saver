/**
 * Crossing detection + rate calculation for Swedish trängselskatt.
 *
 * Each control point (kontrollpunkt) is a single camera location from
 * Trafikverket's Lastkajen dataset. A "crossing" is registered when the
 * route polyline passes within `PROXIMITY_METERS` of a camera point, with
 * light sanity checks to avoid false positives on parallel nearby roads.
 *
 * Multi-passage / combining rules:
 *  - Stockholm: combined inner + Essingeleden daily cap (135 high / 105 low).
 *    Essingeleden rule: multiple Essingeleden passages on the same trip in
 *    the same N/S direction are combined to the highest-value one.
 *  - Gothenburg: 60 SEK daily cap. Flerpassageregeln: within any 60-minute
 *    sliding window, only the highest-value crossing counts.
 *  - Gothenburg Backa exception (approximation): if all Gothenburg passages
 *    are at Backa-area cameras AND the trip starts and ends inside the Backa
 *    bounding box, the trip is exempt.
 *
 * Same-camera de-duplication: if the route polyline is self-intersecting or
 * the tolerance catches the same camera on consecutive segments, we keep
 * only one hit per cpId per trip.
 */

import {
  ZONES,
  SCHEDULES,
  lookupAmount,
  isStockholmHighSeason,
  stockholmDailyCap,
  GOTHENBURG_DAILY_CAP,
  BACKA_BBOX,
  type ControlPoint,
  type GeoPoint,
  type ScheduleKey,
} from "./congestion-zones";
import { isChargingDay } from "./swedishHolidays";

/** How close the route polyline must come to a camera point to register a crossing. */
export const PROXIMITY_METERS = 25;

export type Crossing = {
  city: "Stockholm" | "Gothenburg";
  station: string;
  cpId: number;
  tariff: ScheduleKey;
  /** N-S travel direction at crossing ("north" = heading roughly north). */
  direction: "north" | "south" | "other";
  /** Inferred passage time based on linear interpolation along the route. */
  time: Date;
  /** Charge in SEK before any combining rules / daily caps. */
  charge: number;
  /** Camera location (WGS84). */
  point: GeoPoint;
  backaArea?: boolean;
};

export type CongestionResult = {
  crossings: Crossing[];
  totalsByCity: Record<string, number>;
  total: number;
};

// --- Geometry helpers ---

function segmentLengthKm(a: GeoPoint, b: GeoPoint): number {
  const meanLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = (b.lng - a.lng) * Math.cos(meanLat) * 111.32;
  const dy = (b.lat - a.lat) * 111.32;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Shortest distance from point p to segment a-b, in meters.
 * Also returns `t` ∈ [0,1] — the normalized position along the segment where
 * the closest approach occurred (useful for interpolating crossing time).
 */
function pointToSegmentMeters(
  p: GeoPoint,
  a: GeoPoint,
  b: GeoPoint,
): { distance: number; t: number } {
  const meanLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const mLat = 111320;
  const mLng = 111320 * Math.cos(meanLat);
  const ax = 0, ay = 0;
  const bx = (b.lng - a.lng) * mLng;
  const by = (b.lat - a.lat) * mLat;
  const px = (p.lng - a.lng) * mLng;
  const py = (p.lat - a.lat) * mLat;
  const segLenSq = bx * bx + by * by;
  if (segLenSq < 1e-6) {
    const dx = px - ax, dy = py - ay;
    return { distance: Math.sqrt(dx * dx + dy * dy), t: 0 };
  }
  let t = (px * bx + py * by) / segLenSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = ax + t * bx;
  const closestY = ay + t * by;
  const dx = px - closestX, dy = py - closestY;
  return { distance: Math.sqrt(dx * dx + dy * dy), t };
}

function inBacka(p: GeoPoint): boolean {
  return (
    p.lat >= BACKA_BBOX.minLat &&
    p.lat <= BACKA_BBOX.maxLat &&
    p.lng >= BACKA_BBOX.minLng &&
    p.lng <= BACKA_BBOX.maxLng
  );
}

// --- Crossing detection ---

export function detectCrossings(
  routeCoords: GeoPoint[],
  startTime: Date,
  totalDurationMin: number,
): Crossing[] {
  if (routeCoords.length < 2) return [];

  // Cumulative route length for time interpolation.
  const cumKm: number[] = [0];
  for (let i = 1; i < routeCoords.length; i++) {
    cumKm.push(cumKm[i - 1] + segmentLengthKm(routeCoords[i - 1], routeCoords[i]));
  }
  const totalKm = cumKm[cumKm.length - 1] || 1;

  const crossings: Crossing[] = [];
  const seenCpIds = new Set<number>();

  for (const zone of ZONES) {
    for (const cp of zone.controlPoints) {
      // Find the closest approach of the route polyline to this camera point.
      let best: { segIdx: number; t: number; distance: number } | null = null;
      for (let i = 0; i < routeCoords.length - 1; i++) {
        const { distance, t } = pointToSegmentMeters(
          cp.point,
          routeCoords[i],
          routeCoords[i + 1],
        );
        if (distance <= PROXIMITY_METERS && (best === null || distance < best.distance)) {
          best = { segIdx: i, t, distance };
        }
      }
      if (!best) continue;
      if (seenCpIds.has(cp.cpId)) continue; // dedupe
      seenCpIds.add(cp.cpId);

      const segStart = routeCoords[best.segIdx];
      const segEnd = routeCoords[best.segIdx + 1];
      const distanceAtCrossing =
        cumKm[best.segIdx] + best.t * (cumKm[best.segIdx + 1] - cumKm[best.segIdx]);
      const fraction = distanceAtCrossing / totalKm;
      const passageMin = fraction * totalDurationMin;
      const time = new Date(startTime.getTime() + passageMin * 60_000);

      // Infer N/S direction from route-segment direction at the crossing.
      const dLat = segEnd.lat - segStart.lat;
      const dLng = segEnd.lng - segStart.lng;
      const meanLat = ((segStart.lat + segEnd.lat) / 2) * (Math.PI / 180);
      const dy = dLat * 111320;
      const dx = dLng * 111320 * Math.cos(meanLat);
      const absY = Math.abs(dy), absX = Math.abs(dx);
      let direction: Crossing["direction"] = "other";
      if (absY > absX) direction = dy > 0 ? "north" : "south";

      const charge = isChargingDay(time, zone.city) ? lookupAmount(cp.tariff, time) : 0;

      crossings.push({
        city: zone.city,
        station: cp.station,
        cpId: cp.cpId,
        tariff: cp.tariff,
        direction,
        time,
        charge,
        point: cp.point,
        backaArea: cp.backaArea,
      });
    }
  }

  // Keep crossings in the order they happened along the route.
  crossings.sort((a, b) => a.time.getTime() - b.time.getTime());
  return crossings;
}

// --- Combining rules ---

/**
 * Stockholm Essingeleden rule: on the same trip, all Essingeleden passages
 * going in the same general direction collapse to a single charge equal to
 * the highest-value one. (Covers Fredhäll+Kristineberg, Tranebergsbron
 * on/off ramps, and any other Essingeleden camera combinations.)
 */
function combineEssingeleden(crossings: Crossing[]): Crossing[] {
  const buckets = new Map<string, Crossing[]>();
  const out: Crossing[] = [];
  for (const c of crossings) {
    if (c.tariff !== "stockholm-essingeleden") {
      out.push(c);
      continue;
    }
    const key = c.direction; // "north" / "south" / "other"
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(c);
  }
  for (const list of buckets.values()) {
    let best = list[0];
    for (const c of list) if (c.charge > best.charge) best = c;
    for (const c of list) out.push(c === best ? c : { ...c, charge: 0 });
  }
  return out;
}

/** Gothenburg flerpassageregeln: within any 60-minute window, only the highest counts. */
function combineGothenburg60min(crossings: Crossing[]): Crossing[] {
  const gbg = crossings
    .filter((c) => c.city === "Gothenburg")
    .sort((a, b) => a.time.getTime() - b.time.getTime());
  const others = crossings.filter((c) => c.city !== "Gothenburg");
  const result: Crossing[] = [];
  let i = 0;
  while (i < gbg.length) {
    const anchor = gbg[i];
    const windowEnd = anchor.time.getTime() + 60 * 60_000;
    const window: Crossing[] = [];
    let j = i;
    while (j < gbg.length && gbg[j].time.getTime() <= windowEnd) {
      window.push(gbg[j]);
      j++;
    }
    let best = window[0];
    for (const c of window) if (c.charge > best.charge) best = c;
    for (const c of window) result.push(c === best ? c : { ...c, charge: 0 });
    i = j;
  }
  return [...others, ...result];
}

/** Gothenburg Backa transit approximation. */
function applyBackaException(
  crossings: Crossing[],
  routeStart: GeoPoint | null,
  routeEnd: GeoPoint | null,
): Crossing[] {
  const gbg = crossings.filter((c) => c.city === "Gothenburg");
  if (gbg.length === 0) return crossings;
  const allBacka = gbg.every((c) => c.backaArea === true);
  if (!allBacka) return crossings;
  if (!routeStart || !routeEnd) return crossings;
  if (!inBacka(routeStart) || !inBacka(routeEnd)) return crossings;
  return crossings.map((c) => (c.city === "Gothenburg" ? { ...c, charge: 0 } : c));
}

export function applyDailyCaps(
  crossings: Crossing[],
  routeEndpoints?: { start: GeoPoint | null; end: GeoPoint | null },
): CongestionResult {
  let combined = combineEssingeleden(crossings);
  combined = combineGothenburg60min(combined);
  combined = applyBackaException(
    combined,
    routeEndpoints?.start ?? null,
    routeEndpoints?.end ?? null,
  );

  const totalsByCity: Record<string, number> = {};
  const buckets = new Map<string, { city: string; charges: Crossing[] }>();
  for (const c of combined) {
    const day = `${c.time.getFullYear()}-${c.time.getMonth() + 1}-${c.time.getDate()}`;
    const key = `${c.city}|${day}`;
    if (!buckets.has(key)) buckets.set(key, { city: c.city, charges: [] });
    buckets.get(key)!.charges.push(c);
  }

  for (const { city, charges } of buckets.values()) {
    const cap = city === "Stockholm" ? stockholmDailyCap(charges[0].time) : GOTHENBURG_DAILY_CAP;
    const raw = charges.reduce((s, c) => s + c.charge, 0);
    totalsByCity[city] = (totalsByCity[city] ?? 0) + Math.min(raw, cap);
  }

  const total = Object.values(totalsByCity).reduce((s, v) => s + v, 0);
  return { crossings: combined, totalsByCity, total };
}

export { SCHEDULES, isStockholmHighSeason, lookupAmount };
