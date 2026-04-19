import { Switch } from "@/components/ui/switch";
import { VehiclePanel } from "./VehiclePanel";
import type { VehicleConfig } from "@/lib/types";

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
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {compareEnabled ? "Car A" : "Your vehicle"}
          </h2>
        </div>
        <VehiclePanel vehicle={carA} onChange={setCarA} />
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card/60 px-5 py-3">
        <div>
          <label
            htmlFor="compare-toggle"
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            Compare with a second car
          </label>
          <p className="text-xs text-muted-foreground mt-0.5">
            See cost side-by-side for two vehicles on the same trip.
          </p>
        </div>
        <Switch
          id="compare-toggle"
          checked={compareEnabled}
          onCheckedChange={setCompareEnabled}
        />
      </div>

      {compareEnabled && carB && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Car B
            </h2>
          </div>
          <VehiclePanel vehicle={carB} onChange={setCarB} />
        </div>
      )}
    </div>
  );
}
