import { useCallback, useEffect, useState } from "react";
import type { VehicleConfig, VehicleType } from "@/lib/types";

const STORE_KEY = "tripcost.compare.v1";

const DEFAULTS: Record<VehicleType, VehicleConfig> = {
  petrol: { type: "petrol", consumption: 0, pricePerUnit: 0 },
  diesel: { type: "diesel", consumption: 0, pricePerUnit: 0 },
  electric: { type: "electric", consumption: 0, pricePerUnit: 0 },
  hybrid: { type: "hybrid", consumption: 0, pricePerUnit: 0 },
};

type CarStore = Record<VehicleType, VehicleConfig>;

type Persisted = {
  carA: { activeType: VehicleType; store: CarStore };
  carB: { activeType: VehicleType; store: CarStore } | null;
  compareEnabled: boolean;
};

function freshStore(): CarStore {
  return {
    petrol: { ...DEFAULTS.petrol },
    diesel: { ...DEFAULTS.diesel },
    electric: { ...DEFAULTS.electric },
    hybrid: { ...DEFAULTS.hybrid },
  };
}

function defaultPersisted(): Persisted {
  return {
    carA: { activeType: "petrol", store: freshStore() },
    carB: null,
    compareEnabled: false,
  };
}

function load(): Persisted {
  if (typeof window === "undefined") return defaultPersisted();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Persisted>;
      return {
        carA: parsed.carA ?? defaultPersisted().carA,
        carB: parsed.carB ?? null,
        compareEnabled: !!parsed.compareEnabled,
      };
    }
    // Migrate from previous useVehicleByType keys.
    const legacyStore = window.localStorage.getItem("tripcost.vehicleByType.v1");
    const legacyActive = window.localStorage.getItem(
      "tripcost.activeVehicleType.v1",
    );
    if (legacyStore) {
      const store = { ...freshStore(), ...(JSON.parse(legacyStore) as Partial<CarStore>) };
      const activeType =
        legacyActive && ["petrol", "diesel", "electric", "hybrid"].includes(legacyActive)
          ? (legacyActive as VehicleType)
          : "petrol";
      return { carA: { activeType, store }, carB: null, compareEnabled: false };
    }
  } catch {
    /* ignore */
  }
  return defaultPersisted();
}

function appendCopy(name: string | undefined): string {
  if (!name || !name.trim()) return "Car B";
  return `${name} (copy)`;
}

/**
 * Two-car comparison state. Car B is preserved in storage even when
 * `compareEnabled` is false, so toggling back on restores prior edits
 * rather than re-cloning Car A.
 */
export function useCompareVehicles() {
  const [state, setState] = useState<Persisted>(() => defaultPersisted());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const carA = state.carA.store[state.carA.activeType];
  const carB = state.carB ? state.carB.store[state.carB.activeType] : null;

  const setCarA = useCallback((v: VehicleConfig) => {
    setState((prev) => ({
      ...prev,
      carA: {
        activeType: v.type,
        store: { ...prev.carA.store, [v.type]: v },
      },
    }));
  }, []);

  const setCarB = useCallback((v: VehicleConfig) => {
    setState((prev) => {
      const base = prev.carB ?? { activeType: v.type, store: freshStore() };
      return {
        ...prev,
        carB: {
          activeType: v.type,
          store: { ...base.store, [v.type]: v },
        },
      };
    });
  }, []);

  const setCompareEnabled = useCallback((on: boolean) => {
    setState((prev) => {
      if (!on) return { ...prev, compareEnabled: false };
      // First-time enable: initialize Car B as a copy of Car A's current config.
      if (!prev.carB) {
        const a = prev.carA.store[prev.carA.activeType];
        const cloned: VehicleConfig = { ...a, name: appendCopy(a.name) };
        const store = freshStore();
        store[cloned.type] = cloned;
        return {
          ...prev,
          compareEnabled: true,
          carB: { activeType: cloned.type, store },
        };
      }
      return { ...prev, compareEnabled: true };
    });
  }, []);

  return {
    carA,
    carB,
    setCarA,
    setCarB,
    compareEnabled: state.compareEnabled,
    setCompareEnabled,
  };
}
