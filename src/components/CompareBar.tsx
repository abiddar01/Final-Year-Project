import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitCompareArrows, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompare } from "@/contexts/CompareContext";
import type { Car } from "@/lib/types";

export default function CompareBar() {
  const { ids, remove, clear } = useCompare();

  const { data: cars } = useQuery({
    queryKey: ["compare-cars", ids],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const { data } = await supabase.from("cars").select("id, name, brand, image_url").in("id", ids);
      return (data ?? []) as Pick<Car, "id" | "name" | "brand" | "image_url">[];
    },
    enabled: ids.length > 0,
  });

  return (
    <AnimatePresence>
      {ids.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-3xl"
        >
          <div className="glass-strong border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 p-3 sm:p-4 flex items-center gap-3">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-primary/15 items-center justify-center shrink-0">
              <GitCompareArrows className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 flex items-center gap-2 overflow-x-auto">
              {(cars ?? []).map((car) => (
                <div
                  key={car.id}
                  className="flex items-center gap-2 bg-secondary/60 rounded-xl pl-2 pr-1 py-1 border border-border/30 shrink-0"
                >
                  {car.image_url && (
                    <img src={car.image_url} alt={car.name} className="w-8 h-8 rounded-lg object-cover" />
                  )}
                  <span className="text-xs font-medium text-foreground max-w-[120px] truncate">{car.name}</span>
                  <button
                    onClick={() => remove(car.id)}
                    className="w-6 h-6 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                    aria-label={`Remove ${car.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {ids.length < 2 && (
                <span className="text-xs text-muted-foreground px-2">
                  Add {2 - ids.length} more to compare
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={clear}
                className="text-xs font-semibold text-foreground/80 hover:text-destructive transition-colors px-3 py-2 rounded-xl border border-border/40 hover:border-destructive/50 hover:bg-destructive/10"
              >
                Clear All
              </button>
              <Link
                to="/compare"
                aria-disabled={ids.length < 2}
                onClick={(e) => {
                  if (ids.length < 2) e.preventDefault();
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  ids.length >= 2
                    ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/30"
                    : "bg-secondary text-muted-foreground cursor-not-allowed border border-border/40"
                }`}
              >
                Compare ({ids.length}) <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
