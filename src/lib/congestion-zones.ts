/**
 * Swedish congestion tax (trängselskatt) zone definitions.
 *
 * Control points sourced directly from Trafikverket's official Lastkajen
 * GeoPackage "Betalstationer" dataset (EPSG:3006 SWEREF-99-TM, reprojected
 * to WGS84/EPSG:4326). Each control point is a single camera position with
 * a unique CP_nummer from the source data. A betalstation typically
 * consists of 2–8 control points covering different ramps and directions.
 *
 * Source: https://lastkajen.trafikverket.se/ — ordered 2026-04-17.
 * License: CC0 1.0 Universal.
 *
 * Rate schedules last verified 2026-04-18 against:
 *  - https://www.transportstyrelsen.se/sv/vagtrafik/fordon/skatter-och-avgifter/trangselskatt/trangselskatt-i-stockholm/
 *  - https://www.transportstyrelsen.se/sv/vagtrafik/fordon/skatter-och-avgifter/trangselskatt/trangselskatt-i-goteborg/
 *
 * Tariff assignment notes:
 *  - Stockholm CP 321, 322, 323 (Stora Essingen), 332 (Lilla Essingen),
 *    345-348 (Tpl Fredhäll Essingeleden-ramper) → "stockholm-essingeleden".
 *  - Stockholm CP 341-344 (Tpl Fredhäll Drottningholmsvägen) and 351-354
 *    (Tpl Kristineberg) → "stockholm-inner". Verified against the official
 *    PDF maps (Betalstation 8/9).
 *  - Gothenburg "K"-prefixed stations (Bäcktuvevägen, Tuvevägen,
 *    Minelundsvägen, Deltavägen, Backavägen) are the Backa-area stations
 *    where only transit traffic is taxed (backaArea=true).
 */

export type GeoPoint = { lat: number; lng: number };

export type CongestionCity = "Stockholm" | "Gothenburg";

export type ScheduleKey =
  | "stockholm-inner"
  | "stockholm-essingeleden"
  | "gothenburg";

export type SeasonalTimeRange = {
  startMinute: number;
  endMinute: number;
  amountHighSeason: number;
  amountLowSeason: number;
};

export type FlatTimeRange = {
  startMinute: number;
  endMinute: number;
  amount: number;
};

export type TimeRange = SeasonalTimeRange | FlatTimeRange;

export type RateSchedule = {
  key: ScheduleKey;
  city: CongestionCity;
  seasonality: "seasonal" | "year-round";
  timeRanges: TimeRange[];
};

/**
 * A single camera/kontrollpunkt. Unlike the previous model this represents
 * a POINT, not a line segment — detection is done via point-to-route-segment
 * distance rather than line-segment intersection, which is far more robust
 * than the previous approach.
 */
export type ControlPoint = {
  /** Official Betalstation name from Lastkajen source. */
  station: string;
  /** Official CP_nummer from Lastkajen source — use for debugging / traceability. */
  cpId: number;
  /** Camera position (WGS84). */
  point: GeoPoint;
  tariff: ScheduleKey;
  /** Gothenburg only: marks Backa-area control points for the transit-only approximation. */
  backaArea?: boolean;
};

export type CongestionZone = {
  city: CongestionCity;
  controlPoints: ControlPoint[];
  dailyCap: number;
  schedules: RateSchedule[];
};

// =============================================================================
// STOCKHOLM — 61 kontrollpunkter fördelade på 22 betalstationer
// =============================================================================

export const STOCKHOLM_CONTROL_POINTS: ControlPoint[] = [
  { station: "Danvikstull", cpId: 271, point: { lat: 59.314021, lng: 18.103511 }, tariff: "stockholm-inner" },
  { station: "Danvikstull", cpId: 272, point: { lat: 59.313917, lng: 18.103445 }, tariff: "stockholm-inner" },
  { station: "Skansbron", cpId: 281, point: { lat: 59.304025, lng: 18.079426 }, tariff: "stockholm-inner" },
  { station: "Skansbron", cpId: 282, point: { lat: 59.304037, lng: 18.079418 }, tariff: "stockholm-inner" },
  { station: "Skanstullsbron", cpId: 291, point: { lat: 59.306332, lng: 18.077467 }, tariff: "stockholm-inner" },
  { station: "Skanstullsbron", cpId: 292, point: { lat: 59.306303, lng: 18.077267 }, tariff: "stockholm-inner" },
  { station: "Johanneshovsbron", cpId: 301, point: { lat: 59.303811, lng: 18.077202 }, tariff: "stockholm-inner" },
  { station: "Johanneshovsbron", cpId: 302, point: { lat: 59.303782, lng: 18.077053 }, tariff: "stockholm-inner" },
  { station: "Liljeholmsbron", cpId: 311, point: { lat: 59.311440, lng: 18.028826 }, tariff: "stockholm-inner" },
  { station: "Liljeholmsbron", cpId: 312, point: { lat: 59.311962, lng: 18.029223 }, tariff: "stockholm-inner" },
  { station: "Stora Essingen", cpId: 321, point: { lat: 59.322903, lng: 17.996677 }, tariff: "stockholm-essingeleden" },
  { station: "Stora Essingen", cpId: 322, point: { lat: 59.322887, lng: 17.996572 }, tariff: "stockholm-essingeleden" },
  { station: "Stora Essingen", cpId: 323, point: { lat: 59.322061, lng: 17.996297 }, tariff: "stockholm-essingeleden" },
  { station: "Lilla Essingen", cpId: 332, point: { lat: 59.325113, lng: 18.003990 }, tariff: "stockholm-essingeleden" },
  { station: "Tpl Fredhäll/Drottningsholmsvägen", cpId: 341, point: { lat: 59.331193, lng: 18.010974 }, tariff: "stockholm-inner" },
  { station: "Tpl Fredhäll/Drottningsholmsvägen", cpId: 342, point: { lat: 59.331504, lng: 18.010589 }, tariff: "stockholm-inner" },
  { station: "Tpl Fredhäll/Drottningsholmsvägen", cpId: 343, point: { lat: 59.330667, lng: 18.010536 }, tariff: "stockholm-inner" },
  { station: "Tpl Fredhäll/Drottningsholmsvägen", cpId: 344, point: { lat: 59.331363, lng: 18.010653 }, tariff: "stockholm-inner" },
  { station: "Tpl Fredhäll/Drottningsholmsvägen", cpId: 345, point: { lat: 59.331263, lng: 18.008941 }, tariff: "stockholm-essingeleden" },
  { station: "Tpl Fredhäll/Drottningsholmsvägen", cpId: 346, point: { lat: 59.331657, lng: 18.010560 }, tariff: "stockholm-essingeleden" },
  { station: "Tpl Fredhäll/Drottningsholmsvägen", cpId: 347, point: { lat: 59.333734, lng: 18.009726 }, tariff: "stockholm-essingeleden" },
  { station: "Tpl Fredhäll/Drottningsholmsvägen", cpId: 348, point: { lat: 59.333725, lng: 18.009903 }, tariff: "stockholm-essingeleden" },
  { station: "Tpl Kristineberg", cpId: 351, point: { lat: 59.336454, lng: 18.010285 }, tariff: "stockholm-inner" },
  { station: "Tpl Kristineberg", cpId: 352, point: { lat: 59.336183, lng: 18.010822 }, tariff: "stockholm-inner" },
  { station: "Tpl Kristineberg", cpId: 353, point: { lat: 59.333720, lng: 18.010092 }, tariff: "stockholm-inner" },
  { station: "Tpl Kristineberg", cpId: 354, point: { lat: 59.333740, lng: 18.009502 }, tariff: "stockholm-inner" },
  { station: "Ekelundsbron", cpId: 361, point: { lat: 59.340625, lng: 18.012929 }, tariff: "stockholm-inner" },
  { station: "Ekelundsbron", cpId: 362, point: { lat: 59.340607, lng: 18.012923 }, tariff: "stockholm-inner" },
  { station: "Klarastrandsleden", cpId: 371, point: { lat: 59.338766, lng: 18.029898 }, tariff: "stockholm-inner" },
  { station: "Klarastrandsleden", cpId: 372, point: { lat: 59.338810, lng: 18.029942 }, tariff: "stockholm-inner" },
  { station: "Tomtebodavägen", cpId: 381, point: { lat: 59.343682, lng: 18.026088 }, tariff: "stockholm-inner" },
  { station: "Tomtebodavägen", cpId: 382, point: { lat: 59.343750, lng: 18.026203 }, tariff: "stockholm-inner" },
  { station: "Solnabron", cpId: 391, point: { lat: 59.346587, lng: 18.032248 }, tariff: "stockholm-inner" },
  { station: "Solnabron", cpId: 392, point: { lat: 59.346798, lng: 18.032126 }, tariff: "stockholm-inner" },
  { station: "Tpl Norrtull", cpId: 401, point: { lat: 59.349759, lng: 18.042638 }, tariff: "stockholm-inner" },
  { station: "Tpl Norrtull", cpId: 402, point: { lat: 59.350400, lng: 18.043955 }, tariff: "stockholm-inner" },
  { station: "Tpl Norrtull", cpId: 403, point: { lat: 59.349707, lng: 18.042496 }, tariff: "stockholm-inner" },
  { station: "Tpl Ekhagen", cpId: 411, point: { lat: 59.371138, lng: 18.050305 }, tariff: "stockholm-inner" },
  { station: "Tpl Ekhagen", cpId: 412, point: { lat: 59.371417, lng: 18.050864 }, tariff: "stockholm-inner" },
  { station: "Tpl Ekhagen", cpId: 413, point: { lat: 59.369350, lng: 18.051552 }, tariff: "stockholm-inner" },
  { station: "Tpl Ekhagen", cpId: 414, point: { lat: 59.369495, lng: 18.050687 }, tariff: "stockholm-inner" },
  { station: "Tpl Frescati", cpId: 421, point: { lat: 59.365623, lng: 18.052477 }, tariff: "stockholm-inner" },
  { station: "Tpl Frescati", cpId: 422, point: { lat: 59.365621, lng: 18.052446 }, tariff: "stockholm-inner" },
  { station: "Tpl Universitetet", cpId: 431, point: { lat: 59.362978, lng: 18.054632 }, tariff: "stockholm-inner" },
  { station: "Tpl Universitetet", cpId: 432, point: { lat: 59.363110, lng: 18.055204 }, tariff: "stockholm-inner" },
  { station: "Tpl Roslagstull", cpId: 441, point: { lat: 59.352768, lng: 18.058007 }, tariff: "stockholm-inner" },
  { station: "Tpl Roslagstull", cpId: 442, point: { lat: 59.352484, lng: 18.058731 }, tariff: "stockholm-inner" },
  { station: "Värtan", cpId: 451, point: { lat: 59.351202, lng: 18.095254 }, tariff: "stockholm-inner" },
  { station: "Värtan", cpId: 452, point: { lat: 59.351422, lng: 18.095640 }, tariff: "stockholm-inner" },
  { station: "Värtan", cpId: 453, point: { lat: 59.352587, lng: 18.106462 }, tariff: "stockholm-inner" },
  { station: "Värtan", cpId: 454, point: { lat: 59.351791, lng: 18.106576 }, tariff: "stockholm-inner" },
  { station: "Värtan", cpId: 455, point: { lat: 59.350791, lng: 18.099338 }, tariff: "stockholm-inner" },
  { station: "Värtan", cpId: 456, point: { lat: 59.352593, lng: 18.106509 }, tariff: "stockholm-inner" },
  { station: "Ropsten", cpId: 461, point: { lat: 59.356590, lng: 18.105108 }, tariff: "stockholm-inner" },
  { station: "Ropsten", cpId: 462, point: { lat: 59.356646, lng: 18.104991 }, tariff: "stockholm-inner" },
  { station: "Ropsten", cpId: 463, point: { lat: 59.356974, lng: 18.102426 }, tariff: "stockholm-inner" },
  { station: "Ropsten", cpId: 464, point: { lat: 59.356901, lng: 18.102381 }, tariff: "stockholm-inner" },
  { station: "Hagastaden", cpId: 473, point: { lat: 59.347688, lng: 18.033042 }, tariff: "stockholm-inner" },
  { station: "Hagastaden", cpId: 474, point: { lat: 59.347673, lng: 18.033056 }, tariff: "stockholm-inner" },
  { station: "Hälsingegatan", cpId: 471, point: { lat: 59.349089, lng: 18.036206 }, tariff: "stockholm-inner" },
  { station: "Hälsingegatan", cpId: 472, point: { lat: 59.349051, lng: 18.036243 }, tariff: "stockholm-inner" },
];

// =============================================================================
// GÖTEBORG — 95 kontrollpunkter fördelade på 43 betalstationer (inkl. 10 Backa)
// =============================================================================

export const GOTHENBURG_CONTROL_POINTS: ControlPoint[] = [
  { station: "Fridkullagatan", cpId: 401, point: { lat: 57.682443, lng: 11.987615 }, tariff: "gothenburg" },
  { station: "Fridkullagatan", cpId: 402, point: { lat: 57.682431, lng: 11.987617 }, tariff: "gothenburg" },
  { station: "Gibraltargatan", cpId: 411, point: { lat: 57.682999, lng: 11.984493 }, tariff: "gothenburg" },
  { station: "Gibraltargatan", cpId: 412, point: { lat: 57.682975, lng: 11.984496 }, tariff: "gothenburg" },
  { station: "Doktor Allards gata", cpId: 421, point: { lat: 57.681569, lng: 11.978672 }, tariff: "gothenburg" },
  { station: "Doktor Allards gata", cpId: 422, point: { lat: 57.681583, lng: 11.978674 }, tariff: "gothenburg" },
  { station: "Ehrenströmsgatan", cpId: 431, point: { lat: 57.679170, lng: 11.968694 }, tariff: "gothenburg" },
  { station: "Ehrenströmsgatan", cpId: 432, point: { lat: 57.679197, lng: 11.968653 }, tariff: "gothenburg" },
  { station: "Dag Hammarskjöldsleden", cpId: 441, point: { lat: 57.677991, lng: 11.942352 }, tariff: "gothenburg" },
  { station: "Dag Hammarskjöldsleden", cpId: 442, point: { lat: 57.678060, lng: 11.942179 }, tariff: "gothenburg" },
  { station: "Margaretebergsgatan", cpId: 451, point: { lat: 57.680839, lng: 11.943235 }, tariff: "gothenburg" },
  { station: "Margaretebergsgatan", cpId: 452, point: { lat: 57.680831, lng: 11.943184 }, tariff: "gothenburg" },
  { station: "Fjällgatan/Jungmansgatan", cpId: 461, point: { lat: 57.696128, lng: 11.945613 }, tariff: "gothenburg" },
  { station: "Fjällgatan/Jungmansgatan", cpId: 462, point: { lat: 57.696137, lng: 11.945587 }, tariff: "gothenburg" },
  { station: "Stigbergsliden", cpId: 471, point: { lat: 57.699440, lng: 11.936818 }, tariff: "gothenburg" },
  { station: "Stigbergsliden", cpId: 472, point: { lat: 57.699523, lng: 11.936342 }, tariff: "gothenburg" },
  { station: "E45 Oscarsleden", cpId: 481, point: { lat: 57.699937, lng: 11.935893 }, tariff: "gothenburg" },
  { station: "E45 Oscarsleden", cpId: 482, point: { lat: 57.700057, lng: 11.935852 }, tariff: "gothenburg" },
  { station: "Emigrantvägen", cpId: 491, point: { lat: 57.700139, lng: 11.935808 }, tariff: "gothenburg" },
  { station: "Emigrantvägen", cpId: 492, point: { lat: 57.700143, lng: 11.935864 }, tariff: "gothenburg" },
  { station: "Älvsborgsbron", cpId: 501, point: { lat: 57.694935, lng: 11.898962 }, tariff: "gothenburg" },
  { station: "Älvsborgsbron", cpId: 502, point: { lat: 57.694975, lng: 11.899154 }, tariff: "gothenburg" },
  { station: "Lindholmsallén", cpId: 511, point: { lat: 57.707626, lng: 11.935812 }, tariff: "gothenburg" },
  { station: "Lindholmsallén", cpId: 512, point: { lat: 57.707811, lng: 11.935814 }, tariff: "gothenburg" },
  { station: "Karlavagnsgatan västra", cpId: 521, point: { lat: 57.708202, lng: 11.935284 }, tariff: "gothenburg" },
  { station: "Karlavagnsgatan västra", cpId: 522, point: { lat: 57.708238, lng: 11.935182 }, tariff: "gothenburg" },
  { station: "Polstjärnegatan", cpId: 531, point: { lat: 57.710562, lng: 11.936441 }, tariff: "gothenburg" },
  { station: "Polstjärnegatan", cpId: 532, point: { lat: 57.710565, lng: 11.936499 }, tariff: "gothenburg" },
  { station: "Polstjärnegatan", cpId: 533, point: { lat: 57.711386, lng: 11.937345 }, tariff: "gothenburg" },
  { station: "Polstjärnegatan", cpId: 534, point: { lat: 57.711384, lng: 11.937276 }, tariff: "gothenburg" },
  { station: "Karlavagnsgatan östra", cpId: 541, point: { lat: 57.711922, lng: 11.943060 }, tariff: "gothenburg" },
  { station: "Karlavagnsgatan östra", cpId: 542, point: { lat: 57.711909, lng: 11.943032 }, tariff: "gothenburg" },
  { station: "Hjalmar Brantingsgatan", cpId: 551, point: { lat: 57.720237, lng: 11.958067 }, tariff: "gothenburg" },
  { station: "Hjalmar Brantingsgatan", cpId: 552, point: { lat: 57.720497, lng: 11.959525 }, tariff: "gothenburg" },
  { station: "Södra Tagenevägen", cpId: 561, point: { lat: 57.759245, lng: 11.988648 }, tariff: "gothenburg" },
  { station: "Södra Tagenevägen", cpId: 562, point: { lat: 57.759224, lng: 11.988628 }, tariff: "gothenburg" },
  { station: "Skälltorpsvägen", cpId: 571, point: { lat: 57.758244, lng: 11.989638 }, tariff: "gothenburg" },
  { station: "Skälltorpsvägen", cpId: 572, point: { lat: 57.758173, lng: 11.989674 }, tariff: "gothenburg" },
  { station: "Backadalen", cpId: 581, point: { lat: 57.747641, lng: 11.988938 }, tariff: "gothenburg" },
  { station: "Backadalen", cpId: 582, point: { lat: 57.747538, lng: 11.988914 }, tariff: "gothenburg" },
  { station: "Tingstadsmotet avfart E6", cpId: 591, point: { lat: 57.732020, lng: 11.983320 }, tariff: "gothenburg" },
  { station: "Tingstadvägen", cpId: 601, point: { lat: 57.730946, lng: 11.982289 }, tariff: "gothenburg" },
  { station: "Tingstadvägen", cpId: 602, point: { lat: 57.730951, lng: 11.982272 }, tariff: "gothenburg" },
  { station: "Ringömotet", cpId: 611, point: { lat: 57.725811, lng: 11.975416 }, tariff: "gothenburg" },
  { station: "Ringömotet", cpId: 612, point: { lat: 57.726228, lng: 11.976992 }, tariff: "gothenburg" },
  { station: "Ringömotet", cpId: 613, point: { lat: 57.724513, lng: 11.982279 }, tariff: "gothenburg" },
  { station: "Ringömotet", cpId: 614, point: { lat: 57.724864, lng: 11.983056 }, tariff: "gothenburg" },
  { station: "Salsmästaregatan", cpId: 621, point: { lat: 57.724018, lng: 11.984633 }, tariff: "gothenburg" },
  { station: "Salsmästaregatan", cpId: 622, point: { lat: 57.724030, lng: 11.984661 }, tariff: "gothenburg" },
  { station: "Marieholmsgatan", cpId: 631, point: { lat: 57.720721, lng: 11.990755 }, tariff: "gothenburg" },
  { station: "Marieholmsgatan", cpId: 632, point: { lat: 57.720740, lng: 11.990783 }, tariff: "gothenburg" },
  { station: "E45 Marieholmsleden", cpId: 641, point: { lat: 57.720119, lng: 11.993764 }, tariff: "gothenburg" },
  { station: "E45 Marieholmsleden", cpId: 642, point: { lat: 57.720053, lng: 11.993930 }, tariff: "gothenburg" },
  { station: "E45 Marieholmsleden", cpId: 644, point: { lat: 57.719972, lng: 11.994108 }, tariff: "gothenburg" },
  { station: "Partihandelsgatan", cpId: 651, point: { lat: 57.718609, lng: 11.994543 }, tariff: "gothenburg" },
  { station: "Partihandelsgatan", cpId: 652, point: { lat: 57.718616, lng: 11.994566 }, tariff: "gothenburg" },
  { station: "E20 Alingsåsleden", cpId: 661, point: { lat: 57.716804, lng: 11.996882 }, tariff: "gothenburg" },
  { station: "E20 Alingsåsleden", cpId: 662, point: { lat: 57.716729, lng: 11.997046 }, tariff: "gothenburg" },
  { station: "Olskroksmotet avfart E20", cpId: 672, point: { lat: 57.715240, lng: 11.995054 }, tariff: "gothenburg" },
  { station: "Olskroksmotet påfart E6", cpId: 681, point: { lat: 57.714789, lng: 11.994947 }, tariff: "gothenburg" },
  { station: "Redbergsvägen", cpId: 693, point: { lat: 57.714059, lng: 11.994577 }, tariff: "gothenburg" },
  { station: "Redbergsvägen", cpId: 694, point: { lat: 57.713989, lng: 11.994832 }, tariff: "gothenburg" },
  { station: "Redbergsvägen", cpId: 696, point: { lat: 57.713654, lng: 11.995021 }, tariff: "gothenburg" },
  { station: "Willinsbron", cpId: 701, point: { lat: 57.709298, lng: 11.997061 }, tariff: "gothenburg" },
  { station: "Willinsbron", cpId: 702, point: { lat: 57.709217, lng: 11.997065 }, tariff: "gothenburg" },
  { station: "Örgrytevägen", cpId: 711, point: { lat: 57.697881, lng: 11.997232 }, tariff: "gothenburg" },
  { station: "Örgrytevägen", cpId: 712, point: { lat: 57.697715, lng: 11.997312 }, tariff: "gothenburg" },
  { station: "Kungsbackaleden", cpId: 721, point: { lat: 57.689872, lng: 12.000683 }, tariff: "gothenburg" },
  { station: "Kungsbackaleden", cpId: 722, point: { lat: 57.689013, lng: 12.001005 }, tariff: "gothenburg" },
  { station: "Kungsbackaleden", cpId: 723, point: { lat: 57.688474, lng: 12.001233 }, tariff: "gothenburg" },
  { station: "Kungsbackaleden", cpId: 724, point: { lat: 57.688449, lng: 12.001044 }, tariff: "gothenburg" },
  { station: "Sankt Sigfridsgatan", cpId: 731, point: { lat: 57.689193, lng: 12.004984 }, tariff: "gothenburg" },
  { station: "Sankt Sigfridsgatan", cpId: 732, point: { lat: 57.689427, lng: 12.004893 }, tariff: "gothenburg" },
  { station: "Mölndalsvägen", cpId: 751, point: { lat: 57.685064, lng: 11.999542 }, tariff: "gothenburg" },
  { station: "Mölndalsvägen", cpId: 752, point: { lat: 57.685030, lng: 11.999290 }, tariff: "gothenburg" },
  { station: "Marieholmstunneln avfart E6 norr", cpId: 761, point: { lat: 57.728241, lng: 11.986697 }, tariff: "gothenburg" },
  { station: "Marieholmstunneln påfart E6 norr", cpId: 772, point: { lat: 57.728644, lng: 11.986986 }, tariff: "gothenburg" },
  { station: "Bäcktuvevägen", cpId: 915, point: { lat: 57.738874, lng: 11.941017 }, tariff: "gothenburg", backaArea: true },
  { station: "Bäcktuvevägen", cpId: 916, point: { lat: 57.738887, lng: 11.941011 }, tariff: "gothenburg", backaArea: true },
  { station: "Tuvevägen", cpId: 925, point: { lat: 57.738914, lng: 11.941519 }, tariff: "gothenburg", backaArea: true },
  { station: "Tuvevägen", cpId: 926, point: { lat: 57.738898, lng: 11.941288 }, tariff: "gothenburg", backaArea: true },
  { station: "Minelundsvägen", cpId: 935, point: { lat: 57.729716, lng: 11.953061 }, tariff: "gothenburg", backaArea: true },
  { station: "Minelundsvägen", cpId: 936, point: { lat: 57.729713, lng: 11.953023 }, tariff: "gothenburg", backaArea: true },
  { station: "Deltavägen", cpId: 945, point: { lat: 57.728466, lng: 11.954098 }, tariff: "gothenburg", backaArea: true },
  { station: "Deltavägen", cpId: 946, point: { lat: 57.728469, lng: 11.954114 }, tariff: "gothenburg", backaArea: true },
  { station: "Backavägen In", cpId: 955, point: { lat: 57.726363, lng: 11.960283 }, tariff: "gothenburg", backaArea: true },
  { station: "Backavägen Ut", cpId: 956, point: { lat: 57.726392, lng: 11.960093 }, tariff: "gothenburg", backaArea: true },
];

// =============================================================================
// Rate schedules — unchanged from Transportstyrelsen's official tables
// =============================================================================

/** Stockholm inner-city tariff (SEK per passage). */
export const STOCKHOLM_INNER_SCHEDULE: RateSchedule = {
  key: "stockholm-inner",
  city: "Stockholm",
  seasonality: "seasonal",
  timeRanges: [
    { startMinute: 6 * 60,      endMinute: 6 * 60 + 30, amountHighSeason: 15, amountLowSeason: 15 },
    { startMinute: 6 * 60 + 30, endMinute: 7 * 60,      amountHighSeason: 30, amountLowSeason: 25 },
    { startMinute: 7 * 60,      endMinute: 8 * 60 + 30, amountHighSeason: 45, amountLowSeason: 35 },
    { startMinute: 8 * 60 + 30, endMinute: 9 * 60,      amountHighSeason: 30, amountLowSeason: 25 },
    { startMinute: 9 * 60,      endMinute: 9 * 60 + 30, amountHighSeason: 20, amountLowSeason: 15 },
    { startMinute: 9 * 60 + 30, endMinute: 15 * 60,     amountHighSeason: 11, amountLowSeason: 11 },
    { startMinute: 15 * 60,     endMinute: 15 * 60 + 30, amountHighSeason: 20, amountLowSeason: 15 },
    { startMinute: 15 * 60 + 30, endMinute: 16 * 60,    amountHighSeason: 30, amountLowSeason: 25 },
    { startMinute: 16 * 60,     endMinute: 17 * 60 + 30, amountHighSeason: 45, amountLowSeason: 35 },
    { startMinute: 17 * 60 + 30, endMinute: 18 * 60,    amountHighSeason: 30, amountLowSeason: 25 },
    { startMinute: 18 * 60,     endMinute: 18 * 60 + 30, amountHighSeason: 20, amountLowSeason: 15 },
  ],
};

/** Stockholm Essingeleden (E4) tariff (SEK per passage). */
export const STOCKHOLM_ESSINGELEDEN_SCHEDULE: RateSchedule = {
  key: "stockholm-essingeleden",
  city: "Stockholm",
  seasonality: "seasonal",
  timeRanges: [
    { startMinute: 6 * 60,      endMinute: 6 * 60 + 30, amountHighSeason: 15, amountLowSeason: 15 },
    { startMinute: 6 * 60 + 30, endMinute: 7 * 60,      amountHighSeason: 27, amountLowSeason: 22 },
    { startMinute: 7 * 60,      endMinute: 8 * 60 + 30, amountHighSeason: 40, amountLowSeason: 30 },
    { startMinute: 8 * 60 + 30, endMinute: 9 * 60,      amountHighSeason: 27, amountLowSeason: 22 },
    { startMinute: 9 * 60,      endMinute: 9 * 60 + 30, amountHighSeason: 20, amountLowSeason: 15 },
    { startMinute: 9 * 60 + 30, endMinute: 15 * 60,     amountHighSeason: 11, amountLowSeason: 11 },
    { startMinute: 15 * 60,     endMinute: 15 * 60 + 30, amountHighSeason: 20, amountLowSeason: 15 },
    { startMinute: 15 * 60 + 30, endMinute: 16 * 60,    amountHighSeason: 27, amountLowSeason: 22 },
    { startMinute: 16 * 60,     endMinute: 17 * 60 + 30, amountHighSeason: 40, amountLowSeason: 30 },
    { startMinute: 17 * 60 + 30, endMinute: 18 * 60,    amountHighSeason: 27, amountLowSeason: 22 },
    { startMinute: 18 * 60,     endMinute: 18 * 60 + 30, amountHighSeason: 20, amountLowSeason: 15 },
  ],
};

/** Gothenburg year-round tariff (SEK per passage). */
export const GOTHENBURG_SCHEDULE: RateSchedule = {
  key: "gothenburg",
  city: "Gothenburg",
  seasonality: "year-round",
  timeRanges: [
    { startMinute: 6 * 60,      endMinute: 6 * 60 + 30, amount: 9 },
    { startMinute: 6 * 60 + 30, endMinute: 7 * 60,      amount: 16 },
    { startMinute: 7 * 60,      endMinute: 8 * 60,      amount: 22 },
    { startMinute: 8 * 60,      endMinute: 8 * 60 + 30, amount: 16 },
    { startMinute: 8 * 60 + 30, endMinute: 15 * 60,     amount: 9 },
    { startMinute: 15 * 60,     endMinute: 15 * 60 + 30, amount: 16 },
    { startMinute: 15 * 60 + 30, endMinute: 17 * 60,    amount: 22 },
    { startMinute: 17 * 60,     endMinute: 18 * 60,     amount: 16 },
    { startMinute: 18 * 60,     endMinute: 18 * 60 + 30, amount: 9 },
  ],
};

export const SCHEDULES: Record<ScheduleKey, RateSchedule> = {
  "stockholm-inner": STOCKHOLM_INNER_SCHEDULE,
  "stockholm-essingeleden": STOCKHOLM_ESSINGELEDEN_SCHEDULE,
  gothenburg: GOTHENBURG_SCHEDULE,
};

function midsummerEve(year: number): Date {
  // Friday between June 19 and June 25 (inclusive).
  for (let d = 19; d <= 25; d++) {
    const dt = new Date(year, 5, d);
    if (dt.getDay() === 5) return dt;
  }
  return new Date(year, 5, 19);
}

/** True if date falls in Stockholm's high season. */
export function isStockholmHighSeason(date: Date): boolean {
  const y = date.getFullYear();
  const dayBeforeMidsummer = new Date(midsummerEve(y));
  dayBeforeMidsummer.setDate(dayBeforeMidsummer.getDate() - 1);
  const t = date.getTime();
  const springStart = new Date(y, 2, 1).getTime();
  if (t >= springStart && t <= dayBeforeMidsummer.setHours(23, 59, 59, 999)) return true;
  const autumnStart = new Date(y, 7, 15).getTime();
  const autumnEnd = new Date(y, 10, 30, 23, 59, 59, 999).getTime();
  if (t >= autumnStart && t <= autumnEnd) return true;
  return false;
}

export function lookupAmount(tariff: ScheduleKey, date: Date): number {
  const sched = SCHEDULES[tariff];
  const minutes = date.getHours() * 60 + date.getMinutes();
  const range = sched.timeRanges.find(
    (r) => minutes >= r.startMinute && minutes < r.endMinute,
  );
  if (!range) return 0;
  if (sched.seasonality === "seasonal") {
    const r = range as SeasonalTimeRange;
    return isStockholmHighSeason(date) ? r.amountHighSeason : r.amountLowSeason;
  }
  return (range as FlatTimeRange).amount;
}

export function stockholmDailyCap(date: Date): number {
  return isStockholmHighSeason(date) ? 135 : 105;
}

export const GOTHENBURG_DAILY_CAP = 60;

/** Approximate Backa-area bounding box (lat/lng). */
export const BACKA_BBOX = {
  minLat: 57.72,
  maxLat: 57.77,
  minLng: 11.93,
  maxLng: 12.0,
};

export const ZONES: CongestionZone[] = [
  {
    city: "Stockholm",
    controlPoints: STOCKHOLM_CONTROL_POINTS,
    dailyCap: 135,
    schedules: [STOCKHOLM_INNER_SCHEDULE, STOCKHOLM_ESSINGELEDEN_SCHEDULE],
  },
  {
    city: "Gothenburg",
    controlPoints: GOTHENBURG_CONTROL_POINTS,
    dailyCap: GOTHENBURG_DAILY_CAP,
    schedules: [GOTHENBURG_SCHEDULE],
  },
];
