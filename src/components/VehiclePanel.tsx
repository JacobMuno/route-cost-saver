import { useEffect, useState } from "react";
import { Fuel, Zap, Leaf, Search, X, Info } from "lucide-react";
import type { VehicleConfig, VehicleType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FindMyCarDialog } from "./FindMyCarDialog";

function NumberField({
  value,
  onChange,
  placeholder,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  placeholder: string;
  suffix?: string;
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
    <div className="flex items-center rounded-xl border border-border bg-input focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
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
        className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
      />
      {suffix && (
        <span className="px-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium shrink-0">
          {suffix}
        </span>
      )}
    </div>
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
  const [lookupOpen, setLookupOpen] = useState(false);
  const isElectric = vehicle.type === "electric";
  const isHybrid = vehicle.type === "hybrid";
  const consumptionUnit = isElectric ? "kWh / 100 km" : "L / 100 km";
  const priceUnit = isElectric ? "SEK / kWh" : "SEK / L";
  const consumptionLabel = isElectric ? "Energy use" : "Consumption";
  const consumptionPlaceholder = isElectric ? "18" : isHybrid ? "5.5" : "6.5";
  const pricePlaceholder = isElectric ? "2.50" : "18.50";
  const helperText = isElectric
    ? "Find kWh/100km in your car's display or on ev-database.org. Typical: 15–25 kWh/100km."
    : isHybrid
    ? "Plug-in hybrids are treated as petrol here. Use your real-world average, not the manufacturer's combined figure."
    : "Find this in your owner's manual, on fuelly.com, or your car's trip computer.";

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
          Car name
        </label>
        <input
          type="text"
          value={vehicle.name ?? ""}
          onChange={(e) => onChange({ ...vehicle, name: e.target.value })}
          placeholder="e.g. My Volvo XC60"
          className="mt-1.5 w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
          Vehicle type
        </label>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
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
                    ? "border-primary bg-primary/10 text-primary shadow-card"
                    : "border-border bg-input text-muted-foreground hover:text-foreground hover:border-primary/30",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
              {consumptionLabel}
            </label>
          </div>
          <div className="mt-1.5">
            <NumberField
              value={vehicle.consumption}
              onChange={(n) =>
                onChange({ ...vehicle, consumption: n, consumptionFromLookup: false })
              }
              placeholder={consumptionPlaceholder}
              suffix={consumptionUnit}
            />
          </div>
          <button
            type="button"
            onClick={() => setLookupOpen(true)}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/15 transition-colors"
          >
            <Search className="h-3 w-3" />
            Find my car
          </button>
          {vehicle.consumptionFromLookup && (
            <div className="mt-2 flex items-start justify-between gap-2 rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-1.5 text-[11px] text-foreground">
              <span className="flex items-start gap-1.5">
                <Info className="h-3 w-3 mt-0.5 text-accent shrink-0" />
                Filled from lookup — adjust if you know better.
              </span>
              <button
                type="button"
                onClick={() => onChange({ ...vehicle, consumptionFromLookup: false })}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
            {isElectric ? "Electricity" : "Fuel price"}
          </label>
          <div className="mt-1.5">
            <NumberField
              value={vehicle.pricePerUnit}
              onChange={(n) => onChange({ ...vehicle, pricePerUnit: n })}
              placeholder={pricePlaceholder}
              suffix={priceUnit}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        {helperText}
      </p>

      <FindMyCarDialog
        open={lookupOpen}
        onOpenChange={setLookupOpen}
        isElectric={isElectric}
        onConfirm={(consumption, label) => {
          onChange({
            ...vehicle,
            consumption,
            consumptionFromLookup: true,
            name: vehicle.name && vehicle.name.trim() ? vehicle.name : label,
          });
        }}
      />
    </div>
  );
}
