import type { Leg, VehicleConfig } from "@/lib/types";
import { formatDuration, formatSEK, legEnergyCostSEK, tripTotals } from "@/lib/cost";
import { applyDailyCaps, type Crossing } from "@/lib/congestion";
import { Route, Receipt } from "lucide-react";

type Props = {
  legs: Leg[];
  vehicle: VehicleConfig;
  /** Crossings per leg, in the same order as `legs`. */
  legCrossings: Crossing[][];
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

export function CostSummary({ legs, vehicle, legCrossings }: Props) {
  const totals = tripTotals(legs, vehicle);
  const isElectric = vehicle.type === "electric";
  const allCrossings = legCrossings.flat();
  // Use the very first leg's first coordinate as the trip start, and the last
  // leg's last coordinate as the trip end, for the Gothenburg Backa exception.
  const firstRouteCoords = legs.find((l) => l.route)?.route?.coordinates ?? [];
  const lastWithRoute = [...legs].reverse().find((l) => l.route)?.route?.coordinates ?? [];
  const start = firstRouteCoords[0] ?? null;
  const end = lastWithRoute[lastWithRoute.length - 1] ?? null;
  const congestion = applyDailyCaps(allCrossings, { start, end });
  const grandTotal = totals.energyCost + congestion.total;

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
          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: "var(--gradient-hero)" }}
          >
            <p className="text-xs uppercase tracking-wider text-primary-foreground/80 font-medium">
              Estimated total
            </p>
            <p className="text-4xl font-bold text-primary-foreground mt-1">
              {formatSEK(grandTotal)}
            </p>
            <p className="text-xs text-primary-foreground/80 mt-1">
              {totals.distanceKm.toFixed(1)} km · {formatDuration(totals.durationMin)}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {isElectric ? "Charging" : "Fuel"}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatSEK(totals.energyCost)}
              </span>
            </div>
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
              const energy = legEnergyCostSEK(leg.route.distanceKm, vehicle);
              const crossings = legCrossings[idx] ?? [];
              const congCost = crossings.reduce((s, c) => s + c.charge, 0);
              return (
                <div key={leg.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-medium">
                      Leg {idx + 1} — {leg.route.distanceKm.toFixed(1)} km
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatSEK(energy + congCost)}
                    </span>
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
                            {c.city} · {c.controlPoint} · {c.direction} ·{" "}
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

          {(!vehicle.consumption || !vehicle.pricePerUnit) && (
            <p className="mt-4 text-xs text-muted-foreground">
              Enter your consumption and {isElectric ? "electricity" : "fuel"} price
              to see fuel costs.
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
