/**
 * Crossing detection + rate calculation for Swedish trängselskatt.
 *
 * Tolerance note: gates are short geometric line segments (~50–80m wide).
 * We test each consecutive pair of route coordinates against each gate
 * for line-segment intersection in lat/lng space. At Swedish latitudes
 * (~57–60°N), a degree of longitude is ~55km and latitude ~111km, so
 * small lat/lng deltas are fine for this scale.
 */

import {
  ZONES,
  pickStockholmSchedule,
  type ControlPoint,
  type GeoPoint,
  type RateSchedule,
  type TimeRange,
} from "./congestion-zones";
import { isChargingDay } from "./swedishHolidays";

export type Crossing = {
  city: "Stockholm" | "Gothenburg";
  controlPoint: string;
  /** "inbound" toward city centre, "outbound" away. */
  direction: "inbound" | "outbound";
  /** Inferred passage time. */
  time: Date;
  /** Charge in SEK before the daily cap is applied. */
  charge: number;
  /** Where on the map the crossing occurred. */
  point: GeoPoint;
};

export type CongestionResult = {
  crossings: Crossing[];
  /** Total per city after applying daily caps. */
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
  // Equirectangular approximation, fine for short hops.
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

// --- Rate lookup ---

function pickSchedule(city: string, date: Date, schedules: RateSchedule[]): RateSchedule | null {
  if (city === "Stockholm") return pickStockholmSchedule(date);
  // For other cities, take the first schedule whose date range covers `date`.
  const iso = date.toISOString().slice(0, 10);
  return schedules.find(
    (s) => s.effectiveFrom <= iso && (s.effectiveTo === null || iso <= s.effectiveTo),
  ) ?? schedules[0] ?? null;
}

function findRange(date: Date, schedule: RateSchedule): TimeRange | null {
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const isWeekday = day >= 1 && day <= 5;
  const minutes = date.getHours() * 60 + date.getMinutes();
  for (const r of schedule.timeRanges) {
    if (r.weekdayOnly && !isWeekday) continue;
    const [sh, sm] = r.start.split(":").map(Number);
    const [eh, em] = r.end.split(":").map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;
    if (minutes >= startM && minutes < endM) return r;
  }
  return null;
}

function chargeFor(direction: "inbound" | "outbound", range: TimeRange): number {
  return direction === "inbound" ? range.priceInbound : range.priceOutbound;
}

// --- Public API ---

export function detectCrossings(
  routeCoords: GeoPoint[],
  startTime: Date,
  totalDurationMin: number,
): Crossing[] {
  if (routeCoords.length < 2) return [];

  // Cumulative distance per vertex, used to interpolate time of passage.
  const cumKm: number[] = [0];
  for (let i = 1; i < routeCoords.length; i++) {
    cumKm.push(cumKm[i - 1] + approxSegmentLengthKm(routeCoords[i - 1], routeCoords[i]));
  }
  const totalKm = cumKm[cumKm.length - 1] || 1;

  const crossings: Crossing[] = [];

  for (const zone of ZONES) {
    for (const cp of zone.controlPoints) {
      // Find any route segment that crosses this gate. Take the FIRST crossing
      // per (city, control point) per leg to avoid double counting jitter.
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
      const schedule = pickSchedule(zone.city, time, zone.schedules);
      const range = schedule ? findRange(time, schedule) : null;
      const charge = range ? chargeFor(direction, range) : 0;

      crossings.push({
        city: zone.city,
        controlPoint: cp.name,
        direction,
        time,
        charge,
        point: found.pt,
      });
    }
  }

  return crossings;
}

export function applyDailyCaps(crossings: Crossing[]): CongestionResult {
  const totalsByCity: Record<string, number> = {};
  // Group by city + calendar day, apply cap.
  const buckets = new Map<string, { city: string; charges: Crossing[] }>();
  for (const c of crossings) {
    const day = c.time.toISOString().slice(0, 10);
    const key = `${c.city}|${day}`;
    if (!buckets.has(key)) buckets.set(key, { city: c.city, charges: [] });
    buckets.get(key)!.charges.push(c);
  }

  for (const { city, charges } of buckets.values()) {
    const cap = ZONES.find((z) => z.city === city)?.dailyCap ?? Infinity;
    const raw = charges.reduce((s, c) => s + c.charge, 0);
    const applied = Math.min(raw, cap);
    totalsByCity[city] = (totalsByCity[city] ?? 0) + applied;
  }

  const total = Object.values(totalsByCity).reduce((s, v) => s + v, 0);
  return { crossings, totalsByCity, total };
}
