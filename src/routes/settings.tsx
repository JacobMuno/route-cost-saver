import { createFileRoute } from "@tanstack/react-router";
import { Sun, Moon, Monitor, Trash2, RotateCcw, Coins, Ruler, Fuel, Zap } from "lucide-react";
import { useSettings, type Currency, type DistanceUnit } from "@/lib/settings";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TripCost" },
      { name: "description", content: "Customize TripCost: theme, currency, distance units and default prices." },
      { property: "og:title", content: "Settings — TripCost" },
      { property: "og:description", content: "Customize your TripCost workspace." },
    ],
  }),
  component: SettingsPage,
});

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-card p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function OptionGrid<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: typeof Sun; hint?: string }[];
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const active = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "group relative flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-all",
              active
                ? "border-primary bg-primary/5 shadow-card"
                : "border-border bg-surface hover:border-primary/40",
            )}
          >
            <div className="flex items-center gap-2">
              {Icon && (
                <Icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
              )}
              <span className="text-sm font-medium text-foreground">{o.label}</span>
            </div>
            {o.hint && (
              <span className="text-xs text-muted-foreground">{o.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix: string;
}) {
  const [text, setText] = useState(String(value));
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
          const n = parseFloat(raw);
          if (!isNaN(n)) onChange(n);
        }}
        onBlur={() => setText(String(value))}
        className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground outline-none"
      />
      <span className="px-3 text-xs text-muted-foreground">{suffix}</span>
    </div>
  );
}

function SettingsPage() {
  const { mode, setMode } = useTheme();
  const { settings, update, reset } = useSettings();

  const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun; hint: string }[] = [
    { value: "light", label: "Light", icon: Sun, hint: "Always light" },
    { value: "system", label: "System", icon: Monitor, hint: "Match OS" },
    { value: "dark", label: "Dark", icon: Moon, hint: "Always dark" },
  ];

  const currencyOptions: { value: Currency; label: string; hint: string }[] = [
    { value: "SEK", label: "SEK", hint: "Swedish krona" },
    { value: "EUR", label: "EUR", hint: "Euro" },
    { value: "USD", label: "USD", hint: "US dollar" },
  ];

  const distanceOptions: { value: DistanceUnit; label: string; hint: string }[] = [
    { value: "km", label: "Kilometres", hint: "100 km baseline" },
    { value: "mi", label: "Miles", hint: "Imperial display" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">
          Workspace
        </p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl">
          Personalize TripCost. Preferences are saved locally on this device.
        </p>
      </div>

      <div className="space-y-5">
        <Section title="Appearance" description="Choose how the app looks on this device.">
          <OptionGrid
            ariaLabel="Theme"
            value={mode}
            onChange={(v) => setMode(v)}
            options={themeOptions}
          />
        </Section>

        <Section title="Currency" description="Used for cost displays.">
          <OptionGrid
            ariaLabel="Currency"
            value={settings.currency}
            onChange={(v) => update("currency", v)}
            options={currencyOptions.map((o) => ({ ...o, icon: Coins }))}
          />
          {settings.currency !== "SEK" && (
            <p className="mt-3 text-xs text-muted-foreground">
              Note: prices entered in the calculator are still treated as SEK per
              unit. Conversion is display-only.
            </p>
          )}
        </Section>

        <Section title="Distance unit" description="Affects distance summaries and helper hints.">
          <OptionGrid
            ariaLabel="Distance unit"
            value={settings.distanceUnit}
            onChange={(v) => update("distanceUnit", v)}
            options={distanceOptions.map((o) => ({ ...o, icon: Ruler }))}
          />
        </Section>

        <Section
          title="Default prices"
          description="Suggested values for new vehicles. You can always override them per car."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Fuel className="h-3 w-3" /> Fuel price
              </label>
              <div className="mt-2">
                <NumberInput
                  value={settings.defaultFuelPrice}
                  onChange={(n) => update("defaultFuelPrice", n)}
                  suffix="SEK / L"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3 w-3" /> Electricity price
              </label>
              <div className="mt-2">
                <NumberInput
                  value={settings.defaultElectricityPrice}
                  onChange={(n) => update("defaultElectricityPrice", n)}
                  suffix="SEK / kWh"
                />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Maintenance" description="Reset preferences or clear cached map tiles.">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset settings
            </button>
            <button
              type="button"
              onClick={async () => {
                if (typeof caches === "undefined") return;
                const names = await caches.keys();
                await Promise.all(
                  names.filter((n) => n.includes("osm")).map((n) => caches.delete(n)),
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:border-destructive/50 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear cached map tiles
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
