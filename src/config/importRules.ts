/**
 * Pakistan vehicle-import rules configuration.
 *
 * This is the single source of truth for every duty, tax, logistics and
 * depreciation number used by the Import Cost Estimator. Update the values
 * here when FBR notifications change — no calculation code needs to change.
 *
 * NOTE: these are indicative rates compiled from public FBR SRO guidance.
 * They are NOT an official tariff feed.
 */

export interface EngineBand {
  /** Human label shown in the UI */
  label: string;
  /** Inclusive lower bound in cc */
  minCC: number;
  /** Inclusive upper bound in cc (Infinity for the top band) */
  maxCC: number;
  /** Representative cc used for shipping tier selection */
  nominalCC: number;
  /** Customs duty rate applied to the assessed value */
  dutyRate: number;
}

export interface TaxRule {
  key: string;
  label: string;
  rate: number;
  /** What the rate is applied to */
  base: "assessed" | "assessed_plus_duty";
  hint?: string;
}

export interface ShippingTier {
  /** Applies when nominal cc <= maxCC */
  maxCC: number;
  amountUSD: number;
}

export interface ImportRules {
  version: string;
  /** Last time these figures were reviewed */
  updated: string;
  source: string;
  baseCurrency: "PKR";
  /** Indicative FX rates: 1 unit of currency -> PKR. User-overridable in the UI. */
  exchangeRates: Record<string, number>;
  engineBands: EngineBand[];
  /** Depreciation applied to the new-vehicle value, keyed by model year */
  depreciationByYear: Record<string, number>;
  /** Fallback when the model year is older than the table */
  maxDepreciation: number;
  taxes: TaxRule[];
  shippingTiers: ShippingTier[];
  /** Marine insurance rate on assessed value */
  insuranceRate: number;
  /** Flat port handling / clearing agent fee in PKR */
  portClearancePKR: number;
  disclaimer: string;
}

export const IMPORT_RULES: ImportRules = {
  version: "2026.1",
  updated: "2026-01",
  source: "FBR SRO 577(I)/2005 and subsequent amendments",
  baseCurrency: "PKR",

  exchangeRates: {
    PKR: 1,
    USD: 280,
    JPY: 1.85,
    AED: 76,
    GBP: 355,
    EUR: 305,
  },

  engineBands: [
    { label: "660cc – 1000cc", minCC: 0, maxCC: 1000, nominalCC: 800, dutyRate: 0.5 },
    { label: "1001cc – 1300cc", minCC: 1001, maxCC: 1300, nominalCC: 1200, dutyRate: 0.6 },
    { label: "1301cc – 1500cc", minCC: 1301, maxCC: 1500, nominalCC: 1400, dutyRate: 0.75 },
    { label: "1501cc – 1800cc", minCC: 1501, maxCC: 1800, nominalCC: 1600, dutyRate: 1.0 },
    { label: "1801cc – 2500cc", minCC: 1801, maxCC: 2500, nominalCC: 2000, dutyRate: 1.25 },
    { label: "2501cc – 3000cc", minCC: 2501, maxCC: 3000, nominalCC: 2800, dutyRate: 1.5 },
    { label: "3001cc+", minCC: 3001, maxCC: Infinity, nominalCC: 3500, dutyRate: 2.0 },
  ],

  depreciationByYear: {
    "2026": 0,
    "2025": 0.05,
    "2024": 0.1,
    "2023": 0.15,
    "2022": 0.2,
    "2021": 0.25,
    "2020": 0.3,
    "2019": 0.35,
  },
  maxDepreciation: 0.5,

  taxes: [
    { key: "salesTax", label: "Sales Tax", rate: 0.17, base: "assessed_plus_duty", hint: "17% on value + duty" },
    { key: "additionalTax", label: "Additional Sales Tax", rate: 0.07, base: "assessed_plus_duty", hint: "7% on value + duty" },
    { key: "withholdingTax", label: "Withholding Tax", rate: 0.06, base: "assessed", hint: "6% on assessed value" },
  ],

  shippingTiers: [
    { maxCC: 1500, amountUSD: 1200 },
    { maxCC: 2500, amountUSD: 1800 },
    { maxCC: Infinity, amountUSD: 2500 },
  ],

  insuranceRate: 0.012,
  portClearancePKR: 150000,

  disclaimer:
    "This is an indicative estimate for planning purposes only. Figures are based on publicly available FBR guidance and may not reflect the latest notifications, auction/assessed values, exchange rates, port charges or clearing-agent fees. Always confirm the final payable amount with a licensed customs clearing agent before committing to an import.",
};
