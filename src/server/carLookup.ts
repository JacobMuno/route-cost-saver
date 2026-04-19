import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * API Ninjas Cars API — uses the free `/v1/cars` endpoint.
 *
 * The newer `/v1/carmakes`, `/v1/carmodels`, and `/v1/cartrims` endpoints
 * require a paid plan, so we cannot offer cascading dropdowns. Instead the
 * UI takes free-text Make + Model (with optional Year) and we filter the
 * returned rows here. MPG values are converted to L/100 km.
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
  combinationMpg: number | null;
  /** Computed: combined L / 100 km for fuel cars (null for electric / missing). */
  consumptionLper100km: number | null;
  transmission: string | null;
  drive: string | null;
};

function mpgToLPer100km(mpg: number): number {
  // US gallon: 235.214583 / mpg = L/100km.
  return 235.214583 / mpg;
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
    url.searchParams.set("limit", "20");

    const res = await fetch(url.toString(), {
      headers: { "X-Api-Key": key },
    });

    if (!res.ok) {
      return {
        matches: [] as CarMatch[],
        error: `Car lookup failed (${res.status}). Try a different make or model.`,
      };
    }

    const json = (await res.json()) as Array<{
      make: string;
      model: string;
      year: number;
      fuel_type?: string;
      cylinders?: number;
      combination_mpg?: number;
      transmission?: string;
      drive?: string;
    }>;

    const matches: CarMatch[] = (Array.isArray(json) ? json : []).map((r) => ({
      make: r.make,
      model: r.model,
      year: r.year,
      fuelType: r.fuel_type ?? "gas",
      cylinders: r.cylinders ?? null,
      combinationMpg: r.combination_mpg ?? null,
      consumptionLper100km:
        r.combination_mpg && r.combination_mpg > 0
          ? Number(mpgToLPer100km(r.combination_mpg).toFixed(2))
          : null,
      transmission: r.transmission ?? null,
      drive: r.drive ?? null,
    }));

    return { matches, error: null as string | null };
  });
