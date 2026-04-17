import { useEffect, useState } from "react";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "now" | "custom";

type Props = {
  mode: Mode;
  customTime: Date | null;
  onChange: (mode: Mode, customTime: Date | null) => void;
};

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function DepartureTimePicker({ mode, customTime, onChange }: Props) {
  const [localValue, setLocalValue] = useState<string>(() =>
    toLocalInputValue(customTime ?? new Date()),
  );

  useEffect(() => {
    if (mode === "custom" && customTime) {
      setLocalValue(toLocalInputValue(customTime));
    }
  }, [mode, customTime]);

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Departure
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onChange("now", null)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-medium transition-all",
            mode === "now"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-input text-muted-foreground hover:text-foreground",
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          Now
        </button>
        <button
          type="button"
          onClick={() => {
            const d = fromLocalInputValue(localValue) ?? new Date();
            onChange("custom", d);
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-medium transition-all",
            mode === "custom"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-input text-muted-foreground hover:text-foreground",
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          Pick date & time
        </button>
      </div>
      {mode === "custom" && (
        <input
          type="datetime-local"
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
            const d = fromLocalInputValue(e.target.value);
            if (d) onChange("custom", d);
          }}
          className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      )}
    </div>
  );
}
