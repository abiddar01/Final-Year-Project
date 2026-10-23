import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Ship } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  carId: string;
  carName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportRequestDialog({ carId, carName, isOpen, onClose }: Props) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email) return;

    setLoading(true);
    const { error } = await supabase.from("import_requests" as any).insert({
      car_id: carId,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      message: form.message || null,
    } as any);

    setLoading(false);
    if (error) {
      toast.error("Failed to submit request. Please try again.");
      return;
    }

    toast.success("Import request submitted successfully. We will contact you shortly.");
    setForm({ full_name: "", email: "", phone: "", message: "" });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-2xl p-8 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Ship className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-grotesk font-bold text-foreground">Request Import</h3>
                  <p className="text-xs text-muted-foreground">{carName}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Full Name</label>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  placeholder="+92 300 1234567"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Message (Optional)</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={3}
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none"
                  placeholder="Any specific requirements..."
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-luxury w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ship className="w-4 h-4" />}
                Submit Import Request
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
