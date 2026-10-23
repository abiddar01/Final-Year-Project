import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Car, User } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: "Show available cars", message: "Show me all available cars" },
  { label: "Book a test drive", message: "I want to book a test drive" },
  { label: "Most popular car", message: "What is the most popular car?" },
];

const PAKISTANI_NAMES = [
  "Ahmed", "Fatima", "Hassan", "Ayesha", "Ali", "Zainab",
  "Bilal", "Maryam", "Usman", "Sana", "Hamza", "Hira",
  "Saad", "Noor", "Faisal", "Amna", "Raza", "Maham",
];

function getRandomName() {
  return PAKISTANI_NAMES[Math.floor(Math.random() * PAKISTANI_NAMES.length)];
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [botName] = useState(() => getRandomName());
  const [showTooltip, setShowTooltip] = useState(false);

  const GREETING: Msg = useMemo(() => ({
    role: "assistant",
    content: `Assalam o Alaikum! I'm ${botName} from Elegance Wheels.\n\nI can help you:\n• Explore available cars\n• Compare vehicles\n• Book test drives\n\nHow can I assist you today?`,
    timestamp: new Date(),
  }), [botName]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Initialize messages with greeting
  useEffect(() => {
    setMessages([GREETING]);
  }, [GREETING]);

  // Show tooltip periodically when chat is closed
  useEffect(() => {
    if (open) {
      setShowTooltip(false);
      return;
    }

    // Show tooltip after 3 seconds
    const initial = setTimeout(() => {
      setShowTooltip(true);
      // Hide after 5 seconds
      tooltipTimerRef.current = setTimeout(() => setShowTooltip(false), 5000);
    }, 3000);

    return () => {
      clearTimeout(initial);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg: Msg = { role: "user", content: msg, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/car-chat`;
      const allMessages = [...messages.filter((m, i) => i > 0 || m !== GREETING), userMsg];
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed to connect");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              const ts = new Date();
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last !== GREETING) {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent, timestamp: ts }];
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't access the vehicle catalogue right now.\n\nPlease try again in a moment.", timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Floating Button with Tooltip */}
      <div className={`fixed bottom-6 right-6 z-50 ${open ? "hidden" : ""}`}>
        {/* Tooltip popup */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-16 right-0 w-52 px-4 py-3 rounded-2xl border border-primary/20 text-xs text-foreground"
              style={{
                background: "hsla(240, 12%, 10%, 0.95)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 10px 30px -5px hsla(38, 92%, 55%, 0.2)",
              }}
            >
              <p className="font-semibold text-primary mb-0.5">Hey! I'm {botName} 👋</p>
              <p className="text-muted-foreground leading-snug">Need help finding your dream car? Tap here!</p>
              {/* Arrow */}
              <div
                className="absolute -bottom-2 right-6 w-4 h-4 rotate-45 border-r border-b border-primary/20"
                style={{ background: "hsla(240, 12%, 10%, 0.95)" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center gold-glow hover:scale-110 transition-transform"
          whileTap={{ scale: 0.9 }}
          aria-label="Chat with us"
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[560px] flex flex-col rounded-3xl overflow-hidden border border-border/40"
            style={{
              background: "hsla(240, 12%, 8%, 0.92)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              boxShadow: "0 25px 60px -15px hsla(38, 92%, 55%, 0.15), 0 0 40px -10px hsla(0,0%,0%,0.5)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground font-grotesk">{botName}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-[11px] text-muted-foreground">Online • Elegance Wheels</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <Car className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div className="max-w-[78%]">
                    <div
                      className={`px-4 py-3 text-[13px] leading-relaxed whitespace-pre-line ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                          : "bg-secondary/60 text-foreground rounded-2xl rounded-bl-md border border-border/20"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <p className={`text-[10px] text-muted-foreground/50 mt-1 ${msg.role === "user" ? "text-right" : ""}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center mt-0.5 border border-border/30">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex-shrink-0 flex items-center justify-center">
                    <Car className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-secondary/60 border border-border/20">
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 1, 2].map((d) => (
                        <motion.div
                          key={d}
                          className="w-1.5 h-1.5 rounded-full bg-primary/60"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {messages.length <= 1 && !loading && (
              <div className="px-4 pb-2 flex gap-2 flex-wrap">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => send(action.message)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-border/30">
              <div className="flex gap-2 items-center">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask about our vehicles..."
                  className="flex-1 bg-secondary/50 text-foreground border border-border/30 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 placeholder:text-muted-foreground/50 transition-all"
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:scale-105 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
