import { motion } from "framer-motion";
import { Car, FileText, DollarSign, Ship, Info, Receipt, Shield, Anchor, TrendingDown, Sparkles } from "lucide-react";
import {
  calcEstimate,
  formatPKRShort,
  ENGINE_SIZES,
  YEAR_DEPRECIATION,
  PKR_RATE,
  type EstimateResult,
} from "@/lib/importDuty";
import { IMPORT_RULES } from "@/config/importRules";

interface Props {
  pricePKR: number;
  engineIdx: number;
  year: string;
  result?: EstimateResult;
}

export default function ImportEstimateCard({ pricePKR, engineIdx, year, result: providedResult }: Props) {
  const result = providedResult ?? calcEstimate(pricePKR, engineIdx, year);

  const sections = [
    {
      title: "Vehicle Value",
      items: [
        { label: "Assessed Value", value: result.assessedPKR, icon: Car, hint: "After depreciation" },
      ],
    },
    {
      title: "Duties & Taxes",
      accent: true,
      items: [
        { label: `Custom Duty`, value: result.customDuty, icon: FileText, hint: `${(result.dutyRate * 100).toFixed(0)}% rate` },
        { label: "Sales Tax", value: result.salesTax, icon: Receipt, hint: "17%" },
        { label: "Additional Tax", value: result.additionalTax, icon: Receipt, hint: "7%" },
        { label: "Withholding Tax", value: result.witholdingTax, icon: DollarSign, hint: "6%" },
      ],
    },
    {
      title: "Logistics",
      items: [
        { label: "Shipping (CIF)", value: result.shippingPKR, icon: Ship, hint: "Sea freight" },
        { label: "Insurance", value: result.insurancePKR, icon: Shield, hint: "1.2%" },
        { label: "Port Clearance", value: result.clearancePKR, icon: Anchor, hint: "Agent fees" },
      ],
    },
  ];

  const dutyPercent = pricePKR > 0 ? (result.totalDutyTaxes / pricePKR) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Hero total card */}
      <div className="relative overflow-hidden rounded-3xl glass border border-primary/20 hover:border-primary/40 transition-all duration-500 group">
        {/* Decorative gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-60 group-hover:opacity-90 transition-opacity duration-700 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-[11px] text-primary font-semibold uppercase tracking-[0.2em]">
              Estimated Total Landed Cost
            </p>
          </div>

          <p className="text-4xl sm:text-5xl md:text-6xl font-grotesk font-bold text-gradient-gold gold-text-glow mb-2 break-words leading-[1.05]">
            {formatPKRShort(result.totalLandedPKR)}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>≈ ${Math.round(result.totalLandedPKR / PKR_RATE).toLocaleString()} USD</span>
            <span className="w-1 h-1 rounded-full bg-border/60" />
            <span className="inline-flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-primary/70" />
              Duties add {dutyPercent.toFixed(0)}% over base
            </span>
          </div>

          {/* Quick split bar */}
          <div className="mt-5 flex items-center gap-1.5 h-2 rounded-full overflow-hidden bg-secondary/40">
            <div
              className="h-full bg-gradient-to-r from-foreground/70 to-foreground/40"
              style={{ width: `${(result.assessedPKR / result.totalLandedPKR) * 100}%` }}
              title="Vehicle value"
            />
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/60"
              style={{ width: `${(result.totalDutyTaxes / result.totalLandedPKR) * 100}%` }}
              title="Duties & taxes"
            />
            <div
              className="h-full bg-gradient-to-r from-accent/70 to-accent/40"
              style={{ width: `${((result.shippingPKR + result.insurancePKR + result.clearancePKR) / result.totalLandedPKR) * 100}%` }}
              title="Logistics"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-foreground/60" /> Vehicle</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-primary" /> Duties & Taxes</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-accent/70" /> Logistics</span>
          </div>
        </div>
      </div>

      {/* Sectioned breakdown */}
      <div className="grid gap-4">
        {sections.map((section, sIdx) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + sIdx * 0.08 }}
            className={`glass rounded-2xl p-5 sm:p-6 border transition-all duration-300 hover:-translate-y-0.5 ${
              section.accent
                ? "border-primary/25 hover:border-primary/50 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.4)]"
                : "border-border/30 hover:border-border/60"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xs font-grotesk font-semibold uppercase tracking-[0.18em] ${section.accent ? "text-primary" : "text-muted-foreground"}`}>
                {section.title}
              </h3>
              {section.accent && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  FBR
                </span>
              )}
            </div>

            <div className="space-y-1">
              {section.items.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + sIdx * 0.08 + i * 0.04 }}
                  className="group flex items-center justify-between gap-3 px-3 py-3 -mx-3 rounded-xl hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 ${
                      section.accent ? "bg-primary/15 text-primary" : "bg-secondary/70 text-foreground/70"
                    }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                      {item.hint && (
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{item.hint}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm font-semibold font-grotesk whitespace-nowrap ${section.accent ? "text-primary" : "text-foreground"}`}>
                    {formatPKRShort(item.value)}
                  </span>
                </motion.div>
              ))}
            </div>

            {section.accent && (
              <div className="mt-4 pt-4 border-t border-primary/15 flex items-center justify-between">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Subtotal</span>
                <span className="text-base font-grotesk font-bold text-primary">
                  {formatPKRShort(result.totalDutyTaxes)}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass rounded-2xl p-5 flex items-start gap-3 border border-border/30"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-primary" />
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
          <p>
            <strong className="text-foreground/90">Depreciation:</strong>{" "}
            {((result.depreciation ?? YEAR_DEPRECIATION[year] ?? 0.35) * 100).toFixed(0)}% applied for {year} model year.
          </p>
          <p>
            <strong className="text-foreground/90">Custom Duty:</strong>{" "}
            {(ENGINE_SIZES[engineIdx].dutyRate * 100).toFixed(0)}% on {ENGINE_SIZES[engineIdx].label} engines.
          </p>
          <p className="text-[11px] opacity-80">
            Indicative estimate based on {IMPORT_RULES.source} (rules v{IMPORT_RULES.version}). Final cost varies by
            auction value, exchange rate, port and clearing agent — confirm with a licensed clearing agent.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
