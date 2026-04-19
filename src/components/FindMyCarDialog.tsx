import { useEffect, useState } from "react";
import { Loader2, Search, AlertCircle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { lookupCar, type CarMatch } from "@/server/carLookup";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Called with the chosen consumption (L/100km) when user confirms. */
  onConfirm: (consumptionLper100km: number, label: string) => void;
};

export function FindMyCarDialog({ open, onOpenChange, onConfirm }: Props) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<CarMatch[]>([]);
  const [searched, setSearched] = useState(false);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset on close so the next open is fresh.
      setError(null);
      setMatches([]);
      setSearched(false);
      setPickedIdx(null);
    }
  }, [open]);

  const canSearch = make.trim().length > 0 && model.trim().length > 0 && !loading;

  const onSearch = async () => {
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setMatches([]);
    setPickedIdx(null);
    try {
      const yr = year.trim() ? parseInt(year, 10) : undefined;
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
        // Only show matches that have a usable consumption value.
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

  const picked = pickedIdx !== null ? matches[pickedIdx] : null;

  const onUse = () => {
    if (!picked || picked.consumptionLper100km === null) return;
    const label = `${picked.year} ${picked.make} ${picked.model}`;
    onConfirm(picked.consumptionLper100km, label);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Find my car</DialogTitle>
          <DialogDescription>
            Look up your car and get a rough fuel-consumption estimate based on
            engine size and type. Always check it against your real-world
            average — your owner's manual or trip computer will be more accurate.
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
              placeholder="Volvo"
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
              placeholder="XC60"
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

        {searched && !loading && matches.length === 0 && !error && (
          <p className="text-xs text-muted-foreground">
            No fuel-consumption data found. Try a different spelling, drop the
            year, or enter consumption manually.
          </p>
        )}

        {matches.length > 0 && (
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

        {picked && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="font-medium">Selected:</span>{" "}
            <span className="capitalize">
              {picked.year} {picked.make} {picked.model}
            </span>{" "}
            — ~{picked.consumptionLper100km} L/100 km (rough estimate from
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
            disabled={!picked}
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
