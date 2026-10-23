import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { Anchor, BadgeCheck, Building2, Info, Landmark, RefreshCw, RotateCcw, ShieldAlert, ShoppingCart } from "lucide-react";
import { calcEstimate, getEngineIdx, ENGINE_SIZES, YEAR_DEPRECIATION, PKR_RATE } from "@/lib/importDuty";
import { IMPORT_RULES } from "@/config/importRules";
import ImportEstimateCard from "@/components/ImportEstimateCard";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const EASE = [0.22, 1, 0.36, 1] as const;
const CURRENCIES = Object.keys(IMPORT_RULES.exchangeRates);
const DEFAULT_YEAR = "2025";
const PRESETS = [
  { label: "1 crore", value: "10000000" },
  { label: "2.5 crore", value: "25000000" },
  { label: "5 crore", value: "50000000" },
  { label: "10 crore", value: "100000000" },
];

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

// Pakistani buyers think in lakh and crore, so show it next to the raw number
function inWords(n: number) {
  if (n >= 1e7) return `${+(n / 1e7).toFixed(2)} crore`;
  if (n >= 1e5) return `${+(n / 1e5).toFixed(2)} lakh`;
  return "";
}

// Digits and a single decimal point only
const cleanNumber = (v: string) => v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");

const fieldShell =
  "rounded-2xl border border-border/50 bg-secondary/40 transition-all duration-300 hover:border-border focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/30 focus-within:bg-secondary/60";

/* -------------------------------------------------------------------------- */
/*  Small pieces (outside the page component so inputs never remount)         */
/* -------------------------------------------------------------------------- */

/** Panel with a soft gold light that follows the cursor across its surface. */
function GlowPanel({ children, className = "", label }: { children: ReactNode; className?: string; label: string }) {
  const x = useMotionValue(-500);
  const y = useMotionValue(-500);
  const sx = useSpring(x, { stiffness: 140, damping: 22 });
  const sy = useSpring(y, { stiffness: 140, damping: 22 });
  const glow = useMotionTemplate`radial-gradient(340px circle at ${sx}px ${sy}px, hsl(var(--primary) / 0.14), transparent 70%)`;

  const onMove = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - r.left);
    y.set(e.clientY - r.top);
  };

  return (
    <section
      aria-label={label}
      onMouseMove={onMove}
      onMouseLeave={() => {
        x.set(-500);
        y.set(-500);
      }}
      className={`relative overflow-hidden ${className}`}
    >
      <motion.div aria-hidden style={{ background: glow }} className="pointer-events-none absolute inset-0 hidden md:block" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="relative">{children}</div>
    </section>
  );
}

function ChipGroup({
  legend,
  name,
  value,
  options,
  onChange,
  gridClass,
}: {
  legend: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  gridClass: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm text-foreground/90 mb-2.5">{legend}</legend>
      <div className={`grid gap-2 ${gridClass}`}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <label key={o.value} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={active}
                onChange={() => onChange(o.value)}
                className="peer sr-only"
              />
              <span
                className={`relative flex h-full items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm transition-colors duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 ${
                  active
                    ? "border-primary/70 font-medium text-primary"
                    : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {/* One gold highlight that glides between options */}
                {active && (
                  <motion.span
                    layoutId={`chip-${name}`}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-xl bg-primary/12 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.55)]"
                  />
                )}
                <span className="relative">{o.label}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** The signature moment: a route that lights up stage by stage as the estimate forms. */
function Journey({ stage }: { stage: 0 | 1 | 2 }) {
  const steps = [
    { icon: ShoppingCart, label: "Purchase" },
    { icon: Anchor, label: "Shipping" },
    { icon: Landmark, label: "Customs" },
    { icon: Building2, label: "Port clearance" },
    { icon: BadgeCheck, label: "Delivered" },
  ];
  // stage 0 = nothing entered, 1 = price entered, 2 = full estimate
  const lit = stage === 0 ? 0 : stage === 1 ? 1 : steps.length;
  const fill = lit <= 1 ? 0 : (lit - 1) / (steps.length - 1);

  return (
    <div className="relative mb-10 md:mb-12" role="img" aria-label="Import journey from purchase to delivery">
      <div className="absolute left-[10%] right-[10%] top-6 h-px bg-border/40" />
      <motion.div
        animate={{ scaleX: fill }}
        transition={{ duration: 1.4, ease: EASE }}
        className="absolute left-[10%] right-[10%] top-6 h-px origin-left bg-gradient-to-r from-primary/60 to-primary shadow-[0_0_12px_hsl(var(--primary)/0.8)]"
      />
      <ol className="relative grid grid-cols-5">
        {steps.map((s, i) => {
          const on = i < lit;
          return (
            <li key={s.label} className="flex flex-col items-center gap-3 text-center">
              <motion.span
                animate={{
                  scale: on ? 1 : 0.92,
                  borderColor: on ? "hsl(var(--primary))" : "hsl(var(--border) / 0.5)",
                }}
                transition={{ duration: 0.5, delay: on && lit > 1 ? i * 0.22 : 0 }}
                className={`flex h-12 w-12 items-center justify-center rounded-full border bg-background transition-shadow duration-700 ${
                  on ? "shadow-[0_0_22px_-2px_hsl(var(--primary)/0.6)]" : ""
                }`}
              >
                <s.icon className={`h-5 w-5 transition-colors duration-500 ${on ? "text-primary" : "text-muted-foreground/60"}`} aria-hidden="true" />
              </motion.span>
              <span className={`text-[11px] md:text-xs transition-colors duration-500 ${on ? "text-foreground" : "text-muted-foreground/60"}`}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function LedgerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="group flex items-baseline justify-between gap-4 border-b border-dashed border-border/40 py-2.5 last:border-0 transition-colors hover:border-primary/40">
      <dt className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-foreground transition-colors group-hover:text-primary">{value}</dd>
    </div>
  );
}

function LedgerColumn({
  title,
  intro,
  index,
  children,
}: {
  title: string;
  intro: string;
  index: number;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay: index * 0.12, ease: EASE }}
      className="p-6 md:p-8"
    >
      <h3 className="font-grotesk text-lg font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4 max-w-[34ch]">{intro}</p>
      <dl>{children}</dl>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ImportEstimator() {
  const reduceMotion = useReducedMotion();
  const [searchParams] = useSearchParams();

  const [currency, setCurrency] = useState<string>("PKR");
  const [fxRate, setFxRate] = useState<string>(String(IMPORT_RULES.exchangeRates.PKR));
  const [amount, setAmount] = useState<string>("");
  const [engineIdx, setEngineIdx] = useState(0);
  const [year, setYear] = useState(DEFAULT_YEAR);

  // Deep links from car pages: ?price=...&engine=...&year=...
  useEffect(() => {
    const priceParam = searchParams.get("price");
    const engineParam = searchParams.get("engine");
    const yearParam = searchParams.get("year");

    if (priceParam) {
      setCurrency("PKR");
      setFxRate("1");
      setAmount(cleanNumber(priceParam));
    }
    if (engineParam) setEngineIdx(getEngineIdx(parseInt(engineParam)));
    if (yearParam && YEAR_DEPRECIATION[yearParam] !== undefined) setYear(yearParam);
  }, [searchParams]);

  const rate = parseFloat(fxRate) || 0;
  const price = Math.max(0, (parseFloat(amount) || 0) * rate);

  // The estimate updates live as inputs change
  const result = useMemo(
    () => (price > 0 ? calcEstimate(price, engineIdx, year) : null),
    [price, engineIdx, year],
  );

  const stage: 0 | 1 | 2 = result ? 2 : price > 0 ? 1 : 0;

  const handleCurrency = (c: string) => {
    setCurrency(c);
    setFxRate(String(IMPORT_RULES.exchangeRates[c] ?? 1));
  };

  const dirty = amount !== "" || engineIdx !== 0 || year !== DEFAULT_YEAR || currency !== "PKR";
  const reset = () => {
    setCurrency("PKR");
    setFxRate(String(IMPORT_RULES.exchangeRates.PKR));
    setAmount("");
    setEngineIdx(0);
    setYear(DEFAULT_YEAR);
  };

  const blueprintRows = [
    "Assessed value after depreciation",
    "Custom duty",
    ...IMPORT_RULES.taxes.map((t) => t.label),
    "Insurance",
    "Port clearance",
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative overflow-hidden">
        {/* Ambient gold light behind the page */}
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />
        <div aria-hidden className="pointer-events-none absolute top-[40%] -right-40 h-[420px] w-[420px] rounded-full bg-primary/5 blur-[120px]" />

        <div className="container relative mx-auto max-w-7xl px-4 py-12 md:py-20">
          {/* Header */}
          <header className="mx-auto mb-14 max-w-3xl text-center md:mb-16">
            <h1 className="font-grotesk text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
              <span className="block overflow-hidden pb-[0.08em]">
                <motion.span
                  initial={reduceMotion ? false : { y: "115%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 1, delay: 0.1, ease: EASE }}
                  className="block"
                >
                  Import duty
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[0.08em]">
                <motion.span
                  initial={reduceMotion ? false : { y: "115%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 1, delay: 0.25, ease: EASE }}
                  className="block text-gradient-gold gold-text-glow"
                >
                  estimator
                </motion.span>
              </span>
            </h1>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.6, ease: EASE }}
              className="mx-auto mt-6 max-w-xl text-base font-light leading-relaxed text-muted-foreground md:text-lg"
            >
              See the full landed cost of bringing a car into Pakistan: customs duty, taxes, shipping and port clearance in
              one breakdown.
            </motion.p>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/30 px-4 py-1.5 text-xs tabular-nums text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              Rules version {IMPORT_RULES.version}, reviewed {IMPORT_RULES.updated}
            </motion.p>
          </header>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.8, ease: EASE }}
          >
            <Journey stage={stage} />
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1, ease: EASE }}
            className="grid items-start gap-8 lg:grid-cols-[26rem_minmax(0,1fr)]"
          >
            {/* ------------------------------ Inputs ------------------------------ */}
            <GlowPanel label="Vehicle details" className="glass-strong rounded-3xl lg:sticky lg:top-28">
              <div className="space-y-7 p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="font-grotesk text-xl font-semibold">Your car</h2>
                  <AnimatePresence>
                    {dirty && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        type="button"
                        onClick={reset}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                <ChipGroup
                  legend="Price currency"
                  name="currency"
                  value={currency}
                  onChange={handleCurrency}
                  options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  gridClass="grid-cols-3 sm:grid-cols-4"
                />

                <div>
                  <label htmlFor="price" className="mb-2.5 block text-sm text-foreground/90">
                    Car price
                  </label>
                  <div className={`flex items-baseline gap-3 px-5 py-4 ${fieldShell}`}>
                    <span className="text-sm font-medium text-primary">{currency}</span>
                    <input
                      id="price"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder={currency === "PKR" ? "50,000,000" : "25,000"}
                      value={amount}
                      onChange={(e) => setAmount(cleanNumber(e.target.value))}
                      className="w-full min-w-0 bg-transparent font-grotesk text-3xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/30"
                    />
                  </div>

                  {currency === "PKR" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {PRESETS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setAmount(p.value)}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                            amount === p.value
                              ? "border-primary/70 text-primary bg-primary/10"
                              : "border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 min-h-[1.25rem] text-xs text-muted-foreground tabular-nums" aria-live="polite">
                    {price > 0 &&
                      `PKR ${fmt(price)}${inWords(price) ? ` (${inWords(price)})` : ""}, about $${fmt(price / PKR_RATE)} USD`}
                  </p>
                </div>

                <AnimatePresence initial={false}>
                  {currency !== "PKR" && (
                    <motion.div
                      key="fx"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <label htmlFor="fx" className="mb-2.5 flex items-center gap-1.5 text-sm text-foreground/90">
                        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        Exchange rate, 1 {currency} in PKR
                      </label>
                      <div className={`px-4 py-3 ${fieldShell}`}>
                        <input
                          id="fx"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={fxRate}
                          onChange={(e) => setFxRate(cleanNumber(e.target.value))}
                          className="w-full bg-transparent text-sm tabular-nums outline-none"
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Default is {IMPORT_RULES.exchangeRates[currency]}. Change it if your bank's rate is different.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <ChipGroup
                  legend="Engine size"
                  name="engine"
                  value={String(engineIdx)}
                  onChange={(v) => setEngineIdx(Number(v))}
                  options={ENGINE_SIZES.map((es, i) => ({ value: String(i), label: es.label }))}
                  gridClass="grid-cols-2"
                />

                <ChipGroup
                  legend="Manufacturing year"
                  name="year"
                  value={year}
                  onChange={setYear}
                  options={Object.keys(YEAR_DEPRECIATION).map((y) => ({ value: y, label: y }))}
                  gridClass="grid-cols-4"
                />

                <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Estimates are approximate and based on current FBR customs tariffs. Actual costs may vary.
                </p>
              </div>
            </GlowPanel>

            {/* ------------------------------ Results ------------------------------ */}
            <div className="min-w-0 space-y-6">
              <AnimatePresence mode="wait" initial={false}>
                {result ? (
                  <motion.div
                    key="result"
                    initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                  >
                    <ImportEstimateCard pricePKR={price} engineIdx={engineIdx} year={year} result={result} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="glass relative overflow-hidden rounded-3xl p-6 md:p-10"
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                    <h2 className="mb-2 font-grotesk text-2xl font-semibold">Your breakdown appears here</h2>
                    <p className="mb-8 max-w-md text-sm leading-relaxed text-muted-foreground">
                      Enter a car price and the estimate builds line by line, from assessed value to total landed cost.
                    </p>
                    <dl className="max-w-xl" aria-hidden="true">
                      {blueprintRows.map((label, i) => (
                        <motion.div
                          key={label}
                          initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.6, delay: 1.1 + i * 0.07, ease: EASE }}
                          className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/40 py-3"
                        >
                          <dt className="text-sm text-muted-foreground/70">{label}</dt>
                          <dd className="relative h-2 w-24 overflow-hidden rounded-full bg-muted-foreground/10">
                            {/* shimmer placeholder instead of dashes */}
                            <motion.span
                              animate={{ x: ["-100%", "100%"] }}
                              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                            />
                          </dd>
                        </motion.div>
                      ))}
                      <div className="flex items-baseline justify-between gap-4 pt-5">
                        <dt className="font-grotesk text-base font-semibold text-foreground/80">Total landed cost</dt>
                        <dd className="relative h-3 w-32 overflow-hidden rounded-full bg-primary/10">
                          <motion.span
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                          />
                        </dd>
                      </div>
                    </dl>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="flex items-start gap-2.5 px-1 text-xs leading-relaxed text-muted-foreground">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden="true" />
                <span>
                  <span className="font-medium text-foreground/80">Disclaimer. </span>
                  {IMPORT_RULES.disclaimer}
                </span>
              </p>
            </div>
          </motion.div>

          {/* ---------------------------- Rules ledger ---------------------------- */}
          <section className="mt-20 md:mt-32" aria-labelledby="rules-title">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.8, ease: EASE }}
              className="mb-8 max-w-2xl"
            >
              <h2 id="rules-title" className="mb-2 font-grotesk text-3xl font-bold md:text-4xl">
                How the estimate is built
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The rules behind every number above, taken from {IMPORT_RULES.source}.
              </p>
            </motion.div>

            <div className="glass relative grid divide-y divide-border/40 overflow-hidden rounded-3xl md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <LedgerColumn
                index={0}
                title="Custom duty"
                intro="Charged on the depreciated assessed value, at a rate set by engine size."
              >
                {IMPORT_RULES.engineBands.map((es) => (
                  <LedgerRow key={es.label} label={es.label} value={`${(es.dutyRate * 100).toFixed(0)}%`} />
                ))}
              </LedgerColumn>

              <LedgerColumn
                index={1}
                title="Taxes"
                intro="Sales and additional tax apply on assessed value plus custom duty. Withholding tax applies on assessed value."
              >
                {IMPORT_RULES.taxes.map((t) => (
                  <LedgerRow key={t.key} label={t.label} value={`${(t.rate * 100).toFixed(0)}%`} />
                ))}
              </LedgerColumn>

              <LedgerColumn
                index={2}
                title="Shipping and clearance"
                intro={`Depreciation is applied per model year, up to ${(IMPORT_RULES.maxDepreciation * 100).toFixed(0)}%, before duty is calculated.`}
              >
                <LedgerRow label="Shipping (CIF)" value="$1.2k to $2.5k" />
                <LedgerRow label="Insurance" value={`${(IMPORT_RULES.insuranceRate * 100).toFixed(1)}%`} />
                <LedgerRow label="Port clearance" value={`about PKR ${(IMPORT_RULES.portClearancePKR / 100000).toFixed(1)}L`} />
              </LedgerColumn>
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Used vehicles up to 5 years old are eligible under personal baggage, gift and TR schemes.
            </p>
          </section>
        </div>
      </div>
    </MotionConfig>
  );
}