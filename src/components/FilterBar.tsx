import { Search, X, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import type { FilterState } from "@/lib/types";

interface FilterBarProps {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  search: string;
  setSearch: (s: string) => void;
  brands: string[];
  categories: string[];
}

const selectClass =
  "bg-secondary/50 text-secondary-foreground border border-border/40 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary hover:border-primary/40 transition-colors cursor-pointer";

const ENGINE_OPTIONS = [
  { label: "All Engines", value: "" },
  { label: "≤ 1500cc", value: "0-1500" },
  { label: "1500 – 2500cc", value: "1500-2500" },
  { label: "2500 – 4000cc", value: "2500-4000" },
  { label: "4000cc+", value: "4000-99999" },
];

const AVAILABILITY_OPTIONS = [
  { label: "All Availability", value: "" },
  { label: "In Showroom", value: "in_showroom" },
  { label: "Available on Import", value: "available_on_import" },
  { label: "Sold Out", value: "sold_out" },
];

// Budget slider works in PKR Lakhs (1 Lakh = 100,000 PKR).
// Internally we still store priceRange in USD (matches DB price column / formatPKR).
const PKR_PER_USD = 280;
const MIN_LAKH = 0;
const MAX_LAKH = 2000; // up to 20 Cr
const STEP_LAKH = 5;
const MAX_USD = 10_000_000; // sentinel = "no upper limit"

const usdToLakh = (usd: number) => Math.round((usd * PKR_PER_USD) / 100_000);
const lakhToUsd = (lakh: number) => Math.round((lakh * 100_000) / PKR_PER_USD);

function formatLakh(lakh: number): string {
  if (lakh >= 100) {
    const cr = lakh / 100;
    return `${cr % 1 === 0 ? cr : cr.toFixed(1)} Cr`;
  }
  return `${lakh} Lakh`;
}

export default function FilterBar({ filters, setFilters, search, setSearch, brands, categories }: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters({ ...filters, [key]: value });

  const minLakh = filters.priceRange[0] === 0 ? 0 : usdToLakh(filters.priceRange[0]);
  const maxLakh =
    filters.priceRange[1] >= MAX_USD ? MAX_LAKH : Math.min(MAX_LAKH, usdToLakh(filters.priceRange[1]));

  const isPriceFiltered = filters.priceRange[0] > 0 || filters.priceRange[1] < MAX_USD;

  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.brand ? 1 : 0) +
    (filters.fuel_type ? 1 : 0) +
    (filters.engineRange ? 1 : 0) +
    (filters.availability ? 1 : 0) +
    (isPriceFiltered ? 1 : 0) +
    (search ? 1 : 0);

  const reset = () => {
    setFilters({
      category: "", brand: "", fuel_type: "", transmission: "",
      priceRange: [0, MAX_USD], sortBy: "newest",
      engineRange: "", availability: "",
    });
    setSearch("");
  };

  return (
    <div className="glass rounded-2xl p-4 sm:p-5 mb-8 border border-border/30">
      {/* Row 1: search + sort + advanced toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, or model..."
            className="w-full bg-secondary/50 text-foreground border border-border/40 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground hover:border-primary/40 transition-colors"
          />
        </div>

        <select value={filters.sortBy} onChange={(e) => update("sortBy", e.target.value)} className={selectClass}>
          <option value="newest">Newest First</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
          <option value="hp_desc">Most Powerful</option>
        </select>

        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
            showAdvanced || activeCount > 0
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-secondary/50 text-foreground border-border/40 hover:border-primary/40"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Budget slider — always visible (smart filtering) */}
      <div className="mt-4 pt-4 border-t border-border/30">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Budget</p>
            <p className="text-sm font-grotesk font-bold text-foreground">
              Show cars under{" "}
              <span className="text-gradient-gold">{formatLakh(maxLakh)}</span>
              {minLakh > 0 && (
                <span className="text-muted-foreground font-normal text-xs">
                  {" "}· from {formatLakh(minLakh)}
                </span>
              )}
            </p>
          </div>
          {isPriceFiltered && (
            <button
              onClick={() => update("priceRange", [0, MAX_USD])}
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              Reset budget
            </button>
          )}
        </div>
        <Slider
          value={[minLakh, maxLakh]}
          onValueChange={([newMin, newMax]) => {
            const upper = newMax >= MAX_LAKH ? MAX_USD : lakhToUsd(newMax);
            update("priceRange", [lakhToUsd(newMin), upper]);
          }}
          min={MIN_LAKH}
          max={MAX_LAKH}
          step={STEP_LAKH}
          className="my-2"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-1">
          <span>0</span>
          <span>5 Cr</span>
          <span>10 Cr</span>
          <span>15 Cr</span>
          <span>20 Cr+</span>
        </div>
      </div>

      {/* Row 2: advanced filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Brand</label>
            <select value={filters.brand} onChange={(e) => update("brand", e.target.value)} className={selectClass}>
              <option value="">All Brands</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
            <select value={filters.category} onChange={(e) => update("category", e.target.value)} className={selectClass}>
              <option value="">All Types</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fuel</label>
            <select value={filters.fuel_type} onChange={(e) => update("fuel_type", e.target.value)} className={selectClass}>
              <option value="">All Fuels</option>
              <option value="gasoline">Gasoline</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Engine</label>
            <select value={filters.engineRange} onChange={(e) => update("engineRange", e.target.value)} className={selectClass}>
              {ENGINE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Availability</label>
            <select value={filters.availability} onChange={(e) => update("availability", e.target.value)} className={selectClass}>
              {AVAILABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
