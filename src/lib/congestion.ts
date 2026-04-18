/**
 * Crossing detection + rate calculation for Swedish trängselskatt.
 *
 * Per-passage charges use the official Transportstyrelsen schedules
 * (see congestion-zones.ts). Each control point is tagged with a tariff
 * (`stockholm-inner`, `stockholm-essingeleden`, or `gothenburg`).
 *
 * Daily caps and special multi-passage rules:
 *  - Stockholm: combined inner + Essingeleden cap (135 high / 105 low season).
 *    Essingeleden rule: if multiple Essingeleden gates are crossed in the same
 *    direction during the same trip, only the highest-value crossing counts.
 *  - Gothenburg: 60 SEK daily cap. Multi-passage (flerpassageregeln): within
 *    any 60-minute sliding window, only the highest crossing counts.
 *  - Backa exception (approximation): if every Gothenburg crossing is in the
 *    Backa area AND the trip starts and ends inside the Backa bounding box,
 *    no Gothenburg charge is applied.
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

export type Crossing = {
  city: "Stockholm" | "Gothenburg";
  controlPoint: string;
  tariff: ScheduleKey;
  /** "inbound" toward city centre, "outbound" away. */
  direction: "inbound" | "outbound";
  /** Inferred passage time. */
  time: Date;
  /** Charge in SEK before any combining rules / daily caps. */
  charge: number;
  /** Where on the map the crossing occurred. */
  point: GeoPoint;
  backaArea?: boolean;
};

export type CongestionResult = {
  crossings: Crossing[];
  /** Total per city after applying all rules and daily caps. */
  totalsByCity: Record<string, number>;
  /** Total across all cities. */
  total: number;
};

// --- Geometry helpers ---

function segmentsIntersect(
  p1: GeoPoint,
  p2: GeoPoint,
  p3: GeoPoint,
  p4: GeoPoint,
): GeoPoint | null {
  const x1 = p1.lng, y1 = p1.lat;
  const x2 = p2.lng, y2 = p2.lat;
  const x3 = p3.lng, y3 = p3.lat;
  const x4 = p4.lng, y4 = p4.lat;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { lng: x1 + t * (x2 - x1), lat: y1 + t * (y2 - y1) };
}

function approxSegmentLengthKm(a: GeoPoint, b: GeoPoint): number {
  const meanLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = (b.lng - a.lng) * Math.cos(meanLat) * 111.32;
  const dy = (b.lat - a.lat) * 111.32;
  return Math.sqrt(dx * dx + dy * dy);
}

function inferDirection(
  routeFrom: GeoPoint,
  routeTo: GeoPoint,
  cp: ControlPoint,
): "inbound" | "outbound" {
  const routeDx = routeTo.lng - routeFrom.lng;
  const routeDy = routeTo.lat - routeFrom.lat;
  const dot = routeDx * cp.inboundVector.dx + routeDy * cp.inboundVector.dy;
  return dot >= 0 ? "inbound" : "outbound";
}

function inBacka(p: GeoPoint): boolean {
  return (
    p.lat >= BACKA_BBOX.minLat &&
    p.lat <= BACKA_BBOX.maxLat &&
    p.lng >= BACKA_BBOX.minLng &&
    p.lng <= BACKA_BBOX.maxLng
  );
}

// --- Public API ---

export function detectCrossings(
  routeCoords: GeoPoint[],
  startTime: Date,
  totalDurationMin: number,
): Crossing[] {
  if (routeCoords.length < 2) return [];

  const cumKm: number[] = [0];
  for (let i = 1; i < routeCoords.length; i++) {
    cumKm.push(cumKm[i - 1] + approxSegmentLengthKm(routeCoords[i - 1], routeCoords[i]));
  }
  const totalKm = cumKm[cumKm.length - 1] || 1;

  const crossings: Crossing[] = [];

  for (const zone of ZONES) {
    for (const cp of zone.controlPoints) {
      let found: { i: number; pt: GeoPoint } | null = null;
      for (let i = 0; i < routeCoords.length - 1; i++) {
        const hit = segmentsIntersect(routeCoords[i], routeCoords[i + 1], cp.gate.a, cp.gate.b);
        if (hit) {
          found = { i, pt: hit };
          break;
        }
      }
      if (!found) continue;

      const segStart = routeCoords[found.i];
      const segEnd = routeCoords[found.i + 1];
      const segLen = approxSegmentLengthKm(segStart, segEnd) || 1e-6;
      const partial = approxSegmentLengthKm(segStart, found.pt) / segLen;
      const distanceAtCrossing = cumKm[found.i] + partial * (cumKm[found.i + 1] - cumKm[found.i]);
      const fraction = distanceAtCrossing / totalKm;
      const passageMin = fraction * totalDurationMin;
      const time = new Date(startTime.getTime() + passageMin * 60_000);

      const direction = inferDirection(segStart, segEnd, cp);
      // No charge on non-charging days; otherwise look up the tariff amount.
      const charge = isChargingDay(time, zone.city) ? lookupAmount(cp.tariff, time) : 0;

      crossings.push({
        city: zone.city,
        controlPoint: cp.name,
        tariff: cp.tariff,
        direction,
        time,
        charge,
        point: found.pt,
        backaArea: cp.backaArea,
      });
    }
  }

  return crossings;
}

/** Stockholm Essingeleden combining: per direction per trip, keep only the highest-value Essingeleden crossing. */
function combineEssingeleden(crossings: Crossing[]): Crossing[] {
  const out: Crossing[] = [];
  const buckets = new Map<string, Crossing[]>();
  for (const c of crossings) {
    if (c.tariff !== "stockholm-essingeleden") {
      out.push(c);
      continue;
    }
    const key = c.direction;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(c);
  }
  for (const list of buckets.values()) {
    let best = list[0];
    for (const c of list) if (c.charge > best.charge) best = c;
    // Zero out the others by emitting them with charge 0 so the UI still
    // shows the gates were detected, but only `best` carries the charge.
    for (const c of list) {
      if (c === best) out.push(c);
      else out.push({ ...c, charge: 0 });
    }
  }
  return out;
}

/**
 * Gothenburg flerpassageregeln: within any 60-minute sliding window,
 * only the highest passage counts. Implemented greedily by sorting by time
 * and grouping each crossing into a window anchored at the first unhandled one.
 */
function combineGothenburg60min(crossings: Crossing[]): Crossing[] {
  const gbg = crossings.filter((c) => c.city === "Gothenburg").sort((a, b) => a.time.getTime() - b.time.getTime());
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
    for (const c of window) {
      if (c === best) result.push(c);
      else result.push({ ...c, charge: 0 });
    }
    i = j;
  }
  return [...others, ...result];
}

/**
 * Backa exception (approximation): if every Gothenburg crossing on this trip
 * is in the Backa area AND the trip route starts and ends inside the Backa
 * bounding box, the trip is exempt for Gothenburg. This is an approximation
 * of the real "transit traffic" rule.
 */
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

/**
 * Apply combining rules and daily caps. Pass `routeEndpoints` (start + end of
 * the whole trip) to enable the Backa exception approximation.
 */
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
  // Group by city + calendar day for cap purposes.
  const buckets = new Map<string, { city: string; charges: Crossing[] }>();
  for (const c of combined) {
    const day = `${c.time.getFullYear()}-${c.time.getMonth() + 1}-${c.time.getDate()}`;
    const key = `${c.city}|${day}`;
    if (!buckets.has(key)) buckets.set(key, { city: c.city, charges: [] });
    buckets.get(key)!.charges.push(c);
  }

  for (const { city, charges } of buckets.values()) {
    let cap: number;
    if (city === "Stockholm") {
      cap = stockholmDailyCap(charges[0].time);
    } else {
      cap = GOTHENBURG_DAILY_CAP;
    }
    const raw = charges.reduce((s, c) => s + c.charge, 0);
    const applied = Math.min(raw, cap);
    totalsByCity[city] = (totalsByCity[city] ?? 0) + applied;
  }

  const total = Object.values(totalsByCity).reduce((s, v) => s + v, 0);
  return { crossings: combined, totalsByCity, total };
}

// Re-export for convenience.
export { SCHEDULES, isStockholmHighSeason, lookupAmount };
