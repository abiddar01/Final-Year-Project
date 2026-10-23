import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, User, Mail, Phone, CreditCard, Car,
  CheckCircle2, XCircle, Loader2, Filter, Bell, MessageSquare, ExternalLink, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type BookingStatus = "pending" | "approved" | "rejected";

interface Booking {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cnic: string | null;
  preferred_date: string;
  preferred_time: string;
  message: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  car_id: string;
  cars: { name: string; brand: string } | null;
}

interface NotificationLog {
  id: string;
  booking_id: string;
  type: string;
  recipient: string;
  subject: string;
  message: string;
  status: string;
  sent_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  approved: "bg-green-500/15 text-green-400 border-green-500/20",
  rejected: "bg-red-500/15 text-red-400 border-red-500/20",
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
};

export default function AdminBookings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [showNotifLog, setShowNotifLog] = useState<string | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-bookings", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("test_drive_bookings")
        .select("*, cars(name, brand)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
  });

  const { data: notifLogs } = useQuery({
    queryKey: ["notification-logs", showNotifLog],
    queryFn: async () => {
      if (!showNotifLog) return [];
      const { data } = await supabase
        .from("notification_log")
        .select("*")
        .eq("booking_id", showNotifLog)
        .order("sent_at", { ascending: false });
      return (data ?? []) as NotificationLog[];
    },
    enabled: !!showNotifLog,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ bookingId, action, rejection_reason }: { bookingId: string; action: string; rejection_reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("booking-notification", {
        body: { booking_id: bookingId, action, rejection_reason },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["notification-logs"] });
      toast({ title: "Action completed", description: data?.message || "Notification sent" });
      setShowRejectModal(false);
      setRejectReason("");
      setRejectingId(null);
      setSelectedBooking(null);
    },
    onError: (e: any) => {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    },
  });

  const handleApprove = (bookingId: string) => {
    actionMutation.mutate({ bookingId, action: "approve" });
  };

  const handleRejectStart = (bookingId: string) => {
    setRejectingId(bookingId);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectingId) return;
    actionMutation.mutate({ bookingId: rejectingId, action: "reject", rejection_reason: rejectReason });
  };
  const deleteMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.from("test_drive_bookings").delete().eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast({ title: "Booking deleted", description: "The booking has been removed." });
    },
    onError: (e: any) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    },
  });

  const handleDelete = (bookingId: string) => {
    if (confirm("Delete this booking permanently? This action cannot be undone.")) {
      deleteMutation.mutate(bookingId);
    }
  };


  const counts = {
    all: bookings?.length ?? 0,
    pending: bookings?.filter((b) => b.status === "pending").length ?? 0,
    approved: bookings?.filter((b) => b.status === "approved").length ?? 0,
    rejected: bookings?.filter((b) => b.status === "rejected").length ?? 0,
  };

  const inputClass =
    "w-full bg-secondary/50 text-foreground border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground transition-all";

  return (
    <div>
      {/* Status Filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {(["all", "pending", "approved", "rejected"] as const).map((s) => {
          const count = s === "all" ? (bookings?.length ?? 0) :
            bookings?.filter((b) => b.status === s).length ?? 0;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${
                statusFilter === s
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-secondary/30 text-muted-foreground border-border/20 hover:border-border/40"
              }`}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !bookings || bookings.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking, i) => {
            const StatusIcon = statusIcons[booking.status] || Clock;
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-2xl border border-border/20 hover:border-primary/15 transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Left: Details */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{booking.full_name}</p>
                          <p className="text-xs text-muted-foreground">{booking.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Car className="w-3.5 h-3.5 text-primary" />
                          <span>{booking.cars?.name || "Unknown"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span>{booking.preferred_date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <span>{booking.preferred_time}</span>
                        </div>
                        {booking.cnic && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <CreditCard className="w-3.5 h-3.5 text-primary" />
                            <span>{booking.cnic}</span>
                          </div>
                        )}
                      </div>
                      {booking.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                          <Phone className="w-3.5 h-3.5 text-primary" />
                          <span>{booking.phone}</span>
                        </div>
                      )}
                      {booking.message && (
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-2">
                          <MessageSquare className="w-3.5 h-3.5 text-primary mt-0.5" />
                          <span className="italic">"{booking.message}"</span>
                        </div>
                      )}
                      {booking.rejection_reason && (
                        <p className="text-xs text-red-400 mt-2 italic">Rejection: {booking.rejection_reason}</p>
                      )}
                    </div>

                    {/* Right: Status & Actions */}
                    <div className="flex flex-col items-end gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize ${statusColors[booking.status] || ""}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {booking.status}
                      </span>
                      <div className="flex items-center gap-2">
                        {booking.status === "pending" && (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleApprove(booking.id)}
                              disabled={actionMutation.isPending}
                              className="btn-luxury flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/15 text-green-400 text-xs font-semibold border border-green-500/20 hover:bg-green-500/25 transition-all disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRejectStart(booking.id)}
                              disabled={actionMutation.isPending}
                              className="btn-luxury flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 text-red-400 text-xs font-semibold border border-red-500/20 hover:bg-red-500/25 transition-all disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </motion.button>
                          </>
                        )}
                        <button
                          onClick={() => setShowNotifLog(showNotifLog === booking.id ? null : booking.id)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                          title="Notification Log"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                        {booking.phone && (
                          <button
                            onClick={() => {
                              const phone = booking.phone!.replace(/[^0-9]/g, "");
                              const fullPhone = phone.startsWith("0") ? "92" + phone.slice(1) : phone;
                              const text = encodeURIComponent(
                                booking.status === "approved"
                                  ? `Dear ${booking.full_name}, your test drive for ${booking.cars?.name || "the vehicle"} on ${booking.preferred_date} at ${booking.preferred_time} has been approved. Please arrive 10 mins early with your CNIC. — AutoLux Engine`
                                  : booking.status === "rejected"
                                  ? `Dear ${booking.full_name}, unfortunately your test drive booking for ${booking.cars?.name || "the vehicle"} could not be approved. ${booking.rejection_reason || ""} Please book another slot. — AutoLux Engine`
                                  : `Dear ${booking.full_name}, thank you for booking a test drive for ${booking.cars?.name || "the vehicle"} on ${booking.preferred_date}. Your booking is under review. — AutoLux Engine`
                              );
                              window.open(`https://wa.me/${fullPhone}?text=${text}`, "_blank", "noopener,noreferrer");
                            }}
                            className="p-2 rounded-xl text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-all"
                            title="Contact via WhatsApp"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(booking.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                          title="Delete booking"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60">
                        {new Date(booking.created_at).toLocaleDateString()} {new Date(booking.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Notification Log Expandable */}
                  <AnimatePresence>
                    {showNotifLog === booking.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-border/20">
                          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-1.5">
                            <Bell className="w-3.5 h-3.5" /> Notification History
                          </p>
                          {notifLogs && notifLogs.length > 0 ? (
                            <div className="space-y-2">
                              {notifLogs.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 text-xs p-3 rounded-xl bg-secondary/20">
                                  <Mail className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground truncate">{log.subject}</p>
                                    <p className="text-muted-foreground">To: {log.recipient}</p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <span className="inline-flex px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-medium">
                                      {log.status}
                                    </span>
                                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                                      {new Date(log.sent_at).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground/50 italic">No notifications sent yet</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass-strong rounded-2xl p-6 w-full max-w-md border border-border/30"
            >
              <h3 className="text-lg font-grotesk font-bold mb-2 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" /> Reject Booking
              </h3>
              <p className="text-sm text-muted-foreground mb-4">Provide a reason (optional, will be sent to customer):</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className={inputClass + " h-24 resize-none"}
                placeholder="e.g., Time slot not available, vehicle under maintenance..."
                maxLength={500}
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => { setShowRejectModal(false); setRejectingId(null); }}
                  className="px-4 py-2 rounded-xl bg-secondary/50 text-sm text-muted-foreground hover:bg-secondary transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={actionMutation.isPending}
                  className="btn-luxury flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 text-red-400 text-sm font-semibold border border-red-500/20 hover:bg-red-500/25 transition-all disabled:opacity-50"
                >
                  {actionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reject & Notify
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
