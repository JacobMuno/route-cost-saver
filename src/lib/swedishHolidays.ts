/**
 * Swedish congestion-tax exempt-day rules for Stockholm and Gothenburg.
 *
 * Source: Transportstyrelsen — last verified 2026-04-18.
 *  - https://www.transportstyrelsen.se/sv/vagtrafik/Trangselskatt/
 *
 * Rules:
 *  - Saturdays and Sundays are exempt for both cities.
 *  - Stockholm: July is exempt EXCEPT the first 5 weekdays (Mon–Fri) of July.
 *  - Gothenburg: all of July is exempt.
 *  - City-specific recurring holidays and 2026/2027 fixed dates below.
 *  - Easter-derived dates are computed dynamically (Anonymous Gregorian algorithm).
 */

import type { CongestionCity } from "./congestion-zones";

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Anonymous Gregorian computus for Easter Sunday. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function midsummerEve(year: number): Date {
  for (let d = 19; d <= 25; d++) {
    const dt = new Date(year, 5, d);
    if (dt.getDay() === 5) return dt;
  }
  return new Date(year, 5, 19);
}

function allSaintsDay(year: number): Date {
  // Saturday between Oct 31 and Nov 6.
  for (let day = 31; day <= 31; day++) {
    const dt = new Date(year, 9, day);
    if (dt.getDay() === 6) return dt;
  }
  for (let day = 1; day <= 6; day++) {
    const dt = new Date(year, 10, day);
    if (dt.getDay() === 6) return dt;
  }
  return new Date(year, 10, 1);
}

function buildStockholmExempt(year: number): Set<string> {
  const e = easterSunday(year);
  const goodFriday = addDays(e, -2);
  const easterEve = addDays(e, -1);
  const easterMonday = addDays(e, 1);
  const ascension = addDays(e, 39);
  const mids = midsummerEve(year);
  const saints = allSaintsDay(year);

  const set = new Set<string>(
    [
      new Date(year, 0, 1), // Nyårsdagen
      new Date(year, 0, 5), // Trettondagsafton
      new Date(year, 0, 6), // Trettondedag jul
      goodFriday,
      easterEve,
      e,
      easterMonday,
      new Date(year, 4, 1), // Första maj
      ascension,
      new Date(year, 5, 6), // Nationaldagen
      mids,
      saints,
      new Date(year, 11, 24), // Julafton
      new Date(year, 11, 25),
      new Date(year, 11, 26),
    ].map(toIso),
  );

  // Stockholm also exempts the day before: Good Friday, Ascension Day,
  // All Saints' Day, May 1, National Day — only when that day-before is
  // a weekday (Mon–Fri).
  for (const holiday of [goodFriday, ascension, saints, new Date(year, 4, 1), new Date(year, 5, 6)]) {
    const prev = addDays(holiday, -1);
    const dow = prev.getDay();
    if (dow >= 1 && dow <= 5) set.add(toIso(prev));
  }
  return set;
}

function buildGothenburgExempt(year: number): Set<string> {
  const e = easterSunday(year);
  const maundyThursday = addDays(e, -3);
  const goodFriday = addDays(e, -2);
  const easterEve = addDays(e, -1);
  const easterMonday = addDays(e, 1);
  const ascension = addDays(e, 39);
  const dayBeforeAscension = addDays(ascension, -1);
  const mids = midsummerEve(year);
  const saints = allSaintsDay(year);
  const dayBeforeSaints = addDays(saints, -1);
  const dayBeforeNational = new Date(year, 5, 5);

  return new Set<string>(
    [
      new Date(year, 0, 1),
      new Date(year, 0, 5),
      new Date(year, 0, 6),
      maundyThursday,
      goodFriday,
      easterEve,
      e,
      easterMonday,
      new Date(year, 3, 30), // Valborg
      new Date(year, 4, 1),
      dayBeforeAscension,
      ascension,
      dayBeforeNational,
      new Date(year, 5, 6),
      mids,
      dayBeforeSaints,
      saints,
      new Date(year, 11, 24),
      new Date(year, 11, 25),
      new Date(year, 11, 26),
      new Date(year, 11, 31),
    ].map(toIso),
  );
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

/** First 5 weekdays (Mon–Fri) of July, used for Stockholm's July rule. */
function firstFiveJulyWeekdays(year: number): string[] {
  const out: string[] = [];
  for (let d = 1; out.length < 5 && d <= 14; d++) {
    const dt = new Date(year, 6, d);
    const dow = dt.getDay();
    if (dow >= 1 && dow <= 5) out.push(toIso(dt));
  }
  return out;
}

/**
 * Returns true if congestion tax applies on this date for the given city.
 * Honours weekends, July rules, and city-specific exempt dates.
 */
export function isChargingDay(date: Date, city: CongestionCity): boolean {
  if (isWeekend(date)) return false;
  const iso = toIso(date);
  const month = date.getMonth(); // 0 = Jan, 6 = July
  if (month === 6) {
    if (city === "Gothenburg") return false;
    // Stockholm: only first 5 weekdays of July are charging days.
    const allowed = firstFiveJulyWeekdays(date.getFullYear());
    if (!allowed.includes(iso)) return false;
  }
  const exempt =
    city === "Stockholm" ? buildStockholmExempt(date.getFullYear()) : buildGothenburgExempt(date.getFullYear());
  if (exempt.has(iso)) return false;
  return true;
}

// Re-export helpers for tests.
export const _internal = {
  toIso,
  easterSunday,
  midsummerEve,
  allSaintsDay,
  buildStockholmExempt,
  buildGothenburgExempt,
  firstFiveJulyWeekdays,
};
