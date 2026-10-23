import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Handshake, Loader2, Send, Tag, MessageSquareQuote, BadgeCheck, Info, RotateCcw,
  Timer, ShieldAlert, Lock,
} from "lucide-react";
import type { Car } from "@/lib/types";
import { formatPKRShort } from "@/lib/importDuty";
import {
  createSession,
  evaluateOffer,
  openingMessage,
  roundsRemaining,
  statusLabel,
  type NegotiationState,
} from "@/lib/negotiationEngine";
import { generateAgentReply } from "@/services/negotiationService";
import { saveNegotiationSession } from "@/services/negotiationLogService";
import TestDriveBooking from "@/components/TestDriveBooking";

interface Props {
  car: Car;
  isOpen: boolean;
  onClose: () => void;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const inputClass =
  "w-full bg-secondary text-foreground border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

const QUICK_REPLIES = [
  "What is your best price?",
  "Can you include free registration?",
  "That is still too high for me.",
  "Alright, I accept.",
];

export default function NegotiationAssistantDialog({ car, isOpen, onClose }: Props) {
  const [session, setSession] = useState<NegotiationState>(() => createSession(car));
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [tooLowSuggestion, setTooLowSuggestion] = useState<number | null>(null);
  const [agreedPrice, setAgreedPrice] = useState<number | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const threadRef = useRef<HTMLDivElement>(null);

  const config = session.config;
  const listed = config.listedPrice;

  const start = useMemo(
    () => () => {
      const fresh = createSession(car);
      setSession(fresh);
      setMessages([{ role: "assistant", content: openingMessage(car, fresh.config) }]);
      setInput("");
      setUsedFallback(false);
      setTooLowSuggestion(null);
      setAgreedPrice(null);
      setSessionId(crypto.randomUUID());
    },
    [car],
  );

  useEffect(() => {
    if (isOpen) start();
  }, [isOpen, start]);

  const scrollDown = () =>
    requestAnimationFrame(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
    });

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || busy || session.status === "ACCEPTED" || session.status === "REJECTED") return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((p) => [...p, { role: "user", content: msg }]);
    setInput("");
    setBusy(true);
    scrollDown();

    const { decision, state } = evaluateOffer(session, msg, car.name);
    setSession(state);
    setTooLowSuggestion(decision.action === "REJECT_TOO_LOW" ? decision.suggestedMinimumOffer : null);
    if (decision.action === "ACCEPT") setAgreedPrice(decision.allowedQuotePrice);
    const reply = await generateAgentReply(car, state, decision, msg, history);
    if (reply.source === "fallback") setUsedFallback(true);
    const transcript: Msg[] = [
      ...history,
      { role: "user", content: msg },
      { role: "assistant", content: reply.text },
    ];
    setMessages(transcript);
    void saveNegotiationSession(sessionId, car, state, transcript);
    setBusy(false);
    scrollDown();
  };

  const closedDeal = session.status === "ACCEPTED" || session.status === "REJECTED" || session.status === "ESCALATED";

  const statusCards = [
    { icon: Tag, label: "Listed price", value: formatPKRShort(listed) },
    {
      icon: MessageSquareQuote,
      label: "Your offer",
      value: session.customerOffer ? formatPKRShort(session.customerOffer) : "Not shared yet",
    },
    {
      icon: BadgeCheck,
      label: session.status === "ACCEPTED" ? "Agreed price" : "Our current offer",
      value:
        session.status === "OPENING"
          ? formatPKRShort(listed)
          : formatPKRShort(session.currentCounterOffer),
    },
    {
      icon: Timer,
      label: "Rounds remaining",
      value: closedDeal ? "Closed" : `${roundsRemaining(session)} of ${config.maxRounds}`,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border/40 p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-grotesk font-bold flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-primary" /> Negotiate Price
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {car.name} · Sales representative · {statusLabel(session.status)}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {listed <= 0 || !config.enabled ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Price discussion is not available online for this vehicle. Please contact the showroom directly.
              </p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {statusCards.map((c) => (
                    <div
                      key={c.label}
                      className="rounded-xl border border-border/40 bg-secondary/40 p-4 hover:border-primary/40 transition-colors"
                    >
                      <c.icon className="w-4 h-4 text-primary mb-2" />
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
                      <p className="text-sm font-grotesk font-bold text-gradient-gold mt-1 leading-snug">{c.value}</p>
                    </div>
                  ))}
                </div>

                <div
                  ref={threadRef}
                  className="h-72 sm:h-80 overflow-y-auto space-y-3 rounded-xl border border-border/40 bg-secondary/20 p-3"
                >
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`max-w-[90%] rounded-xl px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${
                        m.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground/90 border border-border/40"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  {busy && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reviewing your offer…
                    </div>
                  )}
                </div>

                {tooLowSuggestion && !closedDeal && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
                    <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-foreground/80">
                      <p className="font-semibold text-foreground">That offer is too low for this vehicle.</p>
                      <p className="mt-1">
                        Offers from around{" "}
                        <span className="font-grotesk font-bold text-gradient-gold">
                          {formatPKRShort(tooLowSuggestion)}
                        </span>{" "}
                        can be considered. Share a figure in that range and we can continue.
                      </p>
                      <button
                        onClick={() => send(`I can offer ${formatPKRShort(tooLowSuggestion)}`)}
                        disabled={busy}
                        className="mt-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground disabled:opacity-50"
                      >
                        Offer {formatPKRShort(tooLowSuggestion)}
                      </button>
                    </div>
                  </div>
                )}

                {session.status === "ACCEPTED" && agreedPrice && (
                  <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Deal reached</p>
                    <p className="text-lg font-grotesk font-bold text-gradient-gold mt-1">
                      {formatPKRShort(agreedPrice)}
                    </p>
                    <button
                      onClick={() => setShowBooking(true)}
                      className="btn-luxury mt-3 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" /> Lock this price & book a consultation
                    </button>
                  </div>
                )}

                {!closedDeal && (
                  <div className="flex flex-wrap gap-2">
                    {QUICK_REPLIES.map((q) => (
                      <button
                        key={q}
                        disabled={busy}
                        onClick={() => send(q)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold glass border border-border/40 text-foreground hover:border-primary/50 disabled:opacity-50 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {closedDeal ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs text-foreground/80">
                    {session.status === "ACCEPTED"
                      ? "This discussion is agreed in principle. Our team will confirm the final paperwork with you."
                      : session.status === "ESCALATED"
                      ? "Your offer has been referred to our sales manager for a personal review."
                      : "This negotiation has been closed. You are welcome to start again or explore other vehicles."}
                    <button
                      onClick={start}
                      className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Start a new discussion
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      send(input);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      className={inputClass}
                      placeholder="Type your offer, e.g. 4.8 crore…"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={busy}
                    />
                    <button
                      type="submit"
                      disabled={busy || !input.trim()}
                      aria-label="Send"
                      className="px-4 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}

                {usedFallback && (
                  <p className="text-[11px] text-muted-foreground">
                    Live assistance is limited right now — replies are generated by our standard pricing desk.
                  </p>
                )}

                <p className="text-[11px] text-muted-foreground flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Any figure discussed here is subject to final confirmation, availability and standard documentation.
                </p>
              </div>
            )}
            <TestDriveBooking
              carId={car.id}
              carName={car.name}
              isOpen={showBooking}
              onClose={() => setShowBooking(false)}
              agreedPrice={agreedPrice ? formatPKRShort(agreedPrice) : null}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
