import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * API Ninjas Cars API — uses the free `/v1/cars` endpoint.
 *
 * The free tier does NOT include fuel-economy fields (`city_mpg`,
 * `highway_mpg`, `combination_mpg` are gated behind a paid plan and come back
 * as the literal string "this field is for premium subscribers only"). The
 * `limit` query param is also paid-only.
 *
 * What we DO get for free per row: make, model, year, fuel_type, cylinders,
 * displacement (litres), drive, transmission. We use those to produce a
 * rough L/100 km estimate via a simple heuristic, clearly labelled as an
 * estimate in the UI so the user can adjust.
 */

const InputSchema = z.object({
  make: z.string().min(1).max(60),
  model: z.string().min(1).max(60),
  year: z.number().int().min(1950).max(2100).optional(),
});

export type CarMatch = {
  make: string;
  model: string;
  year: number;
  fuelType: string; // "gas", "diesel", "electricity"
  cylinders: number | null;
  displacementL: number | null;
  drive: string | null;
  transmission: string | null;
  /** Heuristic L/100km estimate (null when we can't even guess). */
  consumptionLper100km: number | null;
};

/**
 * Very rough fuel-economy heuristic from engine spec when MPG is paywalled.
 * Calibrated against typical EPA combined figures: a 2.0 L 4-cyl gas car
 * lands around 8 L/100km, a 3.0 L 6-cyl gas around 11, a 5.0 L V8 around 14.
 * Diesel multiplier 0.85 reflects diesel's typical ~15% advantage. AWD adds
 * ~6% per common EPA comparisons.
 */
function estimateLper100km(
  fuelType: string,
  displacementL: number | null,
  cylinders: number | null,
  drive: string | null,
): number | null {
  const dl = displacementL ?? (cylinders ? cylinders * 0.5 : null);
  if (!dl || dl <= 0) return null;
  // base = 5.5 + 1.8 * displacement_litres
  let lp100 = 5.5 + 1.8 * dl;
  if (fuelType === "diesel") lp100 *= 0.85;
  if (drive && /awd|4wd|4x4/i.test(drive)) lp100 *= 1.06;
  return Number(lp100.toFixed(1));
}

export const lookupCar = createServerFn({ method: "POST" })
  .inputValidator((input: { make: string; model: string; year?: number }) =>
    InputSchema.parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.API_NINJAS_KEY;
    if (!key) {
      return { matches: [] as CarMatch[], error: "Car lookup is not configured." };
    }

    const url = new URL("https://api.api-ninjas.com/v1/cars");
    url.searchParams.set("make", data.make.trim().toLowerCase());
    url.searchParams.set("model", data.model.trim().toLowerCase());
    if (data.year) url.searchParams.set("year", String(data.year));
    // Note: `limit` is a premium-only param; including it returns HTTP 400.

    const res = await fetch(url.toString(), {
      headers: { "X-Api-Key": key },
    });

    if (!res.ok) {
      let detail = "";
      try {
        const j = (await res.json()) as { error?: string };
        if (j?.error) detail = ` ${j.error}`;
      } catch {
        /* ignore */
      }
      return {
        matches: [] as CarMatch[],
        error: `Car lookup failed (${res.status}).${detail} Try a different make or model.`,
      };
    }

    const json = (await res.json()) as Array<{
      make: string;
      model: string;
      year: number;
      fuel_type?: string;
      cylinders?: number;
      displacement?: number;
      transmission?: string;
      drive?: string;
    }>;

    const rows = Array.isArray(json) ? json : [];

    // Deduplicate near-identical rows (same year + same engine spec).
    const seen = new Set<string>();
    const matches: CarMatch[] = [];
    for (const r of rows) {
      const dl = typeof r.displacement === "number" ? r.displacement : null;
      const cyl = typeof r.cylinders === "number" ? r.cylinders : null;
      const ft = r.fuel_type ?? "gas";
      const drv = r.drive ?? null;
      const dedupKey = `${r.year}|${dl}|${cyl}|${ft}|${drv}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      matches.push({
        make: r.make,
        model: r.model,
        year: r.year,
        fuelType: ft,
        cylinders: cyl,
        displacementL: dl,
        drive: drv,
        transmission: r.transmission ?? null,
        consumptionLper100km: estimateLper100km(ft, dl, cyl, drv),
      });
    }
    // Newest year first.
    matches.sort((a, b) => b.year - a.year);

    return { matches: matches.slice(0, 20), error: null as string | null };
  });
