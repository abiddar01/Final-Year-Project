import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Handshake, Loader2, Filter, Trash2, Car, ChevronDown, ChevronUp,
  Clock, CheckCircle2, XCircle, UserCheck, MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPKRShort } from "@/lib/importDuty";
import { statusLabel, type NegotiationStatus } from "@/lib/negotiationEngine";

interface TranscriptEntry {
  role: "user" | "assistant";
  content: string;
}

interface NegotiationRow {
  id: string;
  session_id: string;
  car_name: string;
  status: NegotiationStatus;
  rounds_used: number;
  max_rounds: number;
  listed_price: number;
  customer_offer: number | null;
  counter_offer: number | null;
  agreed_price: number | null;
  transcript: TranscriptEntry[];
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  ACCEPTED: "bg-green-500/15 text-green-400 border-green-500/20",
  ESCALATED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  REJECTED: "bg-destructive/15 text-destructive border-destructive/20",
  FINAL_OFFER: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
};

const statusIcons: Record<string, typeof Clock> = {
  ACCEPTED: CheckCircle2,
  ESCALATED: UserCheck,
  REJECTED: XCircle,
};

const FILTERS = ["all", "ACCEPTED", "ESCALATED", "REJECTED", "active"] as const;

export default function AdminNegotiations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["admin-negotiations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("negotiation_sessions")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as NegotiationRow[];
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("negotiation_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-negotiations"] });
      toast({ title: "Negotiation record deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = (sessions ?? []).filter((s) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active")
      return !["ACCEPTED", "REJECTED", "ESCALATED"].includes(s.status);
    return s.status === statusFilter;
  });

  const countFor = (f: string) =>
    f === "all"
      ? sessions?.length ?? 0
      : f === "active"
      ? sessions?.filter((s) => !["ACCEPTED", "REJECTED", "ESCALATED"].includes(s.status)).length ?? 0
      : sessions?.filter((s) => s.status === f).length ?? 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${
              statusFilter === f
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-secondary/30 text-muted-foreground border-border/20 hover:border-border/40"
            }`}
          >
            {f === "active" ? "In discussion" : f === "all" ? "All" : statusLabel(f as NegotiationStatus)} ({countFor(f)})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Handshake className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No negotiation sessions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => {
            const StatusIcon = statusIcons[s.status] || Clock;
            const color =
              statusColors[s.status] ?? "bg-muted/30 text-muted-foreground border-border/30";
            const isOpen = expanded === s.id;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-2xl border border-border/30 p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Car className="w-4 h-4 text-primary flex-shrink-0" />
                      <p className="font-grotesk font-bold text-sm text-foreground">{s.car_name}</p>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold border ${color}`}
                      >
                        <StatusIcon className="w-3 h-3" /> {statusLabel(s.status)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {new Date(s.updated_at).toLocaleString("en-PK", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · Round {s.rounds_used} of {s.max_rounds}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setExpanded(isOpen ? null : s.id)}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="View transcript"
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteSession.mutate(s.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  {[
                    { label: "Listed", value: formatPKRShort(s.listed_price) },
                    {
                      label: "Customer offer",
                      value: s.customer_offer ? formatPKRShort(s.customer_offer) : "—",
                    },
                    {
                      label: "Counter offer",
                      value: s.counter_offer ? formatPKRShort(s.counter_offer) : "—",
                    },
                    {
                      label: s.status === "ACCEPTED" ? "Agreed price" : "Agreed",
                      value: s.agreed_price ? formatPKRShort(s.agreed_price) : "—",
                    },
                  ].map((f) => (
                    <div key={f.label} className="rounded-xl bg-secondary/40 border border-border/20 p-2.5">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{f.label}</p>
                      <p
                        className={`text-xs font-grotesk font-bold mt-0.5 ${
                          f.label.includes("Agreed") && s.agreed_price
                            ? "text-gradient-gold"
                            : "text-foreground"
                        }`}
                      >
                        {f.value}
                      </p>
                    </div>
                  ))}
                </div>

                {isOpen && (
                  <div className="mt-3 rounded-xl border border-border/30 bg-secondary/20 p-3 max-h-64 overflow-y-auto space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" /> Transcript
                    </p>
                    {s.transcript.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No messages recorded.</p>
                    ) : (
                      s.transcript.map((m, j) => (
                        <div
                          key={j}
                          className={`max-w-[90%] rounded-lg px-2.5 py-1.5 text-[11px] whitespace-pre-wrap leading-relaxed ${
                            m.role === "user"
                              ? "ml-auto bg-primary/15 text-foreground"
                              : "bg-secondary text-foreground/80 border border-border/30"
                          }`}
                        >
                          {m.content}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
