import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Fuel, Gauge, Zap } from "lucide-react";
import type { Car } from "@/lib/types";
import { formatPKR } from "@/lib/formatPKR";

interface Props {
  cars: Car[];
}

export default function FeaturedCarousel({ cars }: Props) {
  const doubled = [...cars, ...cars];

  return (
    <div className="relative overflow-hidden py-4">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex gap-6"
        animate={{ x: [0, -(cars.length * 340)] }}
        transition={{ x: { duration: cars.length * 5, repeat: Infinity, ease: "linear" } }}
      >
        {doubled.map((car, i) => (
          <Link key={`${car.id}-${i}`} to={`/car/${car.id}`} className="group flex-shrink-0 w-[320px]">
            <div className="glass rounded-2xl overflow-hidden transition-all duration-500 hover:gold-glow hover:border-primary/30 hover:-translate-y-2 border border-border/10">
              <div className="relative h-48 bg-secondary overflow-hidden">
                {car.image_url ? (
                  <img src={car.image_url} alt={car.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
                    <Gauge className="w-12 h-12 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <p className="text-lg font-grotesk font-bold text-gradient-gold">{formatPKR(car.price)}</p>
                </div>
              </div>
              <div className="p-5">
                <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mb-1">{car.brand}</p>
                <h3 className="text-base font-grotesk font-bold text-foreground mb-3 group-hover:text-primary transition-colors">{car.name}</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {car.horsepower && (<span className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary/70" />{car.horsepower} HP</span>)}
                  <span className="flex items-center gap-1"><Fuel className="w-3 h-3 text-primary/70" />{car.fuel_type}</span>
                  {car.top_speed && (<span className="flex items-center gap-1"><Gauge className="w-3 h-3 text-primary/70" />{car.top_speed} km/h</span>)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
