import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, AlertCircle, Check, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { lookupCar, type CarMatch } from "@/server/carLookup";
import { searchEvCatalog, type EvSpec } from "@/lib/evCatalog";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Whether the active vehicle is electric — switches to EV catalog mode. */
  isElectric?: boolean;
  /**
   * Called with the chosen consumption when user confirms.
   * Units: L/100km for ICE, kWh/100km for electric.
   */
  onConfirm: (consumption: number, label: string) => void;
};

type EvMatch = EvSpec; // alias for clarity

export function FindMyCarDialog({ open, onOpenChange, isElectric, onConfirm }: Props) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<CarMatch[]>([]);
  const [evMatches, setEvMatches] = useState<EvMatch[]>([]);
  const [searched, setSearched] = useState(false);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setMatches([]);
      setEvMatches([]);
      setSearched(false);
      setPickedIdx(null);
    }
  }, [open]);

  // Reset results when switching modes (electric vs ICE).
  useEffect(() => {
    setMatches([]);
    setEvMatches([]);
    setSearched(false);
    setPickedIdx(null);
    setError(null);
  }, [isElectric]);

  const canSearch = make.trim().length > 0 && model.trim().length > 0 && !loading;

  const onSearch = async () => {
    if (!canSearch) return;
    setError(null);
    setMatches([]);
    setEvMatches([]);
    setPickedIdx(null);

    const yr = year.trim() ? parseInt(year, 10) : undefined;

    if (isElectric) {
      // Local catalog lookup — instant, no network.
      const res = searchEvCatalog({
        make: make.trim(),
        model: model.trim(),
        year: Number.isFinite(yr) ? (yr as number) : undefined,
      });
      setEvMatches(res);
      if (res.length > 0) setPickedIdx(0);
      setSearched(true);
      return;
    }

    setLoading(true);
    try {
      const res = await lookupCar({
        data: {
          make: make.trim(),
          model: model.trim(),
          year: Number.isFinite(yr) ? (yr as number) : undefined,
        },
      });
      if (res.error) {
        setError(res.error);
      } else {
        const usable = res.matches.filter((m) => m.consumptionLper100km !== null);
        setMatches(usable);
        if (usable.length > 0) setPickedIdx(0);
      }
      setSearched(true);
    } catch {
      setError("Could not reach car lookup. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const pickedEv = isElectric && pickedIdx !== null ? evMatches[pickedIdx] : null;
  const pickedIce = !isElectric && pickedIdx !== null ? matches[pickedIdx] : null;

  const pickedDisplayYear = useMemo(() => {
    if (pickedEv) {
      const y = year.trim() ? parseInt(year, 10) : undefined;
      return y && y >= pickedEv.yearFrom ? y : pickedEv.yearFrom;
    }
    return null;
  }, [pickedEv, year]);

  const onUse = () => {
    if (pickedEv) {
      const label = `${pickedDisplayYear ?? pickedEv.yearFrom} ${pickedEv.make} ${pickedEv.model}${
        pickedEv.variant ? ` ${pickedEv.variant}` : ""
      }`;
      onConfirm(pickedEv.kwhPer100km, label);
      onOpenChange(false);
      return;
    }
    if (pickedIce && pickedIce.consumptionLper100km !== null) {
      const label = `${pickedIce.year} ${pickedIce.make} ${pickedIce.model}`;
      onConfirm(pickedIce.consumptionLper100km, label);
      onOpenChange(false);
    }
  };

  const hasPicked = pickedEv !== null || pickedIce !== null;
  const noResults =
    searched &&
    !loading &&
    !error &&
    (isElectric ? evMatches.length === 0 : matches.length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isElectric && <Zap className="h-4 w-4 text-primary" />}
            Find my car
          </DialogTitle>
          <DialogDescription>
            {isElectric
              ? "Pick from our built-in catalog of common EVs (kWh/100 km, WLTP combined). Real-world consumption depends on speed, weather, and driving style — adjust if you know better."
              : "Look up your car and get a rough fuel-consumption estimate based on engine size and type. Always check it against your real-world average — your owner's manual or trip computer will be more accurate."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Make
            </label>
            <input
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder={isElectric ? "Tesla" : "Volvo"}
              className="mt-1 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />
          </div>
          <div className="col-span-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Model
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={isElectric ? "Model 3" : "XC60"}
              className="mt-1 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />
          </div>
          <div className="col-span-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Year (optional)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              placeholder="2022"
              className="mt-1 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onSearch}
          disabled={!canSearch}
          className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-foreground flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
            {error}
          </div>
        )}

        {noResults && (
          <p className="text-xs text-muted-foreground">
            {isElectric
              ? "No match in the EV catalog. Try a different spelling (e.g. 'VW' → 'Volkswagen', 'Mercedes' → 'Mercedes-Benz') or enter kWh/100 km manually."
              : "No fuel-consumption data found. Try a different spelling, drop the year, or enter consumption manually."}
          </p>
        )}

        {isElectric && evMatches.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {evMatches.length} match{evMatches.length === 1 ? "" : "es"}
            </p>
            {evMatches.map((m, i) => {
              const active = i === pickedIdx;
              return (
                <button
                  key={`${m.make}-${m.model}-${m.variant ?? ""}-${i}`}
                  type="button"
                  onClick={() => setPickedIdx(i)}
                  className={cn(
                    "w-full text-left rounded-xl border px-3 py-2 transition-all",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-input hover:border-primary/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {m.make} {m.model}
                      {m.variant ? ` · ${m.variant}` : ""}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {m.kwhPer100km} kWh/100km
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    From {m.yearFrom} · WLTP combined estimate
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!isElectric && matches.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {matches.length} match{matches.length === 1 ? "" : "es"}
            </p>
            {matches.map((m, i) => {
              const active = i === pickedIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPickedIdx(i)}
                  className={cn(
                    "w-full text-left rounded-xl border px-3 py-2 transition-all",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-input hover:border-primary/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium capitalize">
                      {m.year} {m.make} {m.model}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {m.consumptionLper100km} L/100km
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground capitalize mt-0.5">
                    {m.fuelType}
                    {m.cylinders ? ` · ${m.cylinders}-cyl` : ""}
                    {m.displacementL ? ` · ${m.displacementL} L` : ""}
                    {m.drive ? ` · ${m.drive}` : ""}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {pickedEv && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="font-medium">Selected:</span>{" "}
            {pickedDisplayYear} {pickedEv.make} {pickedEv.model}
            {pickedEv.variant ? ` ${pickedEv.variant}` : ""} —{" "}
            {pickedEv.kwhPer100km} kWh/100 km (WLTP combined; real-world use
            varies with speed, weather, and driving style).
          </div>
        )}

        {pickedIce && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="font-medium">Selected:</span>{" "}
            <span className="capitalize">
              {pickedIce.year} {pickedIce.make} {pickedIce.model}
            </span>{" "}
            — ~{pickedIce.consumptionLper100km} L/100 km (rough estimate from
            engine size; please verify against your real-world average).
          </div>
        )}

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border bg-input px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onUse}
            disabled={!hasPicked}
            className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            Use this value
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
