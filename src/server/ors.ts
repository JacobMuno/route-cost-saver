import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ORS_BASE = "https://api.openrouteservice.org";

function getKey() {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new Error("ORS_API_KEY not configured");
  return key;
}

export const geocodeSearch = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string }) => z.object({ text: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const key = getKey();
    const url = new URL(`${ORS_BASE}/geocode/autocomplete`);
    url.searchParams.set("api_key", key);
    url.searchParams.set("text", data.text);
    url.searchParams.set("size", "6");
    // Bias towards Sweden but allow worldwide.
    url.searchParams.set("boundary.country", "SE");

    const res = await fetch(url.toString());
    if (!res.ok) {
      return { suggestions: [], error: `Geocoding failed (${res.status})` };
    }
    const json = (await res.json()) as {
      features?: Array<{
        geometry: { coordinates: [number, number] };
        properties: { label: string };
      }>;
    };
    const suggestions = (json.features ?? []).map((f) => ({
      label: f.properties.label,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    }));
    return { suggestions, error: null as string | null };
  });

const PointSchema = z.object({ lat: z.number(), lng: z.number() });

export const getDirections = createServerFn({ method: "POST" })
  .inputValidator((input: { points: Array<{ lat: number; lng: number }> }) =>
    z.object({ points: z.array(PointSchema).min(2).max(20) }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = getKey();
    const coordinates = data.points.map((p) => [p.lng, p.lat]);
    const res = await fetch(`${ORS_BASE}/v2/directions/driving-car/geojson`, {
      method: "POST",
      headers: {
        Authorization: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coordinates }),
    });
    if (!res.ok) {
      return { route: null, error: `Routing failed (${res.status})` };
    }
    const json = (await res.json()) as {
      features: Array<{
        geometry: { coordinates: [number, number][] };
        properties: { summary: { distance: number; duration: number } };
      }>;
    };
    const feature = json.features?.[0];
    if (!feature) return { route: null, error: "No route returned" };
    const coords = feature.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
    return {
      route: {
        coordinates: coords,
        distanceKm: feature.properties.summary.distance / 1000,
        durationMin: feature.properties.summary.duration / 60,
      },
      error: null as string | null,
    };
  });
