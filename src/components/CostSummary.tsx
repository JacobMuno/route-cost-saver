import type { Leg, VehicleConfig } from "@/lib/types";
import { formatDuration, formatSEK, legEnergyCostSEK, tripTotals } from "@/lib/cost";
import { applyDailyCaps, type Crossing } from "@/lib/congestion";
import { Receipt, TrendingDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  legs: Leg[];
  vehicle: VehicleConfig;
  vehicleB?: VehicleConfig | null;
  legCrossings: Crossing[][];
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

function isConfigured(v: VehicleConfig | null | undefined): v is VehicleConfig {
  return !!v && v.consumption > 0 && v.pricePerUnit > 0;
}

function CarTotalCard({
  label,
  vehicle,
  energyCost,
  congestionTotal,
  configured,
  primary,
}: {
  label: string;
  vehicle: VehicleConfig | null;
  energyCost: number;
  congestionTotal: number;
  configured: boolean;
  primary: boolean;
}) {
  if (!vehicle) return null;
  const grand = energyCost + congestionTotal;
  const carName = vehicle.name?.trim() || label;
  const isElectric = vehicle.type === "electric";
  return (
    <div
      className={cn(
        "relative rounded-2xl p-5 overflow-hidden",
        primary
          ? "bg-gradient-hero text-primary-foreground shadow-glow"
          : "bg-surface border border-border shadow-card",
        !configured && "opacity-60",
      )}
    >
      <p
        className={cn(
          "text-[10px] uppercase tracking-[0.16em] font-semibold",
          primary ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-medium mt-0.5 truncate",
          primary ? "text-primary-foreground/90" : "text-foreground",
        )}
        title={carName}
      >
        {carName}
      </p>
      {configured ? (
        <>
          <p
            className={cn(
              "text-3xl font-bold tabular-nums tracking-tight mt-2",
              primary ? "text-primary-foreground" : "text-foreground",
            )}
          >
            {formatSEK(grand)}
          </p>
          <div
            className={cn(
              "mt-3 space-y-1 text-xs",
              primary ? "text-primary-foreground/80" : "text-muted-foreground",
            )}
          >
            <div className="flex justify-between">
              <span>{isElectric ? "Charging" : "Fuel"}</span>
              <span className="tabular-nums font-medium">{formatSEK(energyCost)}</span>
            </div>
            <div className="flex justify-between">
              <span>Congestion</span>
              <span className="tabular-nums font-medium">{formatSEK(congestionTotal)}</span>
            </div>
          </div>
        </>
      ) : (
        <p
          className={cn(
            "text-xs mt-3",
            primary ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          Configure this car to compare.
        </p>
      )}
    </div>
  );
}

export function CostSummary({ legs, vehicle, vehicleB, legCrossings }: Props) {
  const totalsA = tripTotals(legs, vehicle);
  const totalsB = vehicleB ? tripTotals(legs, vehicleB) : null;
  const allCrossings = legCrossings.flat();
  const firstRouteCoords = legs.find((l) => l.route)?.route?.coordinates ?? [];
  const lastWithRoute = [...legs].reverse().find((l) => l.route)?.route?.coordinates ?? [];
  const start = firstRouteCoords[0] ?? null;
  const end = lastWithRoute[lastWithRoute.length - 1] ?? null;
  const congestion = applyDailyCaps(allCrossings, { start, end });
  const isElectric = vehicle.type === "electric";

  const compareMode = !!vehicleB;
  const aConfigured = isConfigured(vehicle);
  const bConfigured = isConfigured(vehicleB);

  const hasRoutes = legs.some((l) => l.route);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <header className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-border/60">
        <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
          <Receipt className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Trip summary
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Estimated total — energy + congestion tax.
          </p>
        </div>
      </header>

      <div className="p-5">
        {hasRoutes ? (
          <>
            {compareMode ? (
              <div className="grid gap-3 sm:grid-cols-2 mb-5">
                <CarTotalCard
                  label="Car A"
                  vehicle={vehicle}
                  energyCost={totalsA.energyCost}
                  congestionTotal={congestion.total}
                  configured={aConfigured}
                  primary
                />
                <CarTotalCard
                  label="Car B"
                  vehicle={vehicleB ?? null}
                  energyCost={totalsB?.energyCost ?? 0}
                  congestionTotal={congestion.total}
                  configured={bConfigured}
                  primary={false}
                />
              </div>
            ) : (
              <div className="relative rounded-2xl bg-gradient-hero p-5 mb-5 shadow-glow overflow-hidden">
                <p className="text-[10px] uppercase tracking-[0.16em] text-primary-foreground/80 font-semibold">
                  Estimated total
                </p>
                <p className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight text-primary-foreground mt-1">
                  {formatSEK(totalsA.energyCost + congestion.total)}
                </p>
                <p className="text-xs text-primary-foreground/85 mt-2">
                  {totalsA.distanceKm.toFixed(1)} km ·{" "}
                  {formatDuration(totalsA.durationMin)}
                </p>
              </div>
            )}

            {compareMode && aConfigured && bConfigured && (
              <div className="mb-5 rounded-xl border border-success/30 bg-success/5 p-3 text-xs flex items-start gap-2">
                <TrendingDown className="h-3.5 w-3.5 mt-0.5 text-success shrink-0" />
                <p className="text-foreground">
                  <span className="font-semibold tabular-nums">
                    {formatSEK(
                      Math.abs(totalsA.energyCost - (totalsB?.energyCost ?? 0)),
                    )}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    saved with{" "}
                    {totalsA.energyCost <= (totalsB?.energyCost ?? 0)
                      ? "Car A"
                      : "Car B"}{" "}
                    — energy only. Congestion tax is identical.
                  </span>
                </p>
              </div>
            )}

            <dl className="space-y-2.5">
              <Row label="Distance" value={`${totalsA.distanceKm.toFixed(1)} km · ${formatDuration(totalsA.durationMin)}`} />
              {!compareMode && (
                <Row
                  label={isElectric ? "Charging" : "Fuel"}
                  value={formatSEK(totalsA.energyCost)}
                />
              )}
              <Row label="Congestion tax" value={formatSEK(congestion.total)} />
              {Object.entries(congestion.totalsByCity).map(([city, sum]) => (
                <div
                  key={city}
                  className="flex items-center justify-between text-xs pl-4 text-muted-foreground"
                >
                  <span>· {city} (capped daily)</span>
                  <span className="tabular-nums">{formatSEK(sum)}</span>
                </div>
              ))}
            </dl>

            <div className="mt-5 pt-4 border-t border-border/60 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Per leg
              </p>
              {legs.map((leg, idx) => {
                if (!leg.route) return null;
                const energyA = legEnergyCostSEK(leg.route.distanceKm, vehicle);
                const energyB = vehicleB
                  ? legEnergyCostSEK(leg.route.distanceKm, vehicleB)
                  : null;
                const crossings = legCrossings[idx] ?? [];
                const congCost = crossings.reduce((s, c) => s + c.charge, 0);
                return (
                  <div key={leg.id} className="rounded-xl bg-muted/40 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium">
                        Leg {idx + 1} · {leg.route.distanceKm.toFixed(1)} km
                      </span>
                      {compareMode ? (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          A {formatSEK(energyA + congCost)} · B{" "}
                          {formatSEK((energyB ?? 0) + congCost)}
                        </span>
                      ) : (
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatSEK(energyA + congCost)}
                        </span>
                      )}
                    </div>
                    {crossings.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {crossings.map((c, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between text-xs text-muted-foreground"
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <Receipt className="h-3 w-3 shrink-0 text-warning" />
                              <span className="truncate">
                                {c.city} · {c.station} ·{" "}
                                <ArrowRight className="inline h-2.5 w-2.5" /> {c.direction} ·{" "}
                                {formatTime(c.time)}
                              </span>
                            </span>
                            <span className="tabular-nums shrink-0 ml-2">
                              {formatSEK(c.charge)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            {!aConfigured && (
              <p className="mt-4 text-xs text-muted-foreground">
                Enter consumption and {isElectric ? "electricity" : "fuel"} price for
                Car A to see the energy cost.
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-10">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-muted/60 grid place-items-center text-muted-foreground mb-3">
              <Receipt className="h-5 w-5" />
            </div>
            <p className="text-sm text-foreground font-medium">No trip yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Enter an origin and destination to see your trip cost.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
