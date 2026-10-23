import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ship, Phone, MessageSquare, Clock, CheckCircle2, XCircle,
  Loader2, Filter, ExternalLink, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
  car_id: string;
  cars: { name: string; brand: string } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  contacted: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  approved: "bg-green-500/15 text-green-400 border-green-500/20",
  rejected: "bg-red-500/15 text-red-400 border-red-500/20",
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  contacted: Phone,
  approved: CheckCircle2,
  rejected: XCircle,
};

export default function AdminImportRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-import-requests", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("import_requests")
        .select("*, cars(name, brand)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ImportRequest[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("import_requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-import-requests"] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("import_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-import-requests"] });
      toast({ title: "Request deleted" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleWhatsApp = async (request: ImportRequest) => {
    if (!request.phone) {
      toast({ title: "Missing phone number", description: "This request has no phone number attached." });
      return;
    }

    // Normalize Pakistan numbers to E.164 without '+' (WhatsApp requirement)
    let digits = request.phone.replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2); // 0092...
    if (digits.startsWith("0")) digits = "92" + digits.slice(1); // 03xx... -> 92 3xx...
    if (digits.length === 10 && digits.startsWith("3")) digits = "92" + digits; // 3xx... -> 92 3xx...

    // Basic sanity check (Pakistan mobile numbers are typically 12 digits with 92)
    if (!digits.startsWith("92") || digits.length < 11) {
      toast({
        title: "Invalid phone number",
        description: `Please update the phone number format (got: ${request.phone}).`,
        variant: "destructive",
      });
      return;
    }

    const carName = request.cars?.name || "the vehicle";
    const text = encodeURIComponent(
      `Dear ${request.full_name}, thank you for your import request for ${request.cars?.brand || ""} ${carName}. We'd like to discuss the import details, pricing, and timeline with you. — AutoLux Engine`
    );

    const url = `https://api.whatsapp.com/send?phone=${digits}&text=${text}`;
    const w = window.open(url, "_blank", "noopener,noreferrer");

    // If popup is blocked, provide a clear fallback.
    if (!w) {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Pop-up blocked", description: "WhatsApp link copied to clipboard — paste it into your browser." });
      } catch {
        toast({ title: "Pop-up blocked", description: "Please allow pop-ups for this site to open WhatsApp." });
      }
    }
  };

  const statuses = ["all", "pending", "contacted", "approved", "rejected"];

  return (
    <div>
      {/* Filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {statuses.map((s) => {
          const count = s === "all"
            ? (requests?.length ?? 0)
            : requests?.filter((r) => r.status === s).length ?? 0;
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

      {/* Requests List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !requests || requests.length === 0 ? (
        <div className="text-center py-16">
          <Ship className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No import requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req, i) => {
            const StatusIcon = statusIcons[req.status] || Clock;
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-2xl border border-border/20 hover:border-primary/15 transition-all p-5"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Ship className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{req.full_name}</p>
                        <p className="text-xs text-muted-foreground">{req.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Ship className="w-3.5 h-3.5 text-primary" />
                        <span>{req.cars?.brand} {req.cars?.name || "Unknown"}</span>
                      </div>
                      {req.phone && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 text-primary" />
                          <span>{req.phone}</span>
                        </div>
                      )}
                    </div>
                    {req.message && (
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-2">
                        <MessageSquare className="w-3.5 h-3.5 text-primary mt-0.5" />
                        <span className="italic">"{req.message}"</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize ${statusColors[req.status] || statusColors.pending}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {req.status}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {req.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: req.id, status: "contacted" })}
                            disabled={updateStatusMutation.isPending}
                            className="btn-luxury flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/15 text-blue-400 text-xs font-semibold border border-blue-500/20 hover:bg-blue-500/25 transition-all disabled:opacity-50"
                          >
                            <Phone className="w-3.5 h-3.5" /> Mark Contacted
                          </button>
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: req.id, status: "approved" })}
                            disabled={updateStatusMutation.isPending}
                            className="btn-luxury flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/15 text-green-400 text-xs font-semibold border border-green-500/20 hover:bg-green-500/25 transition-all disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                        </>
                      )}
                      {req.status === "contacted" && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: req.id, status: "approved" })}
                          disabled={updateStatusMutation.isPending}
                          className="btn-luxury flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/15 text-green-400 text-xs font-semibold border border-green-500/20 hover:bg-green-500/25 transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      {(req.status === "pending" || req.status === "contacted") && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: req.id, status: "rejected" })}
                          disabled={updateStatusMutation.isPending}
                          className="btn-luxury flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 text-red-400 text-xs font-semibold border border-red-500/20 hover:bg-red-500/25 transition-all disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      )}
                      {req.phone && (
                        <button
                          onClick={() => handleWhatsApp(req)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-all"
                          title="Contact via WhatsApp"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Delete this import request permanently?")) deleteMutation.mutate(req.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        title="Delete request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(req.created_at).toLocaleDateString()} {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
