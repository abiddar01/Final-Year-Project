import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Fuel, Gauge, Zap, Timer, Settings2, Cog, GitCompareArrows, Check } from "lucide-react";
import type { Car } from "@/lib/types";
import OptimizedImage from "@/components/OptimizedImage";
import { formatPKR, getAvailabilityLabel, getAvailabilityColor } from "@/lib/formatPKR";
import { useCompare } from "@/contexts/CompareContext";
import { FEATURES } from "@/lib/featureFlags";

interface CarCardProps {
  car: Car;
  index?: number;
}

export default function CarCard({ car, index = 0 }: CarCardProps) {
  const availType = car.availability_type || "in_showroom";
  const { has, toggle } = useCompare();
  const inCompare = has(car.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5 }}
    >
      <Link to={`/car/${car.id}`} className="block group">
        <div className="glass rounded-2xl overflow-hidden border border-border/30 transition-all duration-500 hover:border-primary/40 hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)] hover:-translate-y-2">
          {/* Image */}
          <div className="relative h-56 bg-secondary overflow-hidden">
            {car.image_url ? (
              <OptimizedImage
                src={car.image_url}
                alt={car.name}
                className="transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
                <Gauge className="w-16 h-16 text-muted-foreground/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />

            {/* Top badges (Featured is admin-only and hidden on the public catalogue) */}
            <div className="absolute top-3 left-3 right-3 flex items-start justify-end gap-2">
              <div className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-background/80 backdrop-blur-md text-foreground border border-border/40 uppercase tracking-wider">
                {car.year}
              </div>
            </div>

            {/* Availability + price overlay */}
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
              <div>
                <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/80 mb-0.5">Starting at</p>
                <p className="text-xl font-grotesk font-bold text-gradient-gold drop-shadow-lg leading-none">
                  {formatPKR(car.price)}
                </p>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border backdrop-blur-md ${getAvailabilityColor(availType)}`}>
                {getAvailabilityLabel(availType)}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="p-5">
            {/* Brand */}
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] text-primary font-semibold uppercase tracking-[0.15em]">
                {car.brand}
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize font-medium">
                {car.category}
              </span>
            </div>

            <h3 className="text-lg font-grotesk font-bold text-foreground mb-3 group-hover:text-primary transition-colors leading-tight line-clamp-1">
              {car.name}
            </h3>

            {/* Specs grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 py-3 border-y border-border/20">
              {car.horsepower && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="w-3.5 h-3.5 text-primary/70" />
                  <span className="font-medium text-foreground/80">{car.horsepower}</span> HP
                </div>
              )}
              {car.acceleration && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Timer className="w-3.5 h-3.5 text-primary/70" />
                  <span className="font-medium text-foreground/80">{car.acceleration}s</span> 0-100
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Cog className="w-3.5 h-3.5 text-primary/70" />
                <span className="font-medium text-foreground/80">
                  {car.engine_size && car.engine_size > 0
                    ? `${car.engine_size}`
                    : car.fuel_type === "electric"
                    ? "EV"
                    : "—"}
                </span>{" "}
                {car.engine_size && car.engine_size > 0 ? "cc" : ""}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Fuel className="w-3.5 h-3.5 text-primary/70" />
                <span className="font-medium text-foreground/80 capitalize">{car.fuel_type}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground col-span-2">
                <Settings2 className="w-3.5 h-3.5 text-primary/70" />
                <span className="font-medium text-foreground/80 capitalize">{car.transmission}</span>
              </div>
            </div>

            {/* CTA row */}
            <div className="flex items-center justify-between gap-2">
              {FEATURES.compare ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(car.id);
                  }}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    inCompare
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-secondary/40 text-muted-foreground border-border/30 hover:text-primary hover:border-primary/40"
                  }`}
                >
                  {inCompare ? <Check className="w-3 h-3" /> : <GitCompareArrows className="w-3 h-3" />}
                  {inCompare ? "Added" : "Compare"}
                </button>
              ) : <span />}
              <span className="text-xs text-primary font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Explore →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
