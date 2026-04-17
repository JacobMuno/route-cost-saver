import { useEffect, useState } from "react";
import { Fuel, Plug, Zap, Leaf } from "lucide-react";
import type { VehicleConfig, VehicleType } from "@/lib/types";
import { cn } from "@/lib/utils";

function NumberField({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  placeholder: string;
}) {
  const [text, setText] = useState<string>(value > 0 ? String(value) : "");

  useEffect(() => {
    const parsed = parseFloat(text);
    if ((isNaN(parsed) ? 0 : parsed) !== value) {
      setText(value > 0 ? String(value) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
        setText(raw);
        const parsed = parseFloat(raw);
        onChange(isNaN(parsed) ? 0 : parsed);
      }}
      placeholder={placeholder}
      className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
    />
  );
}

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
  const isHybrid = vehicle.type === "hybrid";
  const consumptionUnit = isElectric ? "kWh / 100 km" : "L / 100 km";
  const priceUnit = isElectric ? "SEK / kWh" : "SEK / litre";
  const consumptionLabel = isElectric ? "Energy use" : "Consumption";
  const consumptionPlaceholder = isElectric ? "18" : isHybrid ? "5.5" : "6.5";
  const pricePlaceholder = isElectric ? "2.50" : "18.50";
  const helperText = isElectric
    ? "Find kWh/100km in your car's display or on ev-database.org. Typical range: 15–25 kWh/100km."
    : isHybrid
    ? "Plug-in hybrids are treated as petrol for this calculation. Enter your real-world average, not the manufacturer's combined figure (which assumes mostly EV driving)."
    : "Find this in your owner's manual, on fuelly.com, or your car's trip computer.";

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
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {consumptionLabel}
            </label>
            <span className="text-[10px] text-muted-foreground">{consumptionUnit}</span>
          </div>
          <div className="mt-2">
            <NumberField
              value={vehicle.consumption}
              onChange={(n) => onChange({ ...vehicle, consumption: n })}
              placeholder={consumptionPlaceholder}
            />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {isElectric ? "Electricity" : "Fuel price"}
            </label>
            <span className="text-[10px] text-muted-foreground">{priceUnit}</span>
          </div>
          <div className="mt-2">
            <NumberField
              value={vehicle.pricePerUnit}
              onChange={(n) => onChange({ ...vehicle, pricePerUnit: n })}
              placeholder={pricePlaceholder}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Plug className="h-3 w-3 mt-0.5 shrink-0" />
        {helperText}
      </p>
    </div>
  );
}
