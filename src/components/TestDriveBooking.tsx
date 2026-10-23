import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, X, Send, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TestDriveBookingProps {
  carId: string;
  carName: string;
  isOpen: boolean;
  onClose: () => void;
  /** Price agreed in the negotiation assistant, pre-filled into the request. */
  agreedPrice?: string | null;
}

const timeSlots = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
];

const inputClass =
  "w-full bg-secondary text-foreground border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground";
const labelClass = "text-xs font-medium text-muted-foreground mb-1 block";

export default function TestDriveBooking({ carId, carName, isOpen, onClose, agreedPrice }: TestDriveBookingProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    cnic: "",
    preferred_date: "",
    preferred_time: "",
    message: "",
  });

  // Pre-fill the agreed price when the customer locks it in the negotiation assistant.
  useEffect(() => {
    if (!isOpen || !agreedPrice) return;
    const note = `Agreed price locked in negotiation: ${agreedPrice}`;
    setForm((f) => (f.message.includes("Agreed price locked") ? f : { ...f, message: note }));
  }, [isOpen, agreedPrice]);

  const formatCnic = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name: letters, spaces, hyphens, apostrophes, periods only
    const trimmedName = form.full_name.trim();
    if (!/^[A-Za-z][A-Za-z\s.'-]{1,99}$/.test(trimmedName)) {
      toast({ title: "Invalid name", description: "Name must contain letters only (no numbers or special characters)", variant: "destructive" });
      return;
    }

    // Validate CNIC format: 13 digits
    const cnicDigits = form.cnic.replace(/\D/g, "");
    if (cnicDigits.length !== 13) {
      toast({ title: "Invalid CNIC", description: "CNIC must be 13 digits (e.g., 35202-1234567-1)", variant: "destructive" });
      return;
    }

    // Validate phone: digits only, 10–11 digits (Pakistan format) if provided
    if (form.phone) {
      if (!/^\d+$/.test(form.phone)) {
        toast({ title: "Invalid phone number", description: "Phone number must contain digits only (0–9)", variant: "destructive" });
        return;
      }
      if (form.phone.length < 10 || form.phone.length > 11) {
        toast({ title: "Invalid phone number", description: "Phone number must be 10 or 11 digits (e.g., 03001234567)", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from("test_drive_bookings").insert({
        car_id: carId,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        cnic: form.cnic,
        preferred_date: form.preferred_date,
        preferred_time: form.preferred_time,
        message: form.message || null,
      }).select("id").single();
      if (error) throw error;

      // Send confirmation notification
      try {
        await supabase.functions.invoke("booking-notification", {
          body: { booking_id: data.id, action: "confirm_submission" },
        });
      } catch {
        // Non-critical: booking still saved
      }

      setSuccess(true);
      toast({ title: "Test drive booked!", description: `A confirmation will be sent to ${form.email}` });
    } catch (err: any) {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-strong rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            {success ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-grotesk font-bold mb-2">Booking Confirmed!</h2>
                <p className="text-muted-foreground mb-1">Your test drive for <strong className="text-foreground">{carName}</strong> has been scheduled.</p>
                <p className="text-sm text-muted-foreground mb-6">A confirmation will be sent to {form.email}</p>
                <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-grotesk font-bold">Book a Test Drive</h2>
                    <p className="text-sm text-muted-foreground">{carName}</p>
                  </div>
                  <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {agreedPrice && (
                  <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Agreed price</p>
                    <p className="text-lg font-grotesk font-bold text-gradient-gold">{agreedPrice}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Locked from your negotiation · subject to final confirmation
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={labelClass}>Full Name *</label>
                    <input
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value.replace(/[^A-Za-z\s.'-]/g, "") })}
                      className={inputClass}
                      required
                      maxLength={100}
                      pattern="[A-Za-z][A-Za-z\s.'-]{1,99}"
                      placeholder="e.g., Ahmed Khan"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>CNIC Number *</label>
                    <input
                      value={form.cnic}
                      onChange={(e) => setForm({ ...form, cnic: formatCnic(e.target.value) })}
                      className={inputClass}
                      required
                      placeholder="35202-1234567-1"
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputClass}
                      required
                      maxLength={255}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="\d{10,11}"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                      className={inputClass}
                      placeholder="03001234567"
                      maxLength={11}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Digits only (10–11 digits)</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>
                        <Calendar className="w-3 h-3 inline mr-1" />Preferred Date *
                      </label>
                      <input
                        type="date"
                        value={form.preferred_date}
                        onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
                        className={inputClass}
                        min={today}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        <Clock className="w-3 h-3 inline mr-1" />Preferred Time *
                      </label>
                      <select
                        value={form.preferred_time}
                        onChange={(e) => setForm({ ...form, preferred_time: e.target.value })}
                        className={inputClass}
                        required
                      >
                        <option value="">Select time</option>
                        {timeSlots.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Message (optional)</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className={inputClass + " h-20 resize-none"}
                      maxLength={500}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:gold-glow transition-all"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Book Test Drive
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
