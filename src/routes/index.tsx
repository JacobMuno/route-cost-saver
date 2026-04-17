import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Fuel, AlertTriangle } from "lucide-react";
import { LegsEditor } from "@/components/LegsEditor";
import { TripMap } from "@/components/TripMap";
import { VehiclePanel } from "@/components/VehiclePanel";
import { CostSummary } from "@/components/CostSummary";
import { DepartureTimePicker } from "@/components/DepartureTimePicker";
import { useVehicleByType } from "@/hooks/useVehicleByType";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getDirections } from "@/server/ors";
import { detectCrossings } from "@/lib/congestion";
import type { Leg } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: Index,
});

function emptyLoc() {
  return { query: "", point: null, label: null };
}

function makeLeg(): Leg {
  return {
    id: crypto.randomUUID(),
    origin: emptyLoc(),
    destination: emptyLoc(),
    waypoints: [],
    route: null,
    status: "idle",
  };
}

function Index() {
  const [legs, setLegs] = useState<Leg[]>(() => [makeLeg()]);
  const [vehicle, setVehicle] = useVehicleByType();

  // Departure mode persists, but the chosen custom time does NOT survive a
  // fresh app open — we always default back to "now" on load to avoid
  // accidentally costing trips in the past.
  const [departureMode, setDepartureMode] = useLocalStorage<"now" | "custom">(
    "tripcost.departureMode.v1",
    "now",
  );
  const [customDeparture, setCustomDeparture] = useState<Date | null>(null);
  // Force "now" on initial app load even if last session ended in "custom".
  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      setDepartureMode("now");
      setCustomDeparture(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateLeg = useCallback((id: string, updater: (l: Leg) => Leg) => {
    setLegs((prev) => prev.map((l) => (l.id === id ? updater(l) : l)));
  }, []);

  const addLeg = useCallback(() => {
    setLegs((prev) => [...prev, makeLeg()]);
  }, []);

  const removeLeg = useCallback((id: string) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // Fetch routes whenever leg points are complete.
  const fetchedKeyRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    legs.forEach((leg) => {
      const points = [leg.origin, ...leg.waypoints, leg.destination]
        .map((s) => s.point)
        .filter((p): p is { lat: number; lng: number } => p !== null);
      if (points.length < 2) return;
      const key = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");
      if (fetchedKeyRef.current.get(leg.id) === key) return;
      fetchedKeyRef.current.set(leg.id, key);

      updateLeg(leg.id, (l) => ({ ...l, status: "loading", error: undefined }));
      getDirections({ data: { points } })
        .then((res) => {
          if (res.error || !res.route) {
            updateLeg(leg.id, (l) => ({
              ...l,
              status: "error",
              error: res.error ?? "Could not calculate route.",
              route: null,
            }));
            return;
          }
          updateLeg(leg.id, (l) => ({
            ...l,
            status: "ready",
            route: res.route,
          }));
        })
        .catch(() => {
          updateLeg(leg.id, (l) => ({
            ...l,
            status: "error",
            error: "Could not calculate route. Check addresses and try again.",
            route: null,
          }));
        });
    });
  }, [legs, updateLeg]);

  // Tick "now" every minute so the displayed crossing times stay current.
  const [nowTick, setNowTick] = useState(() => new Date());
  useEffect(() => {
    if (departureMode !== "now") return;
    const id = setInterval(() => setNowTick(new Date()), 60_000);
    return () => clearInterval(id);
  }, [departureMode]);

  const departure = useMemo(() => {
    return departureMode === "custom" && customDeparture ? customDeparture : nowTick;
  }, [departureMode, customDeparture, nowTick]);

  const departureInPast =
    departureMode === "custom" &&
    customDeparture !== null &&
    customDeparture.getTime() < Date.now() - 60_000;

  const legCrossings = useMemo(() => {
    return legs.map((leg) => {
      if (!leg.route) return [];
      return detectCrossings(leg.route.coordinates, departure, leg.route.durationMin);
    });
  }, [legs, departure]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-hero)" }}
          >
            <Fuel className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">Trip Cost Calculator</h1>
            <p className="text-xs text-muted-foreground">
              Fuel & charging costs in Sweden
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 lg:py-6">
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Map first on mobile, right on desktop */}
          <div className="order-1 lg:order-2 h-[300px] sm:h-[400px] lg:h-[calc(100vh-8rem)] lg:sticky lg:top-4">
            <ClientOnly fallback={<div className="h-full w-full rounded-2xl bg-muted animate-pulse" />}>
              <TripMap legs={legs} legCrossings={legCrossings} />
            </ClientOnly>
          </div>

          <div className="order-2 lg:order-1 space-y-4">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Your trip
              </h2>
              <div className="space-y-3">
                <DepartureTimePicker
                  mode={departureMode}
                  customTime={customDeparture}
                  onChange={(m, t) => {
                    setDepartureMode(m);
                    setCustomDeparture(t);
                  }}
                />
                {departureInPast && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Departure time is in the past — showing charges as if the trip
                    happened at that time.
                  </div>
                )}
                <LegsEditor
                  legs={legs}
                  onUpdateLeg={updateLeg}
                  onAddLeg={addLeg}
                  onRemoveLeg={removeLeg}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Your vehicle
              </h2>
              <VehiclePanel vehicle={vehicle} onChange={setVehicle} />
            </section>

            <CostSummary legs={legs} vehicle={vehicle} legCrossings={legCrossings} />
          </div>
        </div>
      </main>
    </div>
  );
}
