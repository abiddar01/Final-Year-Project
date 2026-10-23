import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  ArrowLeft, Fuel, Gauge, Zap, Users, Calendar, Settings, Check, Loader2,
  CarFront, Ship, Calculator, Cog, Timer, Sparkles, GitCompareArrows, Wallet, Handshake
} from "lucide-react";
import type { Car } from "@/lib/types";
import TestDriveBooking from "@/components/TestDriveBooking";
import ImportRequestDialog from "@/components/ImportRequestDialog";
import OptimizedImage from "@/components/OptimizedImage";
import OwnershipCostDialog from "@/components/OwnershipCostDialog";
import NegotiationAssistantDialog from "@/components/NegotiationAssistantDialog";
import { formatPKR, getAvailabilityLabel, getAvailabilityColor } from "@/lib/formatPKR";
import { useCompare } from "@/contexts/CompareContext";
import { FEATURES } from "@/lib/featureFlags";

export default function CarDetail() {
  const [showBooking, setShowBooking] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showOwnership, setShowOwnership] = useState(false);
  const [showNegotiation, setShowNegotiation] = useState(false);
  const { id } = useParams();
  const { has: inCompare, toggle: toggleCompare } = useCompare();

  const { data: car, isLoading } = useQuery({
    queryKey: ["car", id],
    queryFn: async () => {
      const { data } = await supabase.from("cars").select("*").eq("id", id).single();
      return data as Car;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!car) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-xl text-muted-foreground">Vehicle not found</p>
        <Link to="/catalogue" className="text-primary mt-4 inline-block">Back to catalogue</Link>
      </div>
    );
  }

  const availType = car.availability_type || "in_showroom";
  const isSoldOut = availType === "sold_out";
  const isImport = availType === "available_on_import";
  const isShowroom = availType === "in_showroom";

  const performance = [
    { icon: Zap, label: "Horsepower", value: car.horsepower ? `${car.horsepower}` : "—", unit: "HP" },
    { icon: Timer, label: "0–100 km/h", value: car.acceleration ? `${car.acceleration}` : "—", unit: "sec" },
    { icon: Gauge, label: "Top Speed", value: car.top_speed ? `${car.top_speed}` : "—", unit: "km/h" },
  ];

  const specs = [
    { icon: Cog, label: "Engine", value: car.engine_size ? `${car.engine_size} cc` : "N/A" },
    { icon: Fuel, label: "Fuel Type", value: car.fuel_type },
    { icon: Settings, label: "Transmission", value: car.transmission },
    { icon: Users, label: "Seats", value: car.seats ?? "N/A" },
    { icon: Calendar, label: "Year", value: car.year },
    { icon: Sparkles, label: "Category", value: car.category },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Link
        to="/catalogue"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Catalogue
      </Link>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* LEFT — Image + sections */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hero image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-3xl overflow-hidden bg-secondary aspect-[16/10] glass border border-border/30"
          >
            {car.image_url ? (
              <OptimizedImage src={car.image_url} alt={car.name} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Gauge className="w-24 h-24 text-muted-foreground/20" />
              </div>
            )}
            {car.is_featured && (
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-lg uppercase tracking-wider">
                ★ Featured
              </div>
            )}
          </motion.div>

          {/* Performance stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 border border-border/30"
          >
            <h3 className="text-xs font-grotesk font-semibold uppercase tracking-[0.18em] text-primary mb-4">
              Performance
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {performance.map((p) => (
                <div key={p.label} className="text-center group">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <p.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-grotesk font-bold text-gradient-gold leading-none">
                    {p.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{p.unit}</p>
                  <p className="text-xs text-foreground/70 mt-0.5">{p.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Description */}
          {car.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass rounded-2xl p-6 border border-border/30"
            >
              <h3 className="text-xs font-grotesk font-semibold uppercase tracking-[0.18em] text-primary mb-3">
                Overview
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed">{car.description}</p>
            </motion.div>
          )}

          {/* Specifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6 border border-border/30"
          >
            <h3 className="text-xs font-grotesk font-semibold uppercase tracking-[0.18em] text-primary mb-4">
              Specifications
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {specs.map((s) => (
                <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <s.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <p className="text-sm font-semibold text-foreground capitalize truncate">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Features */}
          {car.features && car.features.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass rounded-2xl p-6 border border-border/30"
            >
              <h3 className="text-xs font-grotesk font-semibold uppercase tracking-[0.18em] text-primary mb-4">
                Features & Highlights
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {car.features.map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-foreground/80 p-2 rounded-lg hover:bg-secondary/40 transition-colors">
                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="truncate">{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* RIGHT — Sticky pricing & CTA panel */}
        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:sticky lg:top-24 space-y-5"
          >
            {/* Title + price card */}
            <div className="glass rounded-2xl p-6 border border-border/30 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-primary font-semibold text-xs uppercase tracking-[0.18em]">
                    {car.brand}
                  </p>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border whitespace-nowrap ${getAvailabilityColor(availType)}`}>
                    {getAvailabilityLabel(availType)}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-grotesk font-bold mb-4 leading-tight">{car.name}</h1>

                <div className="pt-4 border-t border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1">
                    {isImport ? "Estimated landed price from" : "Starting at"}
                  </p>
                  <p className="text-3xl sm:text-4xl font-grotesk font-bold text-gradient-gold gold-text-glow">
                    {formatPKR(car.price)}
                  </p>
                  {isImport && car.estimated_import_days && (
                    <p className="text-xs text-primary mt-2 flex items-center gap-1.5">
                      <Ship className="w-3.5 h-3.5" />
                      Delivery in approx. {car.estimated_import_days} days
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* CTA panel */}
            <div className="glass rounded-2xl p-5 border border-border/30 space-y-3">
              {isShowroom && (
                <>
                  <button
                    onClick={() => setShowBooking(true)}
                    className="btn-luxury w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
                  >
                    <CarFront className="w-5 h-5" /> Book a Test Drive
                  </button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Available at our showroom · Free of charge
                  </p>
                </>
              )}

              {isImport && FEATURES.importEstimator && (
                <>
                  <button
                    onClick={() => setShowImport(true)}
                    className="btn-luxury w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
                  >
                    <Ship className="w-5 h-5" /> Start Import Process
                  </button>
                  <Link
                    to={`/car/import/${car.id}`}
                    className="w-full py-3 rounded-xl glass border border-primary/30 text-primary hover:bg-primary/10 font-semibold flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <Calculator className="w-4 h-4" /> Estimate Total Import Cost
                  </Link>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Custom-imported · Includes all duties calculation
                  </p>
                </>
              )}
              {isImport && !FEATURES.importEstimator && (
                <>
                  <div className="w-full py-3.5 rounded-xl bg-secondary/40 border border-border/40 text-center text-sm text-foreground font-semibold">
                    Available on request — contact our showroom for import details.
                  </div>
                  <Link
                    to="/catalogue"
                    className="block w-full py-3 rounded-xl glass border border-border/30 text-foreground hover:border-primary/40 font-semibold text-center text-sm transition-colors"
                  >
                    Browse Available Vehicles
                  </Link>
                </>
              )}

              {isSoldOut && (
                <>
                  <div className="w-full py-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-center text-sm text-destructive font-semibold">
                    Currently Unavailable
                  </div>
                  <Link
                    to="/catalogue"
                    className="block w-full py-3 rounded-xl glass border border-border/30 text-foreground hover:border-primary/40 font-semibold text-center text-sm transition-colors"
                  >
                    Browse Similar Vehicles
                  </Link>
                </>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setShowOwnership(true)}
                  className="w-full py-3 rounded-xl glass border border-border/40 text-foreground hover:border-primary/40 font-semibold flex items-center justify-center gap-2 text-sm transition-colors"
                >
                  <Wallet className="w-4 h-4 text-primary" /> Ownership Cost
                </button>
                <button
                  onClick={() => setShowNegotiation(true)}
                  className="w-full py-3 rounded-xl glass border border-border/40 text-foreground hover:border-primary/40 font-semibold flex items-center justify-center gap-2 text-sm transition-colors"
                >
                  <Handshake className="w-4 h-4 text-primary" /> Negotiate
                </button>
              </div>

              {/* Universal Compare CTA */}
              {!isSoldOut && FEATURES.compare && (
                <button
                  onClick={() => toggleCompare(car.id)}
                  className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm transition-all border ${
                    inCompare(car.id)
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "glass border-border/40 text-foreground hover:border-primary/40"
                  }`}
                >
                  <GitCompareArrows className="w-4 h-4" />
                  {inCompare(car.id) ? "Added to Compare" : "Compare this car"}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <TestDriveBooking carId={car.id} carName={car.name} isOpen={showBooking} onClose={() => setShowBooking(false)} />
      <ImportRequestDialog carId={car.id} carName={car.name} isOpen={showImport} onClose={() => setShowImport(false)} />
      <OwnershipCostDialog car={car} isOpen={showOwnership} onClose={() => setShowOwnership(false)} />
      <NegotiationAssistantDialog car={car} isOpen={showNegotiation} onClose={() => setShowNegotiation(false)} />
    </div>
  );
}
