import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Mail, Phone, MessageSquare, Clock, CheckCircle2, Archive,
  Loader2, Filter, Trash2, User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContactMessage {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  new: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  read: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  archived: "bg-muted/30 text-muted-foreground border-border/30",
};

const statusIcons: Record<string, any> = {
  new: Clock,
  read: CheckCircle2,
  archived: Archive,
};

export default function AdminContactMessages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: messages, isLoading } = useQuery({
    queryKey: ["admin-contact-messages", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ContactMessage[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMsg = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
      toast({ title: "Message deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statuses = ["all", "new", "read", "archived"];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {statuses.map((s) => {
          const count = s === "all"
            ? (messages?.length ?? 0)
            : messages?.filter((m) => m.status === s).length ?? 0;
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

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !messages || messages.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No contact messages found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg, i) => {
            const StatusIcon = statusIcons[msg.status] || Clock;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-2xl border border-border/20 hover:border-primary/15 transition-all p-5"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{msg.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{msg.email}</p>
                      </div>
                    </div>
                    {msg.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <Phone className="w-3.5 h-3.5 text-primary" /> {msg.phone}
                      </div>
                    )}
                    <div className="flex items-start gap-1.5 text-sm text-foreground/80 mt-2 p-3 rounded-xl bg-secondary/30 border border-border/20">
                      <MessageSquare className="w-3.5 h-3.5 text-primary mt-1 flex-shrink-0" />
                      <span className="whitespace-pre-wrap break-words">{msg.message}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize ${statusColors[msg.status] || statusColors.new}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {msg.status}
                    </span>
                    <div className="flex items-center gap-2">
                      {msg.status === "new" && (
                        <button
                          onClick={() => updateStatus.mutate({ id: msg.id, status: "read" })}
                          disabled={updateStatus.isPending}
                          className="btn-luxury flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/15 text-blue-400 text-xs font-semibold border border-blue-500/20 hover:bg-blue-500/25 transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Read
                        </button>
                      )}
                      {msg.status !== "archived" && (
                        <button
                          onClick={() => updateStatus.mutate({ id: msg.id, status: "archived" })}
                          disabled={updateStatus.isPending}
                          className="btn-luxury flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/40 text-muted-foreground text-xs font-semibold border border-border/30 hover:text-foreground transition-all disabled:opacity-50"
                        >
                          <Archive className="w-3.5 h-3.5" /> Archive
                        </button>
                      )}
                      <a
                        href={`mailto:${msg.email}`}
                        className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                        title="Reply by email"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => {
                          if (confirm("Delete this message permanently?")) deleteMsg.mutate(msg.id);
                        }}
                        disabled={deleteMsg.isPending}
                        className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(msg.created_at).toLocaleDateString()} {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
