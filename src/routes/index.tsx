import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  MapPin,
  Sparkles,
  Receipt,
  Route as RouteIcon,
  Zap,
  Fuel,
} from "lucide-react";
import { LegsEditor } from "@/components/LegsEditor";
import { TripMap } from "@/components/TripMap";
import { CarComparePanel } from "@/components/CarComparePanel";
import { CostSummary } from "@/components/CostSummary";
import { DepartureTimePicker } from "@/components/DepartureTimePicker";
import { useCompareVehicles } from "@/hooks/useCompareVehicles";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getDirections } from "@/server/ors";
import { detectCrossings } from "@/lib/congestion";
import type { Leg } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TripCost — Calculator" },
      {
        name: "description",
        content:
          "Plan a trip in Sweden. Get an instant SEK estimate for fuel, charging and congestion tax — for one car or compare two.",
      },
      { property: "og:title", content: "TripCost — Calculator" },
      {
        property: "og:description",
        content: "Fuel, charging & congestion tax in one trip estimate.",
      },
    ],
  }),
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
  const { carA, carB, setCarA, setCarB, compareEnabled, setCompareEnabled } =
    useCompareVehicles();

  const [departureMode, setDepartureMode] = useLocalStorage<"now" | "custom">(
    "tripcost.departureMode.v1",
    "now",
  );
  const [customDeparture, setCustomDeparture] = useState<Date | null>(null);
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
  const addLeg = useCallback(() => setLegs((prev) => [...prev, makeLeg()]), []);
  const removeLeg = useCallback(
    (id: string) => setLegs((prev) => prev.filter((l) => l.id !== id)),
    [],
  );

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

  const hasAnyRoute = legs.some((l) => l.route);

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/70">
        <div className="absolute inset-0 -z-10 bg-gradient-subtle" />
        <div
          className="absolute inset-0 -z-10 opacity-[0.07] dark:opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, var(--primary), transparent 40%), radial-gradient(circle at 80% 100%, var(--accent), transparent 40%)",
          }}
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 backdrop-blur px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Live Swedish congestion tax + ORS routing
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground text-balance max-w-3xl">
            Know what your trip really costs —{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              before you drive.
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl text-balance">
            Fuel, charging and trängselskatt in one estimate. Compare two cars on
            the same route in seconds.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/80 backdrop-blur border border-border px-3 py-1.5 text-muted-foreground">
              <Fuel className="h-3 w-3 text-primary" /> Petrol & diesel
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/80 backdrop-blur border border-border px-3 py-1.5 text-muted-foreground">
              <Zap className="h-3 w-3 text-accent" /> Electric & hybrid
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/80 backdrop-blur border border-border px-3 py-1.5 text-muted-foreground">
              <Receipt className="h-3 w-3 text-warning" /> Stockholm + Göteborg
            </span>
          </div>
        </div>
      </section>

      {/* Workspace */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-6 lg:py-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-6">
          {/* Left: inputs */}
          <div className="order-2 lg:order-1 space-y-5">
            <Card
              icon={<MapPin className="h-4 w-4" />}
              title="Trip"
              subtitle="Where are you going, and when?"
            >
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
                  <div className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
                    Departure time is in the past — showing charges as if the
                    trip happened at that time.
                  </div>
                )}
                <LegsEditor
                  legs={legs}
                  onUpdateLeg={updateLeg}
                  onAddLeg={addLeg}
                  onRemoveLeg={removeLeg}
                />
              </div>
            </Card>

            <Card
              icon={<Fuel className="h-4 w-4" />}
              title={compareEnabled ? "Vehicles" : "Vehicle"}
              subtitle={
                compareEnabled
                  ? "Compare two cars on the same trip."
                  : "What you drive determines the cost."
              }
            >
              <CarComparePanel
                carA={carA}
                setCarA={setCarA}
                carB={carB}
                setCarB={setCarB}
                compareEnabled={compareEnabled}
                setCompareEnabled={setCompareEnabled}
              />
            </Card>
          </div>

          {/* Right: map + summary */}
          <div className="order-1 lg:order-2 space-y-5 lg:sticky lg:top-20 lg:self-start">
            <Card
              icon={<RouteIcon className="h-4 w-4" />}
              title="Route"
              subtitle={hasAnyRoute ? undefined : "Add an origin and destination to see it."}
              padded={false}
            >
              <div className="h-[280px] sm:h-[360px] lg:h-[440px] w-full overflow-hidden rounded-b-2xl">
                <ClientOnly
                  fallback={
                    <div className="h-full w-full bg-muted animate-pulse" />
                  }
                >
                  <TripMap legs={legs} legCrossings={legCrossings} />
                </ClientOnly>
              </div>
            </Card>

            <CostSummary
              legs={legs}
              vehicle={carA}
              vehicleB={compareEnabled ? carB : null}
              legCrossings={legCrossings}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Card({
  title,
  subtitle,
  icon,
  children,
  padded = true,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <header className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-border/60">
        {icon && (
          <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </header>
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}
