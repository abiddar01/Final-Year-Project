import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Ship, Calculator, Car as CarIcon, Calendar, Fuel } from "lucide-react";
import type { Car } from "@/lib/types";
import { calcEstimate, getEngineIdx, ENGINE_SIZES, PKR_RATE } from "@/lib/importDuty";
import ImportEstimateCard from "@/components/ImportEstimateCard";
import OptimizedImage from "@/components/OptimizedImage";
import { formatPKR } from "@/lib/formatPKR";

export default function CarImportEstimate() {
  const { id } = useParams();

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

  // Auto-derive values
  const pricePKR = Math.round(car.price * PKR_RATE);
  const engineIdx = getEngineIdx(car.engine_size);
  const year = String(car.year);
  const result = calcEstimate(pricePKR, engineIdx, year);

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <Link
        to={`/car/${car.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to {car.name}
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-primary text-xs font-semibold uppercase tracking-[0.15em]">Pakistan Import</p>
            <h1 className="text-2xl md:text-3xl font-grotesk font-bold">Duty Estimate</h1>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
        {/* Vehicle summary card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="glass rounded-2xl overflow-hidden lg:sticky lg:top-28">
            {car.image_url && (
              <div className="aspect-video bg-secondary">
                <OptimizedImage src={car.image_url} alt={car.name} />
              </div>
            )}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-1">{car.brand}</p>
                <h2 className="text-xl font-grotesk font-bold">{car.name}</h2>
                <p className="text-2xl font-grotesk font-bold text-gradient-gold mt-2">
                  {formatPKR(car.price)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Auto-derived from listing • ≈ ${car.price.toLocaleString()} USD
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-secondary/40 rounded-xl p-3 text-center">
                  <Calendar className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Year</p>
                  <p className="text-sm font-semibold">{car.year}</p>
                </div>
                <div className="bg-secondary/40 rounded-xl p-3 text-center">
                  <Fuel className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Engine</p>
                  <p className="text-sm font-semibold">
                    {car.engine_size ? `${car.engine_size}cc` : ENGINE_SIZES[engineIdx].label.split("–")[0].trim()}
                  </p>
                </div>
                <div className="bg-secondary/40 rounded-xl p-3 text-center">
                  <Ship className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Days</p>
                  <p className="text-sm font-semibold">{car.estimated_import_days ?? "—"}</p>
                </div>
              </div>

              <Link
                to="/import-estimator"
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass border border-border/30 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
              >
                <CarIcon className="w-3.5 h-3.5" /> Customise estimate
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Estimate */}
        <div className="lg:col-span-3">
          <ImportEstimateCard
            pricePKR={pricePKR}
            engineIdx={engineIdx}
            year={year}
            result={result}
          />
        </div>
      </div>
    </div>
  );
}
