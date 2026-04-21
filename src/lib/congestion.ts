/**
 * Crossing detection + rate calculation for Swedish trängselskatt.
 *
 * MODEL
 * -----
 * The Swedish congestion tax is levied when a vehicle crosses the cordon
 * around a defined zone, not when it passes a specific camera. We mirror
 * this directly:
 *
 *   1. For Stockholm, we maintain two zone polygons:
 *        - STOCKHOLM_INNER_POLYGON (Kungsholmen + Södermalm + Norra
 *          innerstaden, with the Essingeleden islands subtracted)
 *        - STOCKHOLM_ESSINGELEDEN_POLYGON (Stora + Lilla Essingen)
 *   2. For every edge of the route polyline, we find the points where it
 *      crosses a zone boundary. Each crossing is a billable passage.
 *   3. Tariff type is determined by which polygon was crossed.
 *   4. The exact camera (CP) attributed to a crossing is the nearest
 *      Lastkajen control point to the crossing coordinate — used for UI
 *      display and debugging only; the charge is derived from the polygon
 *      that was crossed, not the CP.
 *
 * For Gothenburg we keep the previous point-based detector because
 * Gothenburg's charging rules are defined per control point (not cordon).
 *
 * Multi-passage rules (unchanged):
 *   - Stockholm combined inner+Essingeleden daily cap (135 high / 105 low)
 *   - Stockholm Essingeleden: same-direction multi-crossings collapse to
 *     the highest. For the polygon model this is natural — entering and
 *     leaving the Essingeleden island always gives you exactly two
 *     boundary crossings, which should combine to one charge.
 *   - Gothenburg flerpassageregeln: within any 60-minute sliding window,
 *     only the highest-value crossing counts.
 *   - Gothenburg Backa transit approximation.
 */

import {
  ZONES,
  SCHEDULES,
  STOCKHOLM_INNER_POLYGON,
  STOCKHOLM_ESSINGELEDEN_POLYGON,
  lookupAmount,
  isStockholmHighSeason,
  stockholmDailyCap,
  GOTHENBURG_DAILY_CAP,
  BACKA_BBOX,
  type Polygon,
  type ControlPoint,
  type GeoPoint,
  type ScheduleKey,
} from "./congestion-zones";
import { isChargingDay } from "./swedishHolidays";

/** Tolerance for Gothenburg point-based detection (meters). */
export const GOTHENBURG_PROXIMITY_METERS = 25;

export type Crossing = {
  city: "Stockholm" | "Gothenburg";
  station: string;
  cpId: number;
  tariff: ScheduleKey;
  direction: "north" | "south" | "other";
  time: Date;
  charge: number;
  point: GeoPoint;
  backaArea?: boolean;
};

export type CongestionResult = {
  crossings: Crossing[];
  totalsByCity: Record<string, number>;
  total: number;
};

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function segmentLengthKm(a: GeoPoint, b: GeoPoint): number {
  const meanLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = (b.lng - a.lng) * Math.cos(meanLat) * 111.32;
  const dy = (b.lat - a.lat) * 111.32;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Segment–segment intersection in WGS84 lat/lng (treated as a planar 2D problem). */
function segmentIntersection(
  p1: GeoPoint,
  p2: GeoPoint,
  p3: GeoPoint,
  p4: GeoPoint,
): { point: GeoPoint; t: number } | null {
  const x1 = p1.lng, y1 = p1.lat;
  const x2 = p2.lng, y2 = p2.lat;
  const x3 = p3.lng, y3 = p3.lat;
  const x4 = p4.lng, y4 = p4.lat;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-14) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return {
    point: { lng: x1 + t * (x2 - x1), lat: y1 + t * (y2 - y1) },
    t,
  };
}

function haversineM(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** All points where the route polyline crosses any ring of the polygon. */
function polygonBoundaryCrossings(
  routeCoords: GeoPoint[],
  polygon: Polygon,
): Array<{ point: GeoPoint; segIdx: number; t: number }> {
  const rings: GeoPoint[][] = [polygon.outer, ...polygon.holes];
  const hits: Array<{ point: GeoPoint; segIdx: number; t: number }> = [];
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const a = routeCoords[i];
    const b = routeCoords[i + 1];
    for (const ring of rings) {
      for (let j = 0; j < ring.length - 1; j++) {
        const r = segmentIntersection(a, b, ring[j], ring[j + 1]);
        if (r) hits.push({ point: r.point, segIdx: i, t: r.t });
      }
    }
  }
  hits.sort((x, y) => x.segIdx - y.segIdx || x.t - y.t);
  return hits;
}

function pointToSegmentMeters(
  p: GeoPoint,
  a: GeoPoint,
  b: GeoPoint,
): { distance: number; t: number } {
  const meanLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const mLat = 111320;
  const mLng = 111320 * Math.cos(meanLat);
  const bx = (b.lng - a.lng) * mLng;
  const by = (b.lat - a.lat) * mLat;
  const px = (p.lng - a.lng) * mLng;
  const py = (p.lat - a.lat) * mLat;
  const segLenSq = bx * bx + by * by;
  if (segLenSq < 1e-6) return { distance: Math.sqrt(px * px + py * py), t: 0 };
  let t = (px * bx + py * by) / segLenSq;
  t = Math.max(0, Math.min(1, t));
  const dx = px - t * bx;
  const dy = py - t * by;
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

/** Nearest Stockholm control point with the given tariff. */
function nearestStockholmCp(
  target: GeoPoint,
  tariff: ScheduleKey,
): ControlPoint | null {
  const stockholmZone = ZONES.find((z) => z.city === "Stockholm");
  if (!stockholmZone) return null;
  let best: ControlPoint | null = null;
  let bestD = Infinity;
  for (const cp of stockholmZone.controlPoints) {
    if (cp.tariff !== tariff) continue;
    const d = haversineM(target, cp.point);
    if (d < bestD) {
      bestD = d;
      best = cp;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export function detectCrossings(
  routeCoords: GeoPoint[],
  startTime: Date,
  totalDurationMin: number,
): Crossing[] {
  if (routeCoords.length < 2) return [];

  const cumKm: number[] = [0];
  for (let i = 1; i < routeCoords.length; i++) {
    cumKm.push(cumKm[i - 1] + segmentLengthKm(routeCoords[i - 1], routeCoords[i]));
  }
  const totalKm = cumKm[cumKm.length - 1] || 1;

  const timeAt = (segIdx: number, t: number): Date => {
    const kmAtHit = cumKm[segIdx] + t * (cumKm[segIdx + 1] - cumKm[segIdx]);
    const minAtHit = (kmAtHit / totalKm) * totalDurationMin;
    return new Date(startTime.getTime() + minAtHit * 60_000);
  };

  const directionAt = (segIdx: number): Crossing["direction"] => {
    const a = routeCoords[segIdx];
    const b = routeCoords[segIdx + 1];
    const dy = (b.lat - a.lat) * 111320;
    const meanLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
    const dx = (b.lng - a.lng) * 111320 * Math.cos(meanLat);
    if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? "north" : "south";
    return "other";
  };

  const crossings: Crossing[] = [];

  // Stockholm — polygon-based
  const innerHits = polygonBoundaryCrossings(routeCoords, STOCKHOLM_INNER_POLYGON);
  for (const hit of innerHits) {
    const time = timeAt(hit.segIdx, hit.t);
    const cp = nearestStockholmCp(hit.point, "stockholm-inner");
    const charge = isChargingDay(time, "Stockholm")
      ? lookupAmount("stockholm-inner", time)
      : 0;
    crossings.push({
      city: "Stockholm",
      station: cp?.station ?? "Stockholm innerstad",
      cpId: cp?.cpId ?? -1,
      tariff: "stockholm-inner",
      direction: directionAt(hit.segIdx),
      time,
      charge,
      point: hit.point,
    });
  }

  const essHits = polygonBoundaryCrossings(routeCoords, STOCKHOLM_ESSINGELEDEN_POLYGON);
  for (const hit of essHits) {
    const time = timeAt(hit.segIdx, hit.t);
    const cp = nearestStockholmCp(hit.point, "stockholm-essingeleden");
    const charge = isChargingDay(time, "Stockholm")
      ? lookupAmount("stockholm-essingeleden", time)
      : 0;
    crossings.push({
      city: "Stockholm",
      station: cp?.station ?? "Essingeleden",
      cpId: cp?.cpId ?? -1,
      tariff: "stockholm-essingeleden",
      direction: directionAt(hit.segIdx),
      time,
      charge,
      point: hit.point,
    });
  }

  // Gothenburg — per-CP, unchanged approach
  const gothZone = ZONES.find((z) => z.city === "Gothenburg");
  if (gothZone) {
    type RawHit = { cp: ControlPoint; segIdx: number; t: number; distance: number };
    const rawHits: RawHit[] = [];
    for (const cp of gothZone.controlPoints) {
      let best: { segIdx: number; t: number; distance: number } | null = null;
      for (let i = 0; i < routeCoords.length - 1; i++) {
        const { distance, t } = pointToSegmentMeters(
          cp.point,
          routeCoords[i],
          routeCoords[i + 1],
        );
        if (
          distance <= GOTHENBURG_PROXIMITY_METERS &&
          (best === null || distance < best.distance)
        ) {
          best = { segIdx: i, t, distance };
        }
      }
      if (best) rawHits.push({ cp, ...best });
    }
    const bestByStation = new Map<string, RawHit>();
    for (const hit of rawHits) {
      const key = hit.cp.station;
      const prev = bestByStation.get(key);
      if (!prev || hit.distance < prev.distance) bestByStation.set(key, hit);
    }
    for (const { cp, segIdx, t } of bestByStation.values()) {
      const time = timeAt(segIdx, t);
      const charge = isChargingDay(time, "Gothenburg")
        ? lookupAmount(cp.tariff, time)
        : 0;
      crossings.push({
        city: "Gothenburg",
        station: cp.station,
        cpId: cp.cpId,
        tariff: cp.tariff,
        direction: directionAt(segIdx),
        time,
        charge,
        point: cp.point,
        backaArea: cp.backaArea,
      });
    }
  }

  crossings.sort((a, b) => a.time.getTime() - b.time.getTime());

  // ---------------------------------------------------------------------------
  // On-Essingeleden state machine
  // ---------------------------------------------------------------------------
  //
  // Stora/Lilla Essingen are subtracted from STOCKHOLM_INNER_POLYGON, so that
  // polygon's outer ring now runs along the islands' coastlines. A route
  // going Råcksta → Tranebergsbron → Essingeleden → Liljeholmen can clip the
  // mainland-innerstads polygon multiple times where it passes Kungsholmens
  // water areas adjacent to the islands — those clips aren't real cordon
  // entries, they're just artifacts of how Kungsholmen's stadsdelsgräns
  // extends out over the water.
  //
  // The robust way to filter them is to model the physical reality: the car
  // is either on Essingeleden or it isn't. State flips every time we cross
  // the Essingeleden polygon. Any inner-polygon crossings that happen while
  // the car is on Essingeleden are geometric artifacts and must be dropped.
  //
  // Safety belt: if the polyline is coarse enough to skip over the
  // Essingeleden polygon edge entirely (possible with very sparse Google
  // polylines), the state machine can desync. To catch that case, also drop
  // any inner crossing whose coordinate lies within 50m of the Essingeleden
  // polygon boundary — tight enough to only fire on the island shoreline
  // itself, not on nearby mainland cordons like Tpl Fredhäll (which sits
  // ~500-600m from the Essingeleden polygon).
  const ESS_BOUNDARY_SAFETY_METERS = 50;

  const essRawHits = polygonBoundaryCrossings(routeCoords, STOCKHOLM_ESSINGELEDEN_POLYGON);
  const innerRawHits = polygonBoundaryCrossings(routeCoords, STOCKHOLM_INNER_POLYGON);

  // Build a merged, route-ordered event list for the state machine.
  type Event = { kind: "inner" | "ess"; segIdx: number; t: number; point: GeoPoint };
  const events: Event[] = [
    ...essRawHits.map((h): Event => ({ kind: "ess", ...h })),
    ...innerRawHits.map((h): Event => ({ kind: "inner", ...h })),
  ].sort((a, b) => a.segIdx - b.segIdx || a.t - b.t);

  const distToEssBoundaryM = (p: GeoPoint): number => {
    const rings = [
      STOCKHOLM_ESSINGELEDEN_POLYGON.outer,
      ...STOCKHOLM_ESSINGELEDEN_POLYGON.holes,
    ];
    let best = Infinity;
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const { distance } = pointToSegmentMeters(p, ring[i], ring[i + 1]);
        if (distance < best) best = distance;
      }
    }
    return best;
  };

  // Walk the events in order, tracking whether the car is currently on
  // Essingeleden. Each ess event flips the state; inner events while
  // "on Essingeleden" are dropped.
  //
  // We also do a one-sided lookahead: an inner crossing immediately
  // followed by an ess crossing within LOOKAHEAD_KM of route distance is
  // a ramp transition (the route clips Kungsholmens water-area polygon
  // edge on its way onto Essingeleden). The ess crossing is the real
  // billable event; the inner one is a polygon artifact. Only lookahead —
  // not lookbehind — is needed because post-ess-exit is handled by the
  // state machine directly (onEssingeleden stays true until the ess exit
  // event, at which point any subsequent inner crossing is legitimate).
  const LOOKAHEAD_KM = 1.5;

  const routeKmAt = (segIdx: number, t: number): number =>
    cumKm[segIdx] + t * (cumKm[segIdx + 1] - cumKm[segIdx]);

  const shedInnerKeys = new Set<string>();
  let onEssingeleden = false;
  for (let idx = 0; idx < events.length; idx++) {
    const ev = events[idx];
    if (ev.kind === "ess") {
      onEssingeleden = !onEssingeleden;
      continue;
    }
    // kind === "inner"
    const key = `${ev.point.lat.toFixed(5)}|${ev.point.lng.toFixed(5)}`;
    // State rule: drop if currently on Essingeleden.
    if (onEssingeleden) {
      shedInnerKeys.add(key);
      continue;
    }
    // Safety belt: drop if geometrically on the Essingeleden shoreline
    // (catches polyline-skipping-ess-polygon cases).
    if (distToEssBoundaryM(ev.point) < ESS_BOUNDARY_SAFETY_METERS) {
      shedInnerKeys.add(key);
      continue;
    }
    // Lookahead: drop if the next event along the route is an ess entry
    // within LOOKAHEAD_KM. That means this inner "crossing" is the
    // Kungsholmen-water-area polygon edge the route clips on its way
    // toward an Essingeleden ramp, not a real mainland cordon.
    const ihKm = routeKmAt(ev.segIdx, ev.t);
    let rampTransition = false;
    for (let j = idx + 1; j < events.length; j++) {
      const next = events[j];
      const nextKm = routeKmAt(next.segIdx, next.t);
      if (nextKm - ihKm > LOOKAHEAD_KM) break;
      if (next.kind === "ess") {
        rampTransition = true;
        break;
      }
    }
    if (rampTransition) shedInnerKeys.add(key);
  }

  const deduped = crossings.filter((c) => {
    if (c.tariff !== "stockholm-inner") return true;
    const key = `${c.point.lat.toFixed(5)}|${c.point.lng.toFixed(5)}`;
    return !shedInnerKeys.has(key);
  });

  return deduped;
}

// ---------------------------------------------------------------------------
// Combining rules
// ---------------------------------------------------------------------------

function combineEssingeleden(crossings: Crossing[]): Crossing[] {
  const buckets = new Map<string, Crossing[]>();
  const out: Crossing[] = [];
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
    for (const c of list) out.push(c === best ? c : { ...c, charge: 0 });
  }
  return out;
}

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
    const cap =
      city === "Stockholm" ? stockholmDailyCap(charges[0].time) : GOTHENBURG_DAILY_CAP;
    const raw = charges.reduce((s, c) => s + c.charge, 0);
    totalsByCity[city] = (totalsByCity[city] ?? 0) + Math.min(raw, cap);
  }

  const total = Object.values(totalsByCity).reduce((s, v) => s + v, 0);
  return { crossings: combined, totalsByCity, total };
}

export { SCHEDULES, isStockholmHighSeason, lookupAmount };
