import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, Fuel, Wrench, ShieldCheck, Receipt, Info, RotateCcw } from "lucide-react";
import type { Car } from "@/lib/types";
import { formatPKRShort } from "@/lib/importDuty";
import {
  buildAssumptions,
  calcOwnership,
  getDefaultInputs,
  type OwnershipInputs,
} from "@/lib/ownershipCost";

interface Props {
  car: Car;
  isOpen: boolean;
  onClose: () => void;
}

const inputClass =
  "w-full bg-secondary text-foreground border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
const labelClass = "text-[11px] font-medium text-muted-foreground mb-1 block uppercase tracking-wider";

const ICONS: Record<string, typeof Fuel> = {
  fuel: Fuel,
  maintenance: Wrench,
  insurance: ShieldCheck,
  other: Receipt,
};

export default function OwnershipCostDialog({ car, isOpen, onClose }: Props) {
  const defaults = useMemo(() => getDefaultInputs(car), [car]);
  const [form, setForm] = useState<OwnershipInputs>(defaults);

  const fields: { key: keyof OwnershipInputs; label: string; min: number; max: number; step?: number }[] = [
    { key: "years", label: "Ownership period (years)", min: 1, max: 15 },
    { key: "yearlyKm", label: "Distance per year (km)", min: 0, max: 200000, step: 500 },
    { key: "efficiency", label: `Fuel economy`, min: 0.1, max: 100, step: 0.1 },
    { key: "fuelPrice", label: "Fuel price", min: 0, max: 5000 },
    { key: "maintenanceYearly", label: "Maintenance / year (PKR)", min: 0, max: 100000000, step: 1000 },
    { key: "insuranceYearly", label: "Insurance / year (PKR)", min: 0, max: 100000000, step: 1000 },
    { key: "otherYearly", label: "Other expenses / year (PKR)", min: 0, max: 100000000, step: 1000 },
  ];

  const invalid = fields.some((f) => {
    const v = form[f.key];
    return !Number.isFinite(v) || v < f.min || v > f.max;
  });

  const result = useMemo(() => calcOwnership(car, form), [car, form]);
  const assumptions = useMemo(() => buildAssumptions(car, form, result), [car, form, result]);

  const setField = (key: keyof OwnershipInputs, raw: string) => {
    const v = raw === "" ? 0 : Number(raw.replace(/[^\d.]/g, ""));
    setForm((p) => ({ ...p, [key]: Number.isFinite(v) ? v : 0 }));
  };

  const share = (n: number) => (result.runningTotal > 0 ? (n / result.runningTotal) * 100 : 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-background/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className="glass w-full max-w-4xl rounded-2xl border border-border/40 my-4 sm:my-0"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-border/30">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-primary font-semibold flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5" /> Ownership Cost Predictor
                </p>
                <h2 className="text-lg sm:text-xl font-grotesk font-bold mt-1 truncate">{car.name}</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Estimated running costs · Listed at {formatPKRShort(result.vehiclePricePKR)}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-0">
              {/* Inputs */}
              <div className="p-5 sm:p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-border/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your Inputs</h3>
                  <button
                    onClick={() => setForm(defaults)}
                    className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <div key={f.key}>
                      <label className={labelClass} htmlFor={`own-${f.key}`}>
                        {f.key === "efficiency"
                          ? `Efficiency (${result.efficiencyUnit})`
                          : f.key === "fuelPrice"
                          ? `${result.isElectric ? "Electricity" : "Fuel"} price (${result.fuelPriceUnit})`
                          : f.label}
                      </label>
                      <input
                        id={`own-${f.key}`}
                        type="number"
                        inputMode="decimal"
                        min={f.min}
                        max={f.max}
                        step={f.step ?? 1}
                        value={Number.isFinite(form[f.key]) ? form[f.key] : 0}
                        onChange={(e) => setField(f.key, e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>

                {invalid && (
                  <p className="text-xs text-destructive">
                    Please enter valid positive values within the allowed range.
                  </p>
                )}

                {/* Assumptions */}
                <div className="rounded-xl bg-secondary/40 border border-border/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5 mb-2">
                    <Info className="w-3.5 h-3.5 text-primary" /> Assumptions Used
                  </p>
                  <ul className="space-y-1.5">
                    {assumptions.map((a) => (
                      <li key={a} className="text-[11px] text-muted-foreground leading-relaxed flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Results */}
              <div className="p-5 sm:p-6 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Estimated Breakdown
                </h3>

                <div className="space-y-2">
                  {result.lines.map((l) => {
                    const Icon = ICONS[l.key] ?? Receipt;
                    return (
                      <div
                        key={l.key}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{l.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{l.hint}</p>
                          <div className="h-1 mt-1.5 rounded-full bg-border/40 overflow-hidden">
                            <div
                              className="h-full bg-primary/60"
                              style={{ width: `${Math.min(100, share(l.amountPKR)).toFixed(1)}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-sm font-grotesk font-bold text-foreground whitespace-nowrap">
                          {formatPKRShort(l.amountPKR)}
                        </p>
                      </div>
                    );
                  })}
                </div>
                
                {/* Total Running Costs */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Estimated Total Running Costs ({form.years} yr)
                  </p>
                  <p className="text-2xl sm:text-3xl font-grotesk font-bold text-gradient-gold mt-1">
                    {formatPKRShort(result.runningTotal)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Running costs only · Vehicle purchase price excluded.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Annual", value: formatPKRShort(result.annual) },
                    { label: "Monthly", value: formatPKRShort(result.monthly) },
                    {
                      label: "Per km",
                      value: `PKR ${result.perKm > 0 ? result.perKm.toFixed(1) : "0.0"}`,
                    },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-secondary/40 border border-border/30 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                      <p className="text-sm font-grotesk font-bold text-foreground mt-1 break-words">{s.value}</p>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  All figures are estimates for guidance only, calculated from your inputs and catalogue data. They are
                  not quotations and exclude financing, depreciation and resale value.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
