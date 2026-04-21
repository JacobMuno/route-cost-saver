import { createContext, useContext, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export type Currency = "SEK" | "EUR" | "USD";
export type DistanceUnit = "km" | "mi";

export type AppSettings = {
  currency: Currency;
  distanceUnit: DistanceUnit;
  defaultFuelPrice: number; // SEK/L
  defaultElectricityPrice: number; // SEK/kWh
};

const DEFAULTS: AppSettings = {
  currency: "SEK",
  distanceUnit: "km",
  defaultFuelPrice: 18.5,
  defaultElectricityPrice: 2.5,
};

type Ctx = {
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  reset: () => void;
};

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    "tripcost.settings.v1",
    DEFAULTS,
  );

  const value = useMemo<Ctx>(
    () => ({
      settings: { ...DEFAULTS, ...settings },
      update: (key, val) => setSettings({ ...settings, [key]: val }),
      reset: () => setSettings(DEFAULTS),
    }),
    [settings, setSettings],
  );

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings(): Ctx {
  const v = useContext(SettingsCtx);
  if (!v) throw new Error("useSettings must be used inside <SettingsProvider>");
  return v;
}
