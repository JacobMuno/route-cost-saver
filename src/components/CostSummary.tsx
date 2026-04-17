import type { Leg, VehicleConfig } from "@/lib/types";
import { formatDuration, formatSEK, legEnergyCostSEK, tripTotals } from "@/lib/cost";
import { Route } from "lucide-react";

type Props = {
  legs: Leg[];
  vehicle: VehicleConfig;
};

export function CostSummary({ legs, vehicle }: Props) {
  const totals = tripTotals(legs, vehicle);
  const isElectric = vehicle.type === "electric";

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
              {formatSEK(totals.energyCost)}
            </p>
            <p className="text-xs text-primary-foreground/80 mt-1">
              {totals.distanceKm.toFixed(1)} km · {formatDuration(totals.durationMin)}
            </p>
          </div>

          <div className="space-y-2">
            {legs.map((leg, idx) => {
              if (!leg.route) return null;
              const cost = legEnergyCostSEK(leg.route.distanceKm, vehicle);
              return (
                <div
                  key={leg.id}
                  className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-foreground font-medium">Leg {idx + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      {leg.route.distanceKm.toFixed(1)} km
                    </p>
                  </div>
                  <p className="text-foreground font-semibold tabular-nums">
                    {formatSEK(cost)}
                  </p>
                </div>
              );
            })}
          </div>

          {(!vehicle.consumption || !vehicle.pricePerUnit) && (
            <p className="mt-3 text-xs text-muted-foreground">
              Enter your consumption and {isElectric ? "electricity" : "fuel"} price
              to see costs.
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
