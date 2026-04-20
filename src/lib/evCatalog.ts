/**
 * Built-in catalog of common electric vehicles with realistic kWh/100 km
 * figures (WLTP combined, rounded). Used as a fallback inside the
 * "Find my car" modal because API Ninjas only covers ICE cars.
 *
 * Numbers are sourced from EV-Database / manufacturer WLTP combined ratings;
 * always treat them as rough estimates the user should verify.
 */
export type EvSpec = {
  make: string;
  model: string;
  /** Earliest model year this figure roughly applies to. */
  yearFrom: number;
  /** Energy use, kWh per 100 km (WLTP combined, wall-to-wheel-ish). */
  kwhPer100km: number;
  /** Optional trim/variant note shown alongside the name. */
  variant?: string;
};

export const EV_CATALOG: EvSpec[] = [
  // Tesla
  { make: "Tesla", model: "Model 3", yearFrom: 2021, kwhPer100km: 14.5, variant: "RWD" },
  { make: "Tesla", model: "Model 3", yearFrom: 2021, kwhPer100km: 16, variant: "Long Range AWD" },
  { make: "Tesla", model: "Model 3", yearFrom: 2021, kwhPer100km: 17, variant: "Performance" },
  { make: "Tesla", model: "Model Y", yearFrom: 2021, kwhPer100km: 16, variant: "RWD" },
  { make: "Tesla", model: "Model Y", yearFrom: 2021, kwhPer100km: 17, variant: "Long Range AWD" },
  { make: "Tesla", model: "Model Y", yearFrom: 2021, kwhPer100km: 18, variant: "Performance" },
  { make: "Tesla", model: "Model S", yearFrom: 2021, kwhPer100km: 18 },
  { make: "Tesla", model: "Model X", yearFrom: 2021, kwhPer100km: 20 },

  // Polestar
  { make: "Polestar", model: "2", yearFrom: 2020, kwhPer100km: 17, variant: "Long Range Single Motor" },
  { make: "Polestar", model: "2", yearFrom: 2020, kwhPer100km: 18.5, variant: "Long Range Dual Motor" },
  { make: "Polestar", model: "3", yearFrom: 2024, kwhPer100km: 21 },
  { make: "Polestar", model: "4", yearFrom: 2024, kwhPer100km: 18 },

  // Volvo
  { make: "Volvo", model: "EX30", yearFrom: 2024, kwhPer100km: 16 },
  { make: "Volvo", model: "EX40", yearFrom: 2023, kwhPer100km: 18, variant: "formerly XC40 Recharge" },
  { make: "Volvo", model: "EC40", yearFrom: 2023, kwhPer100km: 17, variant: "formerly C40 Recharge" },
  { make: "Volvo", model: "EX90", yearFrom: 2024, kwhPer100km: 21 },
  { make: "Volvo", model: "XC40 Recharge", yearFrom: 2020, kwhPer100km: 18 },
  { make: "Volvo", model: "C40 Recharge", yearFrom: 2021, kwhPer100km: 17 },

  // Volkswagen Group
  { make: "Volkswagen", model: "ID.3", yearFrom: 2020, kwhPer100km: 15.5 },
  { make: "Volkswagen", model: "ID.4", yearFrom: 2021, kwhPer100km: 17 },
  { make: "Volkswagen", model: "ID.5", yearFrom: 2022, kwhPer100km: 17 },
  { make: "Volkswagen", model: "ID.7", yearFrom: 2024, kwhPer100km: 16 },
  { make: "Volkswagen", model: "ID. Buzz", yearFrom: 2023, kwhPer100km: 21 },
  { make: "Audi", model: "Q4 e-tron", yearFrom: 2021, kwhPer100km: 17 },
  { make: "Audi", model: "Q6 e-tron", yearFrom: 2024, kwhPer100km: 18 },
  { make: "Audi", model: "e-tron GT", yearFrom: 2021, kwhPer100km: 20 },
  { make: "Audi", model: "Q8 e-tron", yearFrom: 2023, kwhPer100km: 22 },
  { make: "Skoda", model: "Enyaq", yearFrom: 2021, kwhPer100km: 17 },
  { make: "Cupra", model: "Born", yearFrom: 2022, kwhPer100km: 15.5 },
  { make: "Cupra", model: "Tavascan", yearFrom: 2024, kwhPer100km: 18 },
  { make: "Porsche", model: "Taycan", yearFrom: 2020, kwhPer100km: 21 },
  { make: "Porsche", model: "Macan Electric", yearFrom: 2024, kwhPer100km: 19 },

  // Kia
  { make: "Kia", model: "EV3", yearFrom: 2024, kwhPer100km: 15 },
  { make: "Kia", model: "EV6", yearFrom: 2021, kwhPer100km: 16.5, variant: "RWD" },
  { make: "Kia", model: "EV6", yearFrom: 2021, kwhPer100km: 17.5, variant: "AWD" },
  { make: "Kia", model: "EV6", yearFrom: 2022, kwhPer100km: 20, variant: "GT" },
  { make: "Kia", model: "EV9", yearFrom: 2024, kwhPer100km: 22 },
  { make: "Kia", model: "Niro EV", yearFrom: 2022, kwhPer100km: 16 },
  { make: "Kia", model: "Soul EV", yearFrom: 2020, kwhPer100km: 16 },

  // Hyundai
  { make: "Hyundai", model: "Ioniq 5", yearFrom: 2021, kwhPer100km: 17, variant: "RWD" },
  { make: "Hyundai", model: "Ioniq 5", yearFrom: 2021, kwhPer100km: 18, variant: "AWD" },
  { make: "Hyundai", model: "Ioniq 5 N", yearFrom: 2024, kwhPer100km: 21 },
  { make: "Hyundai", model: "Ioniq 6", yearFrom: 2023, kwhPer100km: 14 },
  { make: "Hyundai", model: "Kona Electric", yearFrom: 2019, kwhPer100km: 15.5 },

  // BMW
  { make: "BMW", model: "i4", yearFrom: 2022, kwhPer100km: 16 },
  { make: "BMW", model: "i5", yearFrom: 2024, kwhPer100km: 17 },
  { make: "BMW", model: "i7", yearFrom: 2023, kwhPer100km: 19 },
  { make: "BMW", model: "iX", yearFrom: 2022, kwhPer100km: 20 },
  { make: "BMW", model: "iX1", yearFrom: 2023, kwhPer100km: 17 },
  { make: "BMW", model: "iX3", yearFrom: 2021, kwhPer100km: 18 },

  // Mercedes-Benz
  { make: "Mercedes-Benz", model: "EQA", yearFrom: 2021, kwhPer100km: 17 },
  { make: "Mercedes-Benz", model: "EQB", yearFrom: 2022, kwhPer100km: 18 },
  { make: "Mercedes-Benz", model: "EQE", yearFrom: 2022, kwhPer100km: 17 },
  { make: "Mercedes-Benz", model: "EQS", yearFrom: 2022, kwhPer100km: 18 },

  // Renault / Dacia / Nissan / Peugeot / Citroën / Opel / Fiat
  { make: "Renault", model: "Megane E-Tech", yearFrom: 2022, kwhPer100km: 16 },
  { make: "Renault", model: "Scenic E-Tech", yearFrom: 2024, kwhPer100km: 16.5 },
  { make: "Renault", model: "Zoe", yearFrom: 2020, kwhPer100km: 17 },
  { make: "Renault", model: "5 E-Tech", yearFrom: 2024, kwhPer100km: 14.5 },
  { make: "Dacia", model: "Spring", yearFrom: 2021, kwhPer100km: 13.5 },
  { make: "Nissan", model: "Leaf", yearFrom: 2018, kwhPer100km: 17 },
  { make: "Nissan", model: "Ariya", yearFrom: 2022, kwhPer100km: 18 },
  { make: "Peugeot", model: "e-208", yearFrom: 2020, kwhPer100km: 15 },
  { make: "Peugeot", model: "e-2008", yearFrom: 2020, kwhPer100km: 16.5 },
  { make: "Peugeot", model: "e-3008", yearFrom: 2024, kwhPer100km: 17 },
  { make: "Citroen", model: "e-C4", yearFrom: 2021, kwhPer100km: 16 },
  { make: "Opel", model: "Mokka-e", yearFrom: 2021, kwhPer100km: 16 },
  { make: "Opel", model: "Corsa-e", yearFrom: 2020, kwhPer100km: 15 },
  { make: "Fiat", model: "500e", yearFrom: 2021, kwhPer100km: 14.5 },

  // BYD / MG / Xpeng / Zeekr / NIO
  { make: "BYD", model: "Atto 3", yearFrom: 2022, kwhPer100km: 16 },
  { make: "BYD", model: "Dolphin", yearFrom: 2023, kwhPer100km: 15.5 },
  { make: "BYD", model: "Seal", yearFrom: 2023, kwhPer100km: 16.5 },
  { make: "MG", model: "MG4", yearFrom: 2022, kwhPer100km: 16 },
  { make: "MG", model: "ZS EV", yearFrom: 2020, kwhPer100km: 17 },
  { make: "MG", model: "MG5", yearFrom: 2022, kwhPer100km: 17 },
  { make: "Xpeng", model: "G6", yearFrom: 2024, kwhPer100km: 17 },
  { make: "Zeekr", model: "X", yearFrom: 2024, kwhPer100km: 17 },
  { make: "Zeekr", model: "001", yearFrom: 2024, kwhPer100km: 18 },
  { make: "NIO", model: "ET5", yearFrom: 2023, kwhPer100km: 17 },

  // Ford
  { make: "Ford", model: "Mustang Mach-E", yearFrom: 2021, kwhPer100km: 18 },
  { make: "Ford", model: "Explorer EV", yearFrom: 2024, kwhPer100km: 17 },
  { make: "Ford", model: "Capri EV", yearFrom: 2024, kwhPer100km: 17 },

  // Smart / Mini / Honda
  { make: "Smart", model: "#1", yearFrom: 2023, kwhPer100km: 17 },
  { make: "Smart", model: "#3", yearFrom: 2024, kwhPer100km: 17 },
  { make: "Mini", model: "Cooper SE", yearFrom: 2020, kwhPer100km: 15.5 },
  { make: "Honda", model: "e", yearFrom: 2020, kwhPer100km: 17 },
];

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Fuzzy-search the EV catalog. Matches if the query tokens appear in the
 * make or model (normalized). Year, when provided, must be >= yearFrom.
 */
export function searchEvCatalog(opts: {
  make: string;
  model: string;
  year?: number;
}): EvSpec[] {
  const q = norm(`${opts.make} ${opts.model}`);
  if (!q) return [];
  const tokens = [norm(opts.make), norm(opts.model)].filter(Boolean);
  const scored = EV_CATALOG.map((ev) => {
    const hay = norm(`${ev.make} ${ev.model} ${ev.variant ?? ""}`);
    let score = 0;
    for (const t of tokens) {
      if (!t) continue;
      if (hay.includes(t)) score += t.length;
    }
    if (opts.year && opts.year < ev.yearFrom) score -= 1; // mild penalty
    return { ev, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 12).map((x) => x.ev);
}
