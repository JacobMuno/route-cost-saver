import { Plus, Trash2, Loader2 } from "lucide-react";
import { AddressInput } from "./AddressInput";
import type { Leg } from "@/lib/types";
import { formatDuration } from "@/lib/cost";

const ROUTE_COLORS = [
  "oklch(0.78 0.18 145)",
  "oklch(0.72 0.18 220)",
  "oklch(0.78 0.16 60)",
  "oklch(0.7 0.2 320)",
];

type Props = {
  legs: Leg[];
  onUpdateLeg: (id: string, updater: (l: Leg) => Leg) => void;
  onAddLeg: () => void;
  onRemoveLeg: (id: string) => void;
};

export function LegsEditor({ legs, onUpdateLeg, onAddLeg, onRemoveLeg }: Props) {
  return (
    <div className="space-y-4">
      {legs.map((leg, idx) => {
        const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
        return (
          <div key={leg.id} className="rounded-2xl border border-border bg-card/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Leg {idx + 1}
                </span>
                {leg.status === "loading" && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-3">
                {leg.route && (
                  <span className="text-xs text-muted-foreground">
                    {leg.route.distanceKm.toFixed(1)} km · {formatDuration(leg.route.durationMin)}
                  </span>
                )}
                {legs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveLeg(leg.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove leg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <AddressInput
              value={leg.origin}
              onChange={(v) => onUpdateLeg(leg.id, (l) => ({ ...l, origin: v }))}
              placeholder="From"
              iconColor={color}
            />
            {leg.waypoints.map((wp, wi) => (
              <AddressInput
                key={wi}
                value={wp}
                onChange={(v) =>
                  onUpdateLeg(leg.id, (l) => {
                    const wps = [...l.waypoints];
                    wps[wi] = v;
                    return { ...l, waypoints: wps };
                  })
                }
                onRemove={() =>
                  onUpdateLeg(leg.id, (l) => ({
                    ...l,
                    waypoints: l.waypoints.filter((_, i) => i !== wi),
                  }))
                }
                placeholder={`Waypoint ${wi + 1}`}
              />
            ))}
            <AddressInput
              value={leg.destination}
              onChange={(v) => onUpdateLeg(leg.id, (l) => ({ ...l, destination: v }))}
              placeholder="To"
              iconColor={color}
            />

            <button
              type="button"
              onClick={() =>
                onUpdateLeg(leg.id, (l) => ({
                  ...l,
                  waypoints: [...l.waypoints, { query: "", point: null, label: null }],
                }))
              }
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add waypoint
            </button>

            {leg.error && (
              <p className="text-xs text-destructive">{leg.error}</p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddLeg}
        className="w-full rounded-2xl border border-dashed border-border bg-card/20 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" /> Add another leg
      </button>
    </div>
  );
}
