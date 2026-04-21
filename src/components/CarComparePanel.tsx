import { Switch } from "@/components/ui/switch";
import { VehiclePanel } from "./VehiclePanel";
import type { VehicleConfig } from "@/lib/types";
import { GitCompare } from "lucide-react";

type Props = {
  carA: VehicleConfig;
  setCarA: (v: VehicleConfig) => void;
  carB: VehicleConfig | null;
  setCarB: (v: VehicleConfig) => void;
  compareEnabled: boolean;
  setCompareEnabled: (on: boolean) => void;
};

export function CarComparePanel({
  carA,
  setCarA,
  carB,
  setCarB,
  compareEnabled,
  setCompareEnabled,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        {compareEnabled && (
          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-primary mb-3">
            Car A
          </p>
        )}
        <VehiclePanel vehicle={carA} onChange={setCarA} />
      </div>

      <label
        htmlFor="compare-toggle"
        className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 cursor-pointer hover:border-primary/40 transition-colors"
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-accent/10 text-accent shrink-0">
            <GitCompare className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Compare two cars</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              See cost side-by-side on the same trip.
            </p>
          </div>
        </div>
        <Switch
          id="compare-toggle"
          checked={compareEnabled}
          onCheckedChange={setCompareEnabled}
        />
      </label>

      {compareEnabled && carB && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-accent mb-3">
            Car B
          </p>
          <VehiclePanel vehicle={carB} onChange={setCarB} />
        </div>
      )}
    </div>
  );
}
