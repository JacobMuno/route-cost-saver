import { describe, it, expect } from "vitest";
import {
  lookupAmount,
  isStockholmHighSeason,
  STOCKHOLM_INNER_SCHEDULE,
  STOCKHOLM_ESSINGELEDEN_SCHEDULE,
  GOTHENBURG_SCHEDULE,
  stockholmDailyCap,
} from "../congestion-zones";
import { applyDailyCaps, type Crossing } from "../congestion";
import { isChargingDay } from "../swedishHolidays";

function mkCrossing(partial: Partial<Crossing>): Crossing {
  return {
    city: "Stockholm",
    station: "Test",
    cpId: 0,
    tariff: "stockholm-inner",
    direction: "north",
    time: new Date(2026, 3, 14, 7, 15),
    charge: 0,
    point: { lat: 0, lng: 0 },
    ...partial,
  };
}

describe("schedules sanity", () => {
  it("schedules populated", () => {
    expect(STOCKHOLM_INNER_SCHEDULE.timeRanges.length).toBeGreaterThan(0);
    expect(STOCKHOLM_ESSINGELEDEN_SCHEDULE.timeRanges.length).toBeGreaterThan(0);
    expect(GOTHENBURG_SCHEDULE.timeRanges.length).toBeGreaterThan(0);
  });
});

describe("Stockholm rate lookup", () => {
  it("inner city, Tue 07:15 in April (high season) → 45 SEK", () => {
    const t = new Date(2026, 3, 14, 7, 15);
    expect(isStockholmHighSeason(t)).toBe(true);
    expect(lookupAmount("stockholm-inner", t)).toBe(45);
  });
  it("inner city, Tue 07:15 in January (low season) → 35 SEK", () => {
    const t = new Date(2026, 0, 13, 7, 15);
    expect(isStockholmHighSeason(t)).toBe(false);
    expect(lookupAmount("stockholm-inner", t)).toBe(35);
  });
  it("Essingeleden, Tue 07:15 in April → 40 SEK", () => {
    expect(lookupAmount("stockholm-essingeleden", new Date(2026, 3, 14, 7, 15))).toBe(40);
  });
  it("Saturday 07:15 → not charging day", () => {
    expect(isChargingDay(new Date(2026, 3, 18, 7, 15), "Stockholm")).toBe(false);
  });
  it("1 January (Stockholm) → not charging day", () => {
    expect(isChargingDay(new Date(2026, 0, 1, 7, 15), "Stockholm")).toBe(false);
  });
  it("6 July 2026 (Mon, 1st-5 weekday of July) → charging day", () => {
    expect(isChargingDay(new Date(2026, 6, 6, 7, 15), "Stockholm")).toBe(true);
  });
  it("20 July 2026 → not charging day for Stockholm", () => {
    expect(isChargingDay(new Date(2026, 6, 20, 7, 15), "Stockholm")).toBe(false);
  });
});

describe("Gothenburg rate lookup", () => {
  it("Tue 07:30 → 22 SEK", () => {
    expect(lookupAmount("gothenburg", new Date(2026, 3, 14, 7, 30))).toBe(22);
  });
  it("Tue 07:30 in July → not charging day", () => {
    expect(isChargingDay(new Date(2026, 6, 14, 7, 30), "Gothenburg")).toBe(false);
  });
});

describe("Combining rules", () => {
  it("Gothenburg multi-passage 16+22 within 60 min → 22 total", () => {
    const xs: Crossing[] = [
      mkCrossing({ city: "Gothenburg", tariff: "gothenburg", station: "A",
        time: new Date(2026, 3, 14, 15, 10), charge: 16 }),
      mkCrossing({ city: "Gothenburg", tariff: "gothenburg", station: "B",
        time: new Date(2026, 3, 14, 15, 40), charge: 22 }),
    ];
    expect(applyDailyCaps(xs).totalsByCity.Gothenburg).toBe(22);
  });
  it("Stockholm cap (high) 6×45 → 135", () => {
    const xs = Array.from({ length: 6 }, (_, i) =>
      mkCrossing({ station: `I${i}`, time: new Date(2026, 3, 14, 7, 15 + i), charge: 45 }));
    expect(stockholmDailyCap(xs[0].time)).toBe(135);
    expect(applyDailyCaps(xs).totalsByCity.Stockholm).toBe(135);
  });
  it("Stockholm cap (low) 6×35 → 105", () => {
    const xs = Array.from({ length: 6 }, (_, i) =>
      mkCrossing({ station: `I${i}`, time: new Date(2026, 0, 13, 7, 15 + i), charge: 35 }));
    expect(stockholmDailyCap(xs[0].time)).toBe(105);
    expect(applyDailyCaps(xs).totalsByCity.Stockholm).toBe(105);
  });
  it("Essingeleden Fredhäll + Kristineberg same direction → one charge", () => {
    const t = new Date(2026, 3, 14, 7, 15);
    const xs: Crossing[] = [
      mkCrossing({ station: "Tpl Fredhäll/Drottningsholmsvägen",
        tariff: "stockholm-essingeleden", direction: "north", time: t, charge: 40 }),
      mkCrossing({ station: "Tpl Kristineberg",
        tariff: "stockholm-essingeleden", direction: "north", time: new Date(t.getTime() + 60_000), charge: 40 }),
    ];
    expect(applyDailyCaps(xs).totalsByCity.Stockholm).toBe(40);
  });
});
