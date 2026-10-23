/**
 * Ownership Cost Predictor — pure calculation layer.
 *
 * Mirrors the Import Estimator architecture: all tunable assumptions live in
 * OWNERSHIP_DEFAULTS, this module only computes. Every figure produced here is
 * an ESTIMATE derived from user inputs + catalogue data — not official data.
 */
import type { Car } from "@/lib/types";
import { PKR_RATE } from "@/lib/importDuty";

export const OWNERSHIP_DEFAULTS = {
  version: "1.0",
  /** Indicative retail fuel/energy prices in PKR (user-editable in the UI). */
  fuelPricePKR: {
    petrol: 275,
    diesel: 285,
    hybrid: 275,
    electric: 60, // per kWh
  } as Record<string, number>,
  /** Fallback fuel economy when the catalogue has no value. */
  fallbackKmpl: {
    petrol: 10,
    diesel: 12,
    hybrid: 18,
    electric: 6, // km per kWh
  } as Record<string, number>,
  /** Yearly maintenance as a share of vehicle price. */
  maintenanceRateOfPrice: 0.015,
  /** Yearly insurance as a share of vehicle price (comprehensive, indicative). */
  insuranceRateOfPrice: 0.025,
  /** Yearly other costs (token tax, washing, parking, misc.) in PKR. */
  otherYearlyPKR: 45000,
  yearlyKm: 15000,
  years: 5,
};

export interface OwnershipInputs {
  years: number;
  yearlyKm: number;
  /** PKR per litre, or per kWh for electric vehicles. */
  fuelPrice: number;
  /** PKR per year */
  maintenanceYearly: number;
  /** PKR per year */
  insuranceYearly: number;
  /** PKR per year */
  otherYearly: number;
  /** km per litre, or km per kWh for electric vehicles. */
  efficiency: number;
}

export interface OwnershipLine {
  key: string;
  label: string;
  amountPKR: number;
  hint: string;
}

export interface OwnershipResult {
  vehiclePricePKR: number;
  fuelTotal: number;
  maintenanceTotal: number;
  insuranceTotal: number;
  otherTotal: number;
  runningTotal: number;
  totalWithVehicle: number;
  annual: number;
  monthly: number;
  perKm: number;
  totalKm: number;
  lines: OwnershipLine[];
  isElectric: boolean;
  efficiencyUnit: string;
  fuelPriceUnit: string;
}

const safe = (n: unknown, fallback = 0): number => {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

export function normalizeFuel(fuelType: string | null | undefined): string {
  const f = (fuelType || "petrol").toLowerCase();
  if (f.includes("electric")) return "electric";
  if (f.includes("hybrid")) return "hybrid";
  if (f.includes("diesel")) return "diesel";
  return "petrol";
}

/** Derive sensible, car-specific starting values for the form. */
export function getDefaultInputs(car: Car): OwnershipInputs {
  const fuel = normalizeFuel(car.fuel_type);
  const pricePKR = safe(car.price) * PKR_RATE;
  const efficiency = safe(car.mileage_kmpl) || OWNERSHIP_DEFAULTS.fallbackKmpl[fuel];

  return {
    years: OWNERSHIP_DEFAULTS.years,
    yearlyKm: OWNERSHIP_DEFAULTS.yearlyKm,
    fuelPrice: OWNERSHIP_DEFAULTS.fuelPricePKR[fuel],
    maintenanceYearly: Math.round(pricePKR * OWNERSHIP_DEFAULTS.maintenanceRateOfPrice),
    insuranceYearly: Math.round(pricePKR * OWNERSHIP_DEFAULTS.insuranceRateOfPrice),
    otherYearly: OWNERSHIP_DEFAULTS.otherYearlyPKR,
    efficiency: Math.round(efficiency * 10) / 10,
  };
}

export function calcOwnership(car: Car, input: OwnershipInputs): OwnershipResult {
  const fuel = normalizeFuel(car.fuel_type);
  const isElectric = fuel === "electric";
  const vehiclePricePKR = safe(car.price) * PKR_RATE;

  const years = Math.max(1, safe(input.years, 1));
  const yearlyKm = safe(input.yearlyKm);
  const efficiency = Math.max(0.1, safe(input.efficiency, 0.1));
  const fuelPrice = safe(input.fuelPrice);

  const totalKm = yearlyKm * years;
  const unitsPerYear = yearlyKm / efficiency;
  const fuelTotal = unitsPerYear * fuelPrice * years;
  const maintenanceTotal = safe(input.maintenanceYearly) * years;
  const insuranceTotal = safe(input.insuranceYearly) * years;
  const otherTotal = safe(input.otherYearly) * years;

  const runningTotal = fuelTotal + maintenanceTotal + insuranceTotal + otherTotal;
  const totalWithVehicle = vehiclePricePKR + runningTotal;

  const fuelPriceUnit = isElectric ? "PKR / kWh" : "PKR / litre";
  const efficiencyUnit = isElectric ? "km / kWh" : "km / litre";

  const lines: OwnershipLine[] = [
    {
      key: "fuel",
      label: isElectric ? "Charging" : "Fuel",
      amountPKR: fuelTotal,
      hint: `${Math.round(unitsPerYear).toLocaleString()} ${isElectric ? "kWh" : "litres"} / year @ ${efficiency} ${efficiencyUnit}`,
    },
    {
      key: "maintenance",
      label: "Maintenance & Servicing",
      amountPKR: maintenanceTotal,
      hint: `${Math.round(safe(input.maintenanceYearly)).toLocaleString()} PKR / year`,
    },
    {
      key: "insurance",
      label: "Insurance",
      amountPKR: insuranceTotal,
      hint: `${Math.round(safe(input.insuranceYearly)).toLocaleString()} PKR / year`,
    },
    {
      key: "other",
      label: "Other Expenses",
      amountPKR: otherTotal,
      hint: "Token tax, parking, washing, misc.",
    },
  ];

  return {
    vehiclePricePKR,
    fuelTotal,
    maintenanceTotal,
    insuranceTotal,
    otherTotal,
    runningTotal,
    totalWithVehicle,
    annual: runningTotal / years,
    monthly: runningTotal / (years * 12),
    perKm: totalKm > 0 ? runningTotal / totalKm : 0,
    totalKm,
    lines,
    isElectric,
    efficiencyUnit,
    fuelPriceUnit,
  };
}

export function buildAssumptions(car: Car, input: OwnershipInputs, result: OwnershipResult): string[] {
  const fuel = normalizeFuel(car.fuel_type);
  return [
    `Vehicle listed price taken from the catalogue at 1 USD = ${PKR_RATE} PKR.`,
    `Fuel economy of ${input.efficiency} ${result.efficiencyUnit}${car.mileage_kmpl ? " (from catalogue data)" : " (segment estimate — no catalogue value)"}.`,
    `${result.isElectric ? "Electricity" : "Fuel"} price of ${Math.round(input.fuelPrice).toLocaleString()} ${result.fuelPriceUnit}, held constant for ${input.years} year(s).`,
    `Maintenance estimated at ~${(OWNERSHIP_DEFAULTS.maintenanceRateOfPrice * 100).toFixed(1)}% and insurance at ~${(OWNERSHIP_DEFAULTS.insuranceRateOfPrice * 100).toFixed(1)}% of vehicle price per year (editable above).`,
    `Driving ${Math.round(input.yearlyKm).toLocaleString()} km per year (${Math.round(result.totalKm).toLocaleString()} km total).`,
    `Excludes financing, depreciation, resale value and accident repairs. ${fuel === "hybrid" ? "Hybrid economy varies significantly with city/highway mix." : ""}`.trim(),
  ];
}
