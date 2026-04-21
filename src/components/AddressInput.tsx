import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { geocodeSearch } from "@/server/ors";
import type { LocationInput } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  value: LocationInput;
  onChange: (v: LocationInput) => void;
  placeholder: string;
  onRemove?: () => void;
  iconColor?: string;
};

export function AddressInput({
  value,
  onChange,
  placeholder,
  onRemove,
  iconColor,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<
    Array<{ label: string; lat: number; lng: number }>
  >([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleQueryChange(q: string) {
    onChange({ query: q, point: null, label: null });
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (q.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    const myReq = ++reqId.current;
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await geocodeSearch({ data: { text: q } });
        if (myReq !== reqId.current) return;
        setSuggestions(res.suggestions);
      } catch {
        setSuggestions([]);
      } finally {
        if (myReq === reqId.current) setLoading(false);
      }
    }, 300);
  }

  function pick(s: { label: string; lat: number; lng: number }) {
    onChange({ query: s.label, point: { lat: s.lat, lng: s.lng }, label: s.label });
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-input px-3 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
        <MapPin
          className="h-4 w-4 shrink-0"
          style={{ color: iconColor ?? "var(--muted-foreground)" }}
        />
        <input
          type="text"
          value={value.query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-popover shadow-elevated overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(s)}
              className={cn(
                "w-full text-left px-3 py-2.5 text-sm text-popover-foreground hover:bg-muted transition-colors flex items-start gap-2",
                i > 0 && "border-t border-border/60",
              )}
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
