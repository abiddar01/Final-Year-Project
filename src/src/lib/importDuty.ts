// Import-duty calculation engine for Pakistan.
// All rates/rules live in src/config/importRules.ts — this file only computes.

import { IMPORT_RULES, type ImportRules } from "@/config/importRules";

/** Default USD -> PKR rate (kept for backwards compatibility). */
export const PKR_RATE = IMPORT_RULES.exchangeRates.USD;

/** Engine bands in the legacy shape used across the UI. */
export const ENGINE_SIZES = IMPORT_RULES.engineBands.map((b) => ({
  label: b.label,
  value: b.nominalCC,
  dutyRate: b.dutyRate,
}));

export const YEAR_DEPRECIATION: Record<string, number> = IMPORT_RULES.depreciationByYear;

export function getEngineIdx(cc: number | null | undefined, rules: ImportRules = IMPORT_RULES): number {
  if (!cc || cc <= 0) return 0;
  const idx = rules.engineBands.findIndex((b) => cc <= b.maxCC);
  return idx === -1 ? rules.engineBands.length - 1 : idx;
}

export function getDepreciation(year: string, rules: ImportRules = IMPORT_RULES): number {
  const d = rules.depreciationByYear[year];
  return d === undefined ? rules.maxDepreciation : d;
}

export function convertToPKR(amount: number, currency: string, rate?: number): number {
  const fx = rate ?? IMPORT_RULES.exchangeRates[currency] ?? 1;
  return amount * fx;
}

export interface LineItem {
  key: string;
  label: string;
  amountPKR: number;
  hint?: string;
  group: "vehicle" | "duties" | "logistics";
}

export interface EstimateResult {
  assessedPKR: number;
  customDuty: number;
  salesTax: number;
  additionalTax: number;
  /** legacy spelling kept so existing components keep working */
  witholdingTax: number;
  withholdingTax: number;
  shippingPKR: number;
  insurancePKR: number;
  clearancePKR: number;
  totalDutyTaxes: number;
  totalLandedPKR: number;
  dutyRate: number;
  depreciation: number;
  lineItems: LineItem[];
  rulesVersion: string;
}

export function calcEstimate(
  pricePKR: number,
  engineIdx: number,
  year: string,
  rules: ImportRules = IMPORT_RULES
): EstimateResult {
  const band = rules.engineBands[engineIdx] ?? rules.engineBands[0];
  const depreciation = getDepreciation(year, rules);
  const assessedPKR = pricePKR * (1 - depreciation);

  const customDuty = assessedPKR * band.dutyRate;
  const assessedPlusDuty = assessedPKR + customDuty;

  const taxAmounts: Record<string, number> = {};
  for (const t of rules.taxes) {
    taxAmounts[t.key] = (t.base === "assessed" ? assessedPKR : assessedPlusDuty) * t.rate;
  }
  const salesTax = taxAmounts.salesTax ?? 0;
  const additionalTax = taxAmounts.additionalTax ?? 0;
  const withholdingTax = taxAmounts.withholdingTax ?? 0;

  const tier = rules.shippingTiers.find((t) => band.nominalCC <= t.maxCC) ?? rules.shippingTiers[rules.shippingTiers.length - 1];
  const shippingPKR = tier.amountUSD * rules.exchangeRates.USD;
  const insurancePKR = assessedPKR * rules.insuranceRate;
  const clearancePKR = rules.portClearancePKR;

  const totalDutyTaxes = customDuty + Object.values(taxAmounts).reduce((a, b) => a + b, 0);
  const totalLandedPKR = assessedPKR + totalDutyTaxes + shippingPKR + insurancePKR + clearancePKR;

  const lineItems: LineItem[] = [
    {
      key: "assessed",
      label: "Assessed Value",
      amountPKR: assessedPKR,
      hint: `${(depreciation * 100).toFixed(0)}% depreciation`,
      group: "vehicle",
    },
    {
      key: "customDuty",
      label: "Custom Duty",
      amountPKR: customDuty,
      hint: `${(band.dutyRate * 100).toFixed(0)}% • ${band.label}`,
      group: "duties",
    },
    ...rules.taxes.map((t) => ({
      key: t.key,
      label: t.label,
      amountPKR: taxAmounts[t.key],
      hint: t.hint,
      group: "duties" as const,
    })),
    { key: "shipping", label: "Shipping (CIF)", amountPKR: shippingPKR, hint: "Sea freight", group: "logistics" },
    {
      key: "insurance",
      label: "Insurance",
      amountPKR: insurancePKR,
      hint: `${(rules.insuranceRate * 100).toFixed(1)}%`,
      group: "logistics",
    },
    { key: "clearance", label: "Port Clearance", amountPKR: clearancePKR, hint: "Agent fees", group: "logistics" },
  ];

  return {
    assessedPKR,
    customDuty,
    salesTax,
    additionalTax,
    witholdingTax: withholdingTax,
    withholdingTax,
    shippingPKR,
    insurancePKR,
    clearancePKR,
    totalDutyTaxes,
    totalLandedPKR,
    dutyRate: band.dutyRate,
    depreciation,
    lineItems,
    rulesVersion: rules.version,
  };
}

export function formatPKRShort(n: number): string {
  if (!isFinite(n)) return "—";
  if (n >= 10000000) return `PKR ${(n / 10000000).toFixed(2)} Crore`;
  if (n >= 100000) return `PKR ${(n / 100000).toFixed(1)} Lakh`;
  return `PKR ${Math.round(n).toLocaleString()}`;
}
