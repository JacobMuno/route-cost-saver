/**
 * Swedish public holidays and congestion-tax charging-day rules.
 *
 * For trängselskatt, no charge is applied on:
 *  - Saturdays and Sundays
 *  - Swedish public holidays (helgdagar)
 *  - The weekday before a public holiday (dag före helgdag)
 *  - The whole month of July
 *
 * Holiday list covers 2025–2027. Update annually.
 * Sources:
 *  - https://www.transportstyrelsen.se/sv/vagtrafik/Trangselskatt/
 *  - Swedish public holiday calendar (helgdagar.se / officiella kalendrar)
 */

/** ISO date strings (YYYY-MM-DD) for Swedish public holidays. */
export const SWEDISH_HOLIDAYS: ReadonlySet<string> = new Set([
  // 2025
  "2025-01-01", // Nyårsdagen
  "2025-01-06", // Trettondedag jul
  "2025-04-18", // Långfredagen
  "2025-04-20", // Påskdagen
  "2025-04-21", // Annandag påsk
  "2025-05-01", // Första maj
  "2025-05-29", // Kristi himmelsfärdsdag
  "2025-06-06", // Sveriges nationaldag
  "2025-06-08", // Pingstdagen
  "2025-06-21", // Midsommardagen
  "2025-11-01", // Alla helgons dag
  "2025-12-25", // Juldagen
  "2025-12-26", // Annandag jul
  // 2026
  "2026-01-01",
  "2026-01-06",
  "2026-04-03", // Långfredagen
  "2026-04-05", // Påskdagen
  "2026-04-06", // Annandag påsk
  "2026-05-01",
  "2026-05-14", // Kristi himmelsfärdsdag
  "2026-05-24", // Pingstdagen
  "2026-06-06",
  "2026-06-20", // Midsommardagen
  "2026-10-31", // Alla helgons dag
  "2026-12-25",
  "2026-12-26",
  // 2027
  "2027-01-01",
  "2027-01-06",
  "2027-03-26", // Långfredagen
  "2027-03-28", // Påskdagen
  "2027-03-29", // Annandag påsk
  "2027-05-01",
  "2027-05-06", // Kristi himmelsfärdsdag
  "2027-05-16", // Pingstdagen
  "2027-06-06",
  "2027-06-26", // Midsommardagen
  "2027-11-06", // Alla helgons dag
  "2027-12-25",
  "2027-12-26",
]);

function toIsoDate(d: Date): string {
  // Local-date ISO (YYYY-MM-DD), avoids UTC shifting day boundaries.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isHoliday(d: Date): boolean {
  return SWEDISH_HOLIDAYS.has(toIsoDate(d));
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

function isJuly(d: Date): boolean {
  return d.getMonth() === 6; // 0-indexed: 6 = July
}

/**
 * Returns true if congestion tax applies on this date.
 * False for weekends, July, public holidays, and the weekday before a holiday.
 */
export function isChargingDay(date: Date): boolean {
  if (isWeekend(date)) return false;
  if (isJuly(date)) return false;
  if (isHoliday(date)) return false;
  // Day before a public holiday (only counts when the day-before is itself a weekday).
  const next = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  if (isHoliday(next)) return false;
  return true;
}
