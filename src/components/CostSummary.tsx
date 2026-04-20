import type { Leg, VehicleConfig } from "@/lib/types";
import { formatDuration, formatSEK, legEnergyCostSEK, tripTotals } from "@/lib/cost";
import { applyDailyCaps, type Crossing } from "@/lib/congestion";
import { Route, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  legs: Leg[];
  vehicle: VehicleConfig;
  vehicleB?: VehicleConfig | null;
  /** Crossings per leg, in the same order as `legs`. */
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
        "rounded-xl p-4",
        primary ? "" : "border border-border bg-card",
        !configured && "opacity-60",
      )}
      style={primary ? { background: "var(--gradient-hero)" } : undefined}
    >
      <p
        className={cn(
          "text-xs uppercase tracking-wider font-medium",
          primary ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {label} · {carName}
      </p>
      {configured ? (
        <>
          <p
            className={cn(
              "text-3xl font-bold mt-1",
              primary ? "text-primary-foreground" : "text-foreground",
            )}
          >
            {formatSEK(grand)}
          </p>
          <div
            className={cn(
              "mt-2 space-y-0.5 text-xs",
              primary ? "text-primary-foreground/80" : "text-muted-foreground",
            )}
          >
            <div className="flex justify-between">
              <span>{isElectric ? "Charging" : "Fuel"}</span>
              <span className="tabular-nums">{formatSEK(energyCost)}</span>
            </div>
            <div className="flex justify-between">
              <span>Congestion</span>
              <span className="tabular-nums">{formatSEK(congestionTotal)}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground mt-2">
          Configure this car to see comparison.
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

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 mb-4">
        <Route className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Trip summary
        </h2>
      </div>

      {legs.some((l) => l.route) ? (
        <>
          {compareMode ? (
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
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
            <div
              className="rounded-xl p-4 mb-4"
              style={{ background: "var(--gradient-hero)" }}
            >
              <p className="text-xs uppercase tracking-wider text-primary-foreground/80 font-medium">
                Estimated total
              </p>
              <p className="text-4xl font-bold text-primary-foreground mt-1">
                {formatSEK(totalsA.energyCost + congestion.total)}
              </p>
              <p className="text-xs text-primary-foreground/80 mt-1">
                {totalsA.distanceKm.toFixed(1)} km · {formatDuration(totalsA.durationMin)}
              </p>
            </div>
          )}

          {compareMode && aConfigured && bConfigured && (
            <div className="mb-4 rounded-xl border border-border bg-card/60 p-3 text-xs">
              <span className="text-muted-foreground">Difference:</span>{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatSEK(
                  Math.abs(
                    totalsA.energyCost - (totalsB?.energyCost ?? 0),
                  ),
                )}
              </span>{" "}
              <span className="text-muted-foreground">
                {totalsA.energyCost <= (totalsB?.energyCost ?? 0)
                  ? "saved with Car A"
                  : "saved with Car B"}{" "}
                (energy only — congestion tax is the same for both).
              </span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Distance</span>
              <span className="font-semibold tabular-nums text-foreground">
                {totalsA.distanceKm.toFixed(1)} km · {formatDuration(totalsA.durationMin)}
              </span>
            </div>
            {!compareMode && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isElectric ? "Charging" : "Fuel"}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatSEK(totalsA.energyCost)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Congestion tax</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatSEK(congestion.total)}
              </span>
            </div>
            {Object.entries(congestion.totalsByCity).map(([city, sum]) => (
              <div
                key={city}
                className="flex items-center justify-between text-xs pl-3 text-muted-foreground"
              >
                <span>· {city} (capped daily)</span>
                <span className="tabular-nums">{formatSEK(sum)}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-border space-y-3">
            {legs.map((leg, idx) => {
              if (!leg.route) return null;
              const energyA = legEnergyCostSEK(leg.route.distanceKm, vehicle);
              const energyB = vehicleB
                ? legEnergyCostSEK(leg.route.distanceKm, vehicleB)
                : null;
              const crossings = legCrossings[idx] ?? [];
              const congCost = crossings.reduce((s, c) => s + c.charge, 0);
              return (
                <div key={leg.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-medium">
                      Leg {idx + 1} — {leg.route.distanceKm.toFixed(1)} km
                    </span>
                    {compareMode ? (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        A: {formatSEK(energyA + congCost)} · B:{" "}
                        {formatSEK((energyB ?? 0) + congCost)}
                      </span>
                    ) : (
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatSEK(energyA + congCost)}
                      </span>
                    )}
                  </div>
                  {crossings.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {crossings.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between text-xs text-muted-foreground pl-3"
                        >
                          <span className="flex items-center gap-1.5">
                            <Receipt className="h-3 w-3" />
                            {c.city} · {c.station} · {c.direction} ·{" "}
                            {formatTime(c.time)}
                          </span>
                          <span className="tabular-nums">{formatSEK(c.charge)}</span>
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
              Car A to see fuel costs.
            </p>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Enter an origin and destination to see your trip cost.
          </p>
        </div>
      )}
    </div>
  );
}
