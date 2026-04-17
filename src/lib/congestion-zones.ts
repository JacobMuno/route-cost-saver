/**
 * Swedish congestion tax (trängselskatt) zone definitions.
 *
 * IMPORTANT: Rates change periodically. Stockholm has SEASONAL variation
 * (high season March–June and August–November; low season the rest of the year).
 * Gothenburg uses a single year-round schedule.
 *
 * Review and update this file annually against the official sources:
 *  - Stockholm: https://www.transportstyrelsen.se/sv/vagtrafik/Trangselskatt/Trangselskatt-i-stockholm/
 *  - Gothenburg: https://www.transportstyrelsen.se/sv/vagtrafik/Trangselskatt/Trangselskatt-i-goteborg/
 *
 * Each zone is checked independently: a vehicle is charged when its route
 * crosses any control point. Direction (inbound/outbound) is inferred from
 * the route geometry, not the user. Per-day caps apply per city.
 *
 * Adding a new city = add one entry to ZONES below. The rest of the app
 * (detection, charging, rendering) is data-driven from this module.
 */

export type GeoPoint = { lat: number; lng: number };

export type TimeRange = {
  /** "HH:MM" 24h, inclusive start */
  start: string;
  /** "HH:MM" 24h, exclusive end */
  end: string;
  /** If true, only Mon–Fri (excluding public holidays — not modelled here). */
  weekdayOnly: boolean;
  priceInbound: number;
  priceOutbound: number;
};

export type RateSchedule = {
  /** ISO date (YYYY-MM-DD) inclusive */
  effectiveFrom: string;
  /** ISO date (YYYY-MM-DD) inclusive, or null for open-ended */
  effectiveTo: string | null;
  timeRanges: TimeRange[];
};

export type ControlPoint = {
  name: string;
  /** A short line segment representing the gate. Crossing this segment = a charge event. */
  gate: { a: GeoPoint; b: GeoPoint };
  /**
   * Vector pointing in the "inbound" direction (toward city centre).
   * Used together with the route's crossing direction to label the event.
   */
  inboundVector: { dx: number; dy: number };
};

export type CongestionZone = {
  city: "Stockholm" | "Gothenburg";
  /** Visual polygon for shading the map (informational only — NOT used for charging). */
  zonePolygon: GeoPoint[];
  controlPoints: ControlPoint[];
  /** Daily maximum total charge for this city, in SEK. */
  dailyCap: number;
  /** One or more rate schedules; the matching schedule is used by date. */
  schedules: RateSchedule[];
};

// --- Stockholm ---
// Approximate cordon polygon (informational).
const STOCKHOLM_POLY: GeoPoint[] = [
  { lat: 59.3631, lng: 17.9706 }, // Essingeleden N
  { lat: 59.3700, lng: 18.0500 },
  { lat: 59.3725, lng: 18.0950 },
  { lat: 59.3500, lng: 18.1250 },
  { lat: 59.3100, lng: 18.1100 },
  { lat: 59.2960, lng: 18.0500 },
  { lat: 59.3050, lng: 17.9750 },
  { lat: 59.3300, lng: 17.9550 },
];

// Stockholm control points — selected representative gates.
// Coordinates are approximate (within tens of metres) of the official cordon points.
const STOCKHOLM_CPS: ControlPoint[] = [
  {
    name: "Lilla Essingen N",
    gate: {
      a: { lat: 59.3270, lng: 17.9810 },
      b: { lat: 59.3270, lng: 17.9870 },
    },
    inboundVector: { dx: 1, dy: 0 }, // east = inbound
  },
  {
    name: "Norrtull",
    gate: {
      a: { lat: 59.3505, lng: 18.0420 },
      b: { lat: 59.3505, lng: 18.0510 },
    },
    inboundVector: { dx: 0, dy: -1 }, // south = inbound
  },
  {
    name: "Roslagsvägen",
    gate: {
      a: { lat: 59.3590, lng: 18.0650 },
      b: { lat: 59.3590, lng: 18.0740 },
    },
    inboundVector: { dx: 0, dy: -1 },
  },
  {
    name: "Lidingövägen",
    gate: {
      a: { lat: 59.3470, lng: 18.0950 },
      b: { lat: 59.3470, lng: 18.1030 },
    },
    inboundVector: { dx: -1, dy: 0 }, // west = inbound
  },
  {
    name: "Skanstull",
    gate: {
      a: { lat: 59.3060, lng: 18.0735 },
      b: { lat: 59.3060, lng: 18.0820 },
    },
    inboundVector: { dx: 0, dy: 1 }, // north = inbound
  },
  {
    name: "Liljeholmsbron",
    gate: {
      a: { lat: 59.3140, lng: 18.0250 },
      b: { lat: 59.3140, lng: 18.0335 },
    },
    inboundVector: { dx: 0, dy: 1 },
  },
];

// Stockholm rates — high season (Mar–Jun, Aug–Nov) and low season (the rest).
const STOCKHOLM_HIGH: RateSchedule = {
  effectiveFrom: "2024-01-01",
  effectiveTo: null,
  timeRanges: [
    { start: "06:00", end: "06:30", weekdayOnly: true, priceInbound: 15, priceOutbound: 15 },
    { start: "06:30", end: "07:00", weekdayOnly: true, priceInbound: 25, priceOutbound: 25 },
    { start: "07:00", end: "08:30", weekdayOnly: true, priceInbound: 45, priceOutbound: 45 },
    { start: "08:30", end: "09:00", weekdayOnly: true, priceInbound: 25, priceOutbound: 25 },
    { start: "09:00", end: "15:00", weekdayOnly: true, priceInbound: 15, priceOutbound: 15 },
    { start: "15:00", end: "15:30", weekdayOnly: true, priceInbound: 25, priceOutbound: 25 },
    { start: "15:30", end: "17:00", weekdayOnly: true, priceInbound: 45, priceOutbound: 45 },
    { start: "17:00", end: "17:30", weekdayOnly: true, priceInbound: 35, priceOutbound: 35 },
    { start: "17:30", end: "18:00", weekdayOnly: true, priceInbound: 25, priceOutbound: 25 },
    { start: "18:00", end: "18:30", weekdayOnly: true, priceInbound: 15, priceOutbound: 15 },
  ],
};

const STOCKHOLM_LOW: RateSchedule = {
  effectiveFrom: "2024-01-01",
  effectiveTo: null,
  timeRanges: [
    { start: "06:00", end: "06:30", weekdayOnly: true, priceInbound: 15, priceOutbound: 15 },
    { start: "06:30", end: "07:00", weekdayOnly: true, priceInbound: 25, priceOutbound: 25 },
    { start: "07:00", end: "08:30", weekdayOnly: true, priceInbound: 35, priceOutbound: 35 },
    { start: "08:30", end: "09:00", weekdayOnly: true, priceInbound: 25, priceOutbound: 25 },
    { start: "09:00", end: "15:00", weekdayOnly: true, priceInbound: 15, priceOutbound: 15 },
    { start: "15:00", end: "15:30", weekdayOnly: true, priceInbound: 25, priceOutbound: 25 },
    { start: "15:30", end: "17:00", weekdayOnly: true, priceInbound: 35, priceOutbound: 35 },
    { start: "17:00", end: "17:30", weekdayOnly: true, priceInbound: 25, priceOutbound: 25 },
    { start: "17:30", end: "18:00", weekdayOnly: true, priceInbound: 20, priceOutbound: 20 },
    { start: "18:00", end: "18:30", weekdayOnly: true, priceInbound: 15, priceOutbound: 15 },
  ],
};

// --- Gothenburg ---
const GOTHENBURG_POLY: GeoPoint[] = [
  { lat: 57.7250, lng: 11.9300 },
  { lat: 57.7280, lng: 11.9850 },
  { lat: 57.7150, lng: 12.0150 },
  { lat: 57.6900, lng: 12.0100 },
  { lat: 57.6850, lng: 11.9650 },
  { lat: 57.6950, lng: 11.9300 },
];

const GOTHENBURG_CPS: ControlPoint[] = [
  {
    name: "Tingstadstunneln",
    gate: {
      a: { lat: 57.7240, lng: 11.9740 },
      b: { lat: 57.7240, lng: 11.9810 },
    },
    inboundVector: { dx: 0, dy: -1 },
  },
  {
    name: "Götaälvbron",
    gate: {
      a: { lat: 57.7150, lng: 11.9620 },
      b: { lat: 57.7150, lng: 11.9690 },
    },
    inboundVector: { dx: 0, dy: -1 },
  },
  {
    name: "Älvsborgsbron",
    gate: {
      a: { lat: 57.6940, lng: 11.9050 },
      b: { lat: 57.6940, lng: 11.9120 },
    },
    inboundVector: { dx: 1, dy: 0 },
  },
  {
    name: "E6 Söder",
    gate: {
      a: { lat: 57.6850, lng: 11.9850 },
      b: { lat: 57.6850, lng: 11.9930 },
    },
    inboundVector: { dx: 0, dy: 1 },
  },
];

const GOTHENBURG_SCHEDULE: RateSchedule = {
  effectiveFrom: "2024-01-01",
  effectiveTo: null,
  timeRanges: [
    { start: "06:00", end: "06:30", weekdayOnly: true, priceInbound: 9, priceOutbound: 9 },
    { start: "06:30", end: "07:00", weekdayOnly: true, priceInbound: 16, priceOutbound: 16 },
    { start: "07:00", end: "08:00", weekdayOnly: true, priceInbound: 22, priceOutbound: 22 },
    { start: "08:00", end: "08:30", weekdayOnly: true, priceInbound: 16, priceOutbound: 16 },
    { start: "08:30", end: "15:00", weekdayOnly: true, priceInbound: 9, priceOutbound: 9 },
    { start: "15:00", end: "15:30", weekdayOnly: true, priceInbound: 16, priceOutbound: 16 },
    { start: "15:30", end: "17:00", weekdayOnly: true, priceInbound: 22, priceOutbound: 22 },
    { start: "17:00", end: "18:00", weekdayOnly: true, priceInbound: 16, priceOutbound: 16 },
    { start: "18:00", end: "18:30", weekdayOnly: true, priceInbound: 9, priceOutbound: 9 },
  ],
};

/** Pick the right Stockholm schedule by date (high vs low season). */
export function pickStockholmSchedule(date: Date): RateSchedule {
  const m = date.getMonth() + 1; // 1..12
  const high = (m >= 3 && m <= 6) || (m >= 8 && m <= 11);
  return high ? STOCKHOLM_HIGH : STOCKHOLM_LOW;
}

export const ZONES: CongestionZone[] = [
  {
    city: "Stockholm",
    zonePolygon: STOCKHOLM_POLY,
    controlPoints: STOCKHOLM_CPS,
    dailyCap: 135,
    schedules: [STOCKHOLM_HIGH, STOCKHOLM_LOW],
  },
  {
    city: "Gothenburg",
    zonePolygon: GOTHENBURG_POLY,
    controlPoints: GOTHENBURG_CPS,
    dailyCap: 60,
    schedules: [GOTHENBURG_SCHEDULE],
  },
];
