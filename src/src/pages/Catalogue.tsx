import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { Car, RotateCcw, SearchX } from "lucide-react";
import CarCard from "@/components/CarCard";
import FilterBar from "@/components/FilterBar";
import type { Car as CarType, FilterState } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;

const DEFAULT_FILTERS: FilterState = {
  category: "",
  brand: "",
  fuel_type: "",
  transmission: "",
  priceRange: [0, 10000000],
  sortBy: "newest",
  engineRange: "",
  availability: "",
};

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

/** Thin gold reading-progress line at the top of the viewport. */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-primary/0 via-primary to-primary"
    />
  );
}

/** Placeholder card with a gold shimmer, shown while the fleet loads. */
function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: EASE }}
      className="glass relative overflow-hidden rounded-2xl"
      aria-hidden="true"
    >
      <div className="aspect-[4/3] bg-secondary/40" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-1/3 rounded-full bg-secondary/60" />
        <div className="h-5 w-3/4 rounded-full bg-secondary/60" />
        <div className="h-3 w-1/2 rounded-full bg-secondary/60" />
      </div>
      <motion.div
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: index * 0.1 }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
      />
    </motion.div>
  );
}

/** Count that rolls up/down when the number changes. */
function RollingNumber({ value }: { value: number }) {
  return (
    <span className="relative inline-flex h-[1.2em] overflow-hidden align-bottom tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function Catalogue() {
  const reduceMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showPill, setShowPill] = useState(false);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setShowPill(y > 520));

  const { data: cars, isLoading } = useQuery({
    queryKey: ["cars"],
    queryFn: async () => {
      const { data } = await supabase.from("cars").select("*");
      return (data ?? []) as CarType[];
    },
  });

  const brands = useMemo(() => [...new Set((cars ?? []).map((c) => c.brand))].sort(), [cars]);
  const categories = useMemo(() => [...new Set((cars ?? []).map((c) => c.category))].sort(), [cars]);
  const brandCounts = useMemo(() => {
    const m: Record<string, number> = {};
    (cars ?? []).forEach((c) => (m[c.brand] = (m[c.brand] ?? 0) + 1));
    return m;
  }, [cars]);

  const filtered = useMemo(() => {
    let result = cars ?? [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q) || c.model.toLowerCase().includes(q),
      );
    }
    if (filters.brand) result = result.filter((c) => c.brand === filters.brand);
    if (filters.category) result = result.filter((c) => c.category === filters.category);
    if (filters.fuel_type) result = result.filter((c) => c.fuel_type === filters.fuel_type);
    if (filters.transmission) result = result.filter((c) => c.transmission === filters.transmission);
    if (filters.availability) result = result.filter((c) => (c.availability_type || "in_showroom") === filters.availability);
    if (filters.engineRange) {
      const [min, max] = filters.engineRange.split("-").map(Number);
      result = result.filter((c) => {
        const cc = c.engine_size ?? 0;
        return cc >= min && cc <= max;
      });
    }
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000000) {
      result = result.filter((c) => c.price >= filters.priceRange[0] && c.price <= filters.priceRange[1]);
    }
    switch (filters.sortBy) {
      case "price_asc":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "hp_desc":
        result = [...result].sort((a, b) => (b.horsepower ?? 0) - (a.horsepower ?? 0));
        break;
      default:
        result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [cars, search, filters]);

  const isFiltered =
    search !== "" ||
    filters.brand !== "" ||
    filters.category !== "" ||
    filters.fuel_type !== "" ||
    filters.transmission !== "" ||
    filters.availability !== "" ||
    filters.engineRange !== "" ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 10000000;

  const resetAll = () => {
    setSearch("");
    setFilters(DEFAULT_FILTERS);
  };

  const setBrand = (b: string) => setFilters((f) => ({ ...f, brand: b }));
  const total = cars?.length ?? 0;

  return (
    <MotionConfig reducedMotion="user">
      <ScrollProgress />

      <div className="relative overflow-hidden">
        {/* Ambient light + faint blueprint grid behind the header */}
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 70% 100% at 50% 0%, black, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 100% at 50% 0%, black, transparent 75%)",
          }}
        />

        <div className="container relative mx-auto px-4 pb-20 pt-12 md:pt-20">
          {/* ------------------------------ Header ------------------------------ */}
          <header className="mb-10 md:mb-14">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE }}
              className="mb-6 inline-flex items-center gap-3 rounded-full border border-primary/20 px-4 py-2 glass"
            >
              <Car className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">
                {isLoading ? "Loading the collection" : (
                  <>
                    <span className="font-semibold text-foreground">{total}</span> vehicles across{" "}
                    <span className="font-semibold text-foreground">{brands.length}</span> brands
                  </>
                )}
              </span>
            </motion.div>

            <h1 className="font-grotesk text-5xl font-bold leading-[1] tracking-tight md:text-7xl lg:text-8xl">
              <span className="block overflow-hidden pb-[0.08em]">
                <motion.span
                  initial={reduceMotion ? false : { y: "115%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 1.05, delay: 0.1, ease: EASE }}
                  className="block"
                >
                  Our vehicles.
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[0.08em]">
                <motion.span
                  initial={reduceMotion ? false : { y: "115%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 1.05, delay: 0.26, ease: EASE }}
                  className="block text-gradient-gold gold-text-glow"
                >
                  Choose yours.
                </motion.span>
              </span>
            </h1>
          </header>

          {/* ------------------------------ Brand rail ------------------------------ */}
          {brands.length > 0 && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
              className="mb-8"
              role="group"
              aria-label="Filter by brand"
            >
              <div
                className="flex gap-2 overflow-x-auto py-1 [&::-webkit-scrollbar]:hidden"
                style={{
                  scrollbarWidth: "none",
                  maskImage: "linear-gradient(to right, transparent, black 3%, black 97%, transparent)",
                  WebkitMaskImage: "linear-gradient(to right, transparent, black 3%, black 97%, transparent)",
                }}
              >
                {[{ name: "", label: "All brands", count: total }, ...brands.map((b) => ({ name: b, label: b, count: brandCounts[b] }))].map(
                  (b) => {
                    const active = filters.brand === b.name;
                    return (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => setBrand(b.name)}
                        aria-pressed={active}
                        className={`relative shrink-0 rounded-full border px-5 py-2.5 text-sm transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                          active
                            ? "border-primary/70 text-primary"
                            : "border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="brand-active"
                            transition={{ type: "spring", stiffness: 420, damping: 34 }}
                            className="absolute inset-0 rounded-full bg-primary/12 shadow-[0_0_26px_-6px_hsl(var(--primary)/0.6)]"
                          />
                        )}
                        <span className="relative flex items-center gap-2">
                          {b.label}
                          <span className={`text-xs tabular-nums ${active ? "text-primary/80" : "text-muted-foreground/60"}`}>
                            {b.count}
                          </span>
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: EASE }}
          >
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              search={search}
              setSearch={setSearch}
              brands={brands}
              categories={categories}
            />
          </motion.div>

          {/* ------------------------------ Results ------------------------------ */}
          {isLoading ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading vehicles">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} index={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="mx-auto mt-10 max-w-md py-16 text-center"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/20 bg-primary/5 shadow-lg shadow-primary/10"
              >
                <SearchX className="h-9 w-9 text-primary/70" aria-hidden="true" />
              </motion.div>
              <h2 className="mb-2 font-grotesk text-2xl font-semibold">No vehicles match these filters</h2>
              <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
                Loosen the price range or clear a filter to see the full collection again.
              </p>
              <button
                type="button"
                onClick={resetAll}
                className="btn-luxury inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear all filters
              </button>
            </motion.div>
          ) : (
            <>
              <div className="mb-6 mt-8 flex items-center justify-between gap-4" aria-live="polite">
                <p className="text-sm text-muted-foreground">
                  <span className="font-grotesk text-lg font-semibold text-foreground">
                    <RollingNumber value={filtered.length} />
                  </span>{" "}
                  vehicle{filtered.length !== 1 ? "s" : ""} found
                </p>
                <AnimatePresence>
                  {isFiltered && (
                    <motion.button
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      type="button"
                      onClick={resetAll}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Clear filters
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Cars glide to their new positions when filters change */}
              <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence mode="popLayout" initial>
                  {filtered.map((car, i) => (
                    <motion.div
                      key={car.id}
                      layout
                      initial={reduceMotion ? false : { opacity: 0, y: 40, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.25 } }}
                      transition={{
                        layout: { type: "spring", stiffness: 260, damping: 30 },
                        duration: 0.7,
                        delay: Math.min(i, 8) * 0.06,
                        ease: EASE,
                      }}
                    >
                      <CarCard car={car} index={i} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="mt-14 text-center text-xs text-muted-foreground/70"
              >
                {isFiltered ? "That's every vehicle matching your filters." : "You've seen the whole collection."}
              </motion.p>
            </>
          )}
        </div>
      </div>

      {/* Floating result pill: appears after scrolling, so filters stay reachable */}
      <AnimatePresence>
        {showPill && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-primary/25 p-1.5 pl-5 shadow-2xl shadow-black/40 glass-strong"
          >
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> vehicle
              {filtered.length !== 1 ? "s" : ""}
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={resetAll}
                className="ml-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" /> Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })}
              className="ml-1 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              Filters
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}