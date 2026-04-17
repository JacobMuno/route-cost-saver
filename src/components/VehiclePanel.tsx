import { Fuel, Plug, Zap, Leaf } from "lucide-react";
import type { VehicleConfig, VehicleType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES: { value: VehicleType; label: string; icon: typeof Fuel }[] = [
  { value: "petrol", label: "Petrol", icon: Fuel },
  { value: "diesel", label: "Diesel", icon: Fuel },
  { value: "electric", label: "Electric", icon: Zap },
  { value: "hybrid", label: "Hybrid", icon: Leaf },
];

type Props = {
  vehicle: VehicleConfig;
  onChange: (v: VehicleConfig) => void;
};

export function VehiclePanel({ vehicle, onChange }: Props) {
  const isElectric = vehicle.type === "electric";
  const consumptionUnit = isElectric ? "kWh / 100 km" : "L / 100 km";
  const priceUnit = isElectric ? "SEK / kWh" : "SEK / litre";

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Vehicle type
        </label>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = vehicle.type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onChange({ ...vehicle, type: t.value })}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-all",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-input text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Consumption
          </label>
          <div className="relative mt-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.1}
              value={vehicle.consumption || ""}
              onChange={(e) =>
                onChange({ ...vehicle, consumption: parseFloat(e.target.value) || 0 })
              }
              placeholder={isElectric ? "18" : "6.5"}
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 pr-20 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              {consumptionUnit}
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {isElectric ? "Electricity price" : "Fuel price"}
          </label>
          <div className="relative mt-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              value={vehicle.pricePerUnit || ""}
              onChange={(e) =>
                onChange({ ...vehicle, pricePerUnit: parseFloat(e.target.value) || 0 })
              }
              placeholder={isElectric ? "2.50" : "18.50"}
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 pr-24 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              {priceUnit}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Plug className="h-3 w-3 mt-0.5 shrink-0" />
        {vehicle.type === "hybrid"
          ? "Hybrid mode varies — enter your real-world average L/100km. EV-only mode not yet supported."
          : "Find this in your owner's manual, on fuelly.com, or your car's trip computer."}
      </p>
    </div>
  );
}
