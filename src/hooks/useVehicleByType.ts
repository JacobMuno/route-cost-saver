import { useCallback, useEffect, useState } from "react";
import type { VehicleConfig, VehicleType } from "@/lib/types";

const STORAGE_KEY = "tripcost.vehicleByType.v1";
const ACTIVE_KEY = "tripcost.activeVehicleType.v1";

const DEFAULTS: Record<VehicleType, VehicleConfig> = {
  petrol: { type: "petrol", consumption: 0, pricePerUnit: 0 },
  diesel: { type: "diesel", consumption: 0, pricePerUnit: 0 },
  electric: { type: "electric", consumption: 0, pricePerUnit: 0 },
  hybrid: { type: "hybrid", consumption: 0, pricePerUnit: 0 },
};

type Store = Record<VehicleType, VehicleConfig>;

function loadStore(): Store {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Store>;
      return { ...DEFAULTS, ...parsed };
    }
    // Migrate from previous single-vehicle key.
    const legacy = window.localStorage.getItem("tripcost.vehicle");
    if (legacy) {
      const v = JSON.parse(legacy) as VehicleConfig;
      const store = { ...DEFAULTS };
      if (v && v.type) store[v.type] = v;
      return store;
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

function loadActiveType(): VehicleType {
  if (typeof window === "undefined") return "petrol";
  try {
    const raw = window.localStorage.getItem(ACTIVE_KEY);
    if (raw && ["petrol", "diesel", "electric", "hybrid"].includes(raw)) {
      return raw as VehicleType;
    }
    const legacy = window.localStorage.getItem("tripcost.vehicle");
    if (legacy) {
      const v = JSON.parse(legacy) as VehicleConfig;
      if (v?.type) return v.type;
    }
  } catch {
    /* ignore */
  }
  return "petrol";
}

/**
 * Per-type vehicle config persistence: each type's settings are remembered
 * independently, so switching between petrol and EV doesn't lose either.
 */
export function useVehicleByType(): [VehicleConfig, (v: VehicleConfig) => void] {
  const [store, setStore] = useState<Store>(() => ({ ...DEFAULTS }));
  const [activeType, setActiveType] = useState<VehicleType>("petrol");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(loadStore());
    setActiveType(loadActiveType());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      /* ignore */
    }
  }, [store, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(ACTIVE_KEY, activeType);
    } catch {
      /* ignore */
    }
  }, [activeType, hydrated]);

  const setVehicle = useCallback((v: VehicleConfig) => {
    setActiveType(v.type);
    setStore((prev) => ({ ...prev, [v.type]: v }));
  }, []);

  return [store[activeType], setVehicle];
}
