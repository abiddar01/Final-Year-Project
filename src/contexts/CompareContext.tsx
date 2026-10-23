import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";

const MAX_COMPARE = 3;
const STORAGE_KEY = "compare_car_ids";

interface CompareContextValue {
  ids: string[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  isFull: boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const toggle = (id: string) => {
    setIds((prev) => {
      if (prev.includes(id)) {
        toast.success("Removed from comparison");
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX_COMPARE) {
        toast.error(`You can compare up to ${MAX_COMPARE} cars at once`);
        return prev;
      }
      toast.success("Added to comparison");
      return [...prev, id];
    });
  };

  const remove = (id: string) => setIds((prev) => prev.filter((x) => x !== id));
  const clear = () => setIds([]);
  const has = (id: string) => ids.includes(id);

  return (
    <CompareContext.Provider value={{ ids, toggle, remove, clear, has, isFull: ids.length >= MAX_COMPARE }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
