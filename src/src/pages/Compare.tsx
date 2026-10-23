import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  X,
  Loader2,
  GitCompareArrows,
  Plus,
  Check,
  Minus,
  Trophy,
  Sparkles,
  Eye,
  CalendarCheck,
  Plane,
  Trash2,
} from "lucide-react";
import { getCarsByIds } from "@/services/carsService";
import { useCompare } from "@/contexts/CompareContext";
import { formatPKR, getAvailabilityLabel, getAvailabilityColor } from "@/lib/formatPKR";
import type { Car } from "@/lib/types";
import { FEATURES } from "@/lib/featureFlags";
import {
  COMPARE_SECTIONS,
  bestValueForRow,
  rowIsIdentical,
  rowIsEmpty,
  type SpecRow,
} from "@/lib/compareSpecs";

// Decide a "Best for" tagline per car based on its standout traits
function bestForTag(car: Car, allCars: Car[]): string {
  if (allCars.length < 2) return "Great all-rounder";
  const isCheapest = car.price === Math.min(...allCars.map((c) => c.price));
  const hps = allCars.map((c) => c.horsepower ?? 0);
  const isMostPowerful = (car.horsepower ?? 0) === Math.max(...hps) && (car.horsepower ?? 0) > 0;
  const accels = allCars.map((c) => c.acceleration ?? 99);
  const isFastest = (car.acceleration ?? 99) === Math.min(...accels) && (car.acceleration ?? 99) < 99;
  const seats = allCars.map((c) => c.seats ?? 0);
  const isRoomiest = (car.seats ?? 0) === Math.max(...seats) && (car.seats ?? 0) >= 5;

  if (isFastest && isMostPowerful) return "Best for thrill seekers";
  if (isCheapest) return "Best for value buyers";
  if (isMostPowerful) return "Best for performance";
  if (isRoomiest) return "Best for families";
  if (car.fuel_type?.toLowerCase().includes("electric")) return "Best for eco drivers";
  return "Balanced everyday choice";
}

// Score cars to pick a recommended one
function pickRecommended(cars: Car[]): { car: Car; reasons: string[] } | null {
  if (cars.length === 0) return null;
  if (cars.length === 1) return { car: cars[0], reasons: ["Only car in your comparison."] };

  const prices = cars.map((c) => c.price);
  const hps = cars.map((c) => c.horsepower ?? 0);
  const accels = cars.map((c) => c.acceleration ?? 99);
  const tops = cars.map((c) => c.top_speed ?? 0);

  const scored = cars.map((c) => {
    let score = 0;
    const reasons: string[] = [];
    if (c.price === Math.min(...prices)) {
      score += 2;
      reasons.push(`most affordable at ${formatPKR(c.price)}`);
    }
    if ((c.horsepower ?? 0) === Math.max(...hps) && (c.horsepower ?? 0) > 0) {
      score += 2;
      reasons.push(`most powerful with ${c.horsepower} HP`);
    }
    if ((c.acceleration ?? 99) === Math.min(...accels) && (c.acceleration ?? 99) < 99) {
      score += 2;
      reasons.push(`fastest 0–100 in ${c.acceleration} sec`);
    }
    if ((c.top_speed ?? 0) === Math.max(...tops) && (c.top_speed ?? 0) > 0) {
      score += 1;
      reasons.push(`highest top speed at ${c.top_speed} km/h`);
    }
    if ((c.availability_type || "in_showroom") === "in_showroom") {
      score += 1;
      reasons.push("ready in the showroom");
    }
    return { car: c, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];
  return { car: winner.car, reasons: winner.reasons.length > 0 ? winner.reasons : ["Strongest balance across categories."] };
}

export default function Compare() {
  const { ids, remove, clear } = useCompare();

  const { data: cars, isLoading, isError, refetch } = useQuery({
    queryKey: ["compare-full", ids],
    queryFn: () => getCarsByIds(ids),
    enabled: ids.length > 0,
  });

  const recommended = useMemo(() => (cars ? pickRecommended(cars) : null), [cars]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <h1 className="text-2xl font-grotesk font-bold mb-2">Couldn’t load your comparison</h1>
        <p className="text-muted-foreground text-sm mb-6">
          We had trouble reaching the vehicle data. Please try again.
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!cars || cars.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
          <GitCompareArrows className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h1 className="text-2xl font-grotesk font-bold mb-2">No cars to compare</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Add cars from the catalogue using the “Compare” button on each car.
        </p>
        <Link
          to="/car-catalogue"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Browse Catalogue
        </Link>
      </div>
    );
  }

  const gridCols = `200px repeat(${cars.length}, minmax(200px, 1fr))${cars.length < 3 ? " 200px" : ""}`;

  const bestPerRow = (row: SpecRow) => bestValueForRow(row, cars);
  const allIdentical = (row: SpecRow) => rowIsIdentical(row, cars);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-32">
      <Link
        to="/car-catalogue"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Catalogue
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 flex-wrap gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
            <GitCompareArrows className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-primary text-xs font-semibold uppercase tracking-[0.15em]">Side by side</p>
            <h1 className="text-2xl md:text-3xl font-grotesk font-bold">
              Comparing {cars.length} {cars.length === 1 ? "car" : "cars"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/car-catalogue"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-foreground transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Car
          </Link>
          <button
            onClick={clear}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        </div>
      </motion.div>

      {/* Recommended Card */}
      {recommended && cars.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 sm:p-6"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-14 h-14 rounded-2xl bg-primary/25 flex items-center justify-center shrink-0">
              <Trophy className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">Our Recommendation</p>
              </div>
              <h2 className="text-xl sm:text-2xl font-grotesk font-bold text-foreground mb-1">
                {recommended.car.name}
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                Stands out because it is {recommended.reasons.slice(0, 3).join(", ")}.
              </p>
              <Link
                to={`/car/${recommended.car.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Eye className="w-3.5 h-3.5" /> View Recommended
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Comparison grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[680px]">
          {/* Car header cards */}
          <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: gridCols }}>
            <div />
            {cars.map((car) => {
              const avail = car.availability_type || "in_showroom";
              const isRecommended = recommended?.car.id === car.id && cars.length > 1;
              const isImport = avail === "available_on_import";
              const isShowroom = avail === "in_showroom";
              return (
                <motion.div
                  key={car.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass rounded-2xl p-4 border relative ${
                    isRecommended ? "border-primary/60 shadow-lg shadow-primary/20 pt-7" : "border-border/30"
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-[10px] font-bold uppercase tracking-[0.15em] flex items-center gap-1.5 shadow-md shadow-primary/30 whitespace-nowrap">
                      <Trophy className="w-3 h-3" />
                      <span>Top Pick</span>
                    </div>
                  )}
                  <button
                    onClick={() => remove(car.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-background/80 hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors z-10"
                    aria-label={`Remove ${car.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-secondary mb-3">
                    {car.image_url ? (
                      <img src={car.image_url} alt={car.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-wider">{car.brand}</p>
                  <h3 className="font-grotesk font-bold text-foreground text-sm leading-tight line-clamp-2 mb-2">
                    {car.name}
                  </h3>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getAvailabilityColor(
                      avail,
                    )}`}
                  >
                    {getAvailabilityLabel(avail)}
                  </span>
                  <p className="mt-2 text-[11px] text-muted-foreground italic">
                    {bestForTag(car, cars)}
                  </p>

                  {/* Per-car action buttons */}
                  <div className="mt-3 flex flex-col gap-1.5">
                    <Link
                      to={`/car/${car.id}`}
                      className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity"
                    >
                      <Eye className="w-3 h-3" /> View Details
                    </Link>
                    {isShowroom && (
                      <Link
                        to={`/car/${car.id}#book`}
                        className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg border border-border/50 hover:border-primary/50 text-foreground text-[11px] font-semibold transition-colors"
                      >
                        <CalendarCheck className="w-3 h-3" /> Book Test Drive
                      </Link>
                    )}
                    {isImport && FEATURES.importEstimator && (
                      <Link
                        to={`/car/import/${car.id}`}
                        className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg border border-border/50 hover:border-primary/50 text-foreground text-[11px] font-semibold transition-colors"
                      >
                        <Plane className="w-3 h-3" /> Start Import
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
            {cars.length < 3 && (
              <Link
                to="/car-catalogue"
                className="glass rounded-2xl border border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center text-muted-foreground hover:text-primary p-4 min-h-[260px]"
              >
                <Plus className="w-6 h-6 mb-2" />
                <span className="text-xs font-medium">Add another car</span>
              </Link>
            )}
          </div>

          {/* Sectioned spec rows */}
          <div className="space-y-5 mt-6">
            {COMPARE_SECTIONS.map((section) => {
              const visibleRows = section.rows.filter((row) => !rowIsEmpty(row, cars));
              if (visibleRows.length === 0) return null;
              return (
              <div key={section.title} className="glass rounded-2xl border border-border/30 overflow-hidden">
                <div className="px-4 py-3 bg-secondary/40 border-b border-border/30">
                  <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-primary">{section.title}</h3>
                </div>
                {visibleRows.map((row, rowIdx) => {
                  const best = bestPerRow(row);
                  const identical = allIdentical(row);
                  return (
                    <div
                      key={row.label}
                      className={`grid gap-4 px-4 py-3 items-start ${rowIdx % 2 === 0 ? "" : "bg-secondary/15"} ${
                        identical ? "opacity-60" : ""
                      }`}
                      style={{ gridTemplateColumns: gridCols }}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground self-center">
                        {row.label}
                        {identical && cars.length > 1 && (
                          <span className="ml-1.5 text-[9px] normal-case tracking-normal text-muted-foreground/60">
                            (same)
                          </span>
                        )}
                      </div>
                      {cars.map((car) => {
                        const v = row.value(car);

                        if (row.type === "list") {
                          const items = Array.isArray(v) ? v : [];
                          return (
                            <div key={car.id} className="flex flex-wrap gap-1.5">
                              {items.length === 0 ? (
                                <span className="text-sm text-muted-foreground/50 inline-flex items-center gap-1.5">
                                  <Minus className="w-3.5 h-3.5 text-muted-foreground/40" /> Not specified
                                </span>
                              ) : (
                                items.map((item) => (
                                  <span
                                    key={item}
                                    className="px-2 py-0.5 rounded-md bg-secondary/60 border border-border/30 text-[11px] text-foreground"
                                  >
                                    {item}
                                  </span>
                                ))
                              )}
                            </div>
                          );
                        }

                        const isBest =
                          best !== null && typeof v === "number" && v === best && cars.length > 1;
                        const display =
                          v === null || v === undefined || v === ""
                            ? "—"
                            : typeof v === "number" && row.format
                            ? row.format(v)
                            : String(v);
                        return (
                          <div
                            key={car.id}
                            className={`text-sm font-medium capitalize flex items-center gap-1.5 ${
                              isBest
                                ? "text-primary font-bold"
                                : display === "—"
                                ? "text-muted-foreground/50"
                                : "text-foreground"
                            }`}
                          >
                            {display === "—" ? (
                              <Minus className="w-3.5 h-3.5 text-muted-foreground/40" />
                            ) : isBest ? (
                              <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center">
                                <Check className="w-3 h-3 text-primary" />
                              </div>
                            ) : null}
                            <span>{display}</span>
                          </div>
                        );
                      })}
                      {cars.length < 3 && <div />}
                    </div>
                  );
                })}
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/car-catalogue"
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 text-foreground transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Another Car
        </Link>
        <button
          onClick={clear}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" /> Clear All
        </button>
      </div>
    </div>
  );
}
