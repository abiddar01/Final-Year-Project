import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Briefcase,
  Building2,
  Check,
  CircleDot,
  Coins,
  Cpu,
  Crown,
  Droplets,
  Feather,
  Flag,
  Flame,
  Fuel,
  Gauge,
  Gem,
  Leaf,
  Loader2,
  Mountain,
  Package,
  Route,
  Scale,
  Shuffle,
  Smartphone,
  Sparkles,
  Sprout,
  Target,
  TrendingDown,
  User,
  Users,
  UsersRound,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Car, QuizAnswer } from "@/lib/types";
import { type ScoreBreakdown } from "@/lib/matchingEngine";
import { getRecommendations } from "@/services/recommendationService";
import { buildLifestyleProfile, buildAdvisorExplanation, type LifestyleProfile } from "@/lib/lifestyleProfile";
import MatchResults from "@/components/MatchResults";

/* -------------------------------------------------------------------------- */
/*  Questions                                                                 */
/* -------------------------------------------------------------------------- */

type Option = { value: string; label: string; desc: string; icon: LucideIcon };
type Question = { key: keyof QuizAnswer; short: string; advisor: string; options: Option[] };

const questions: Question[] = [
  {
    key: "lifestyle",
    short: "Lifestyle",
    advisor: "Let's find a car that actually fits your life. Which of these sounds most like you?",
    options: [
      { value: "urban", label: "Urban Professional", desc: "City commuting and easy parking", icon: Building2 },
      { value: "adventure", label: "Weekend Explorer", desc: "Road trips and rougher roads", icon: Mountain },
      { value: "family", label: "Family First", desc: "Safety and space for the family", icon: Users },
      { value: "executive", label: "Business Executive", desc: "Prestige and refined comfort", icon: Briefcase },
      { value: "sporty", label: "Performance Lover", desc: "Speed, power, handling", icon: Flag },
      { value: "eco", label: "Eco Conscious", desc: "Efficiency and lower running cost", icon: Leaf },
    ],
  },
  {
    key: "budget_range",
    short: "Budget",
    advisor: "What budget are you comfortable with in PKR?",
    options: [
      { value: "under_2cr", label: "Under PKR 2 Crore", desc: "Entry luxury segment", icon: Banknote },
      { value: "2cr_5cr", label: "PKR 2-5 Crore", desc: "Mid luxury segment", icon: Coins },
      { value: "5cr_10cr", label: "PKR 5-10 Crore", desc: "Premium luxury", icon: Gem },
      { value: "over_10cr", label: "PKR 10 Crore+", desc: "Ultra luxury and exotic", icon: Crown },
    ],
  },
  {
    key: "family_size",
    short: "Passengers",
    advisor: "How many people will usually be in the car with you?",
    options: [
      { value: "2", label: "Just 1-2", desc: "Solo or with a partner", icon: User },
      { value: "4", label: "3-4 People", desc: "Small family", icon: Users },
      { value: "6", label: "5 or more", desc: "Larger family or group", icon: UsersRound },
    ],
  },
  {
    key: "city_highway",
    short: "Where you drive",
    advisor: "Where will you be driving most of the time?",
    options: [
      { value: "city", label: "Mostly City", desc: "Urban roads and traffic", icon: Building2 },
      { value: "highway", label: "Mostly Highway", desc: "Long-distance cruising", icon: Route },
      { value: "both", label: "A Mix of Both", desc: "City and highway", icon: Shuffle },
    ],
  },
  {
    key: "driving_style",
    short: "Driving style",
    advisor: "How would you describe the way you drive?",
    options: [
      { value: "calm", label: "Relaxed", desc: "Smooth and steady", icon: Feather },
      { value: "balanced", label: "Balanced", desc: "Versatile across moods", icon: Scale },
      { value: "aggressive", label: "Sporty", desc: "Quick and dynamic", icon: Flame },
    ],
  },
  {
    key: "fuel_preference",
    short: "Fuel",
    advisor: "Any preference on what powers the car?",
    options: [
      { value: "gasoline", label: "Petrol", desc: "Traditional performance", icon: Fuel },
      { value: "diesel", label: "Diesel", desc: "Torque and efficiency", icon: Droplets },
      { value: "hybrid", label: "Hybrid", desc: "Best of both worlds", icon: Sprout },
      { value: "electric", label: "Electric", desc: "Zero emissions", icon: Zap },
    ],
  },
  {
    key: "priority",
    short: "Top priority",
    advisor: "When you have to pick one, what matters most to you?",
    options: [
      { value: "luxury", label: "Luxury & Prestige", desc: "Premium feel and presence", icon: Sparkles },
      { value: "performance", label: "Performance", desc: "Speed, power, handling", icon: Gauge },
      { value: "space", label: "Space & Practicality", desc: "Room for people and luggage", icon: Package },
      { value: "efficiency", label: "Efficiency", desc: "Lower fuel and running cost", icon: TrendingDown },
    ],
  },
  {
    key: "luxury_importance",
    short: "Luxury",
    advisor: "How important is a luxury cabin to you?",
    options: [
      { value: "low", label: "Not Important", desc: "Function over form", icon: Wrench },
      { value: "medium", label: "Moderate", desc: "Nice features matter", icon: Target },
      { value: "high", label: "Very Important", desc: "Premium is a must", icon: Gem },
    ],
  },
  {
    key: "tech_importance",
    short: "Technology",
    advisor: "Last one. How tech-forward should the car be?",
    options: [
      { value: "low", label: "Keep it Simple", desc: "Basics are fine", icon: CircleDot },
      { value: "medium", label: "Modern Features", desc: "Digital displays, navigation", icon: Smartphone },
      { value: "high", label: "Cutting Edge", desc: "Latest tech required", icon: Cpu },
    ],
  },
];

const labelFor = (q: Question, value: unknown) =>
  value === undefined ? undefined : q.options.find((o) => o.value === String(value))?.label;

/* -------------------------------------------------------------------------- */
/*  Side rail: the brief building up as you answer                            */
/* -------------------------------------------------------------------------- */

function BriefRail({
  step,
  reached,
  answers,
  onJump,
}: {
  step: number;
  reached: number;
  answers: Partial<QuizAnswer>;
  onJump: (i: number) => void;
}) {
  const answeredCount = questions.filter((q) => answers[q.key] !== undefined).length;

  return (
    <aside className="glass hidden rounded-3xl p-6 lg:sticky lg:top-28 lg:block" aria-label="Your answers so far">
      <div className="mb-5">
        <h2 className="font-grotesk text-lg font-semibold">Your brief</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {answeredCount} of {questions.length} answered
        </p>
      </div>

      <ol className="relative">
        <span className="absolute bottom-4 left-[11px] top-4 w-px bg-border/50" aria-hidden="true" />
        {questions.map((q, i) => {
          const answer = labelFor(q, answers[q.key]);
          const current = i === step;
          const reachable = i <= reached;
          return (
            <li key={q.key} className="relative">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onJump(i)}
                aria-current={current ? "step" : undefined}
                className="flex w-full items-start gap-3 rounded-lg py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-default"
              >
                <span
                  className={`relative z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border bg-background transition-colors ${
                    current
                      ? "border-primary"
                      : answer
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60"
                  }`}
                >
                  {current ? (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  ) : answer ? (
                    <Check className="h-3 w-3" aria-hidden="true" />
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-sm leading-snug transition-colors ${
                      current ? "font-medium text-foreground" : answer ? "text-foreground/80" : "text-muted-foreground/60"
                    }`}
                  >
                    {q.short}
                  </span>
                  {answer && <span className="block truncate text-xs text-primary">{answer}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 border-t border-border/40 pt-4 text-xs leading-relaxed text-muted-foreground">
        Every car is scored on eight factors, from budget and seating to fuel and features.
      </p>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/*  Matching progress (shown while results are computed)                      */
/* -------------------------------------------------------------------------- */

function MatchingProgress({ count, recap }: { count: number; recap: string[] }) {
  const steps = [
    "Reading your lifestyle profile",
    count > 0 ? `Scanning ${count} cars in live inventory` : "Scanning live inventory",
    "Scoring budget, comfort, performance and fuel fit",
    "Ranking your top matches",
  ];
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, 3)), 600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="glass-strong rounded-3xl p-6 md:p-10" role="status" aria-live="polite">
      <h2 className="font-grotesk text-2xl font-semibold mb-1.5">Finding your matches</h2>
      <p className="mb-8 text-sm text-muted-foreground">This takes a few seconds.</p>

      <ul className="max-w-md">
        {steps.map((s, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li key={s} className="flex items-center gap-3 py-2.5">
              {done ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
              ) : active ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              ) : (
                <span className="h-5 w-5 rounded-full border border-border/50" />
              )}
              <span
                className={`text-sm transition-colors ${
                  active ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/50"
                }`}
              >
                {s}
              </span>
            </li>
          );
        })}
      </ul>

      {recap.length > 0 && (
        <div className="mt-9 border-t border-border/40 pt-6">
          <p className="mb-3 text-xs text-muted-foreground">Based on your answers</p>
          <div className="flex flex-wrap gap-2">
            {recap.map((r, i) => (
              <span key={i} className="rounded-full border border-border/50 px-3 py-1 text-xs text-foreground/80">
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function LifestyleMatch() {
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswer>>({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{ car: Car; breakdown: ScoreBreakdown; explanation: string }[]>([]);
  const [profile, setProfile] = useState<LifestyleProfile | null>(null);
  const [computing, setComputing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [recap, setRecap] = useState<string[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [engineNotice, setEngineNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: cars } = useQuery({
    queryKey: ["cars"],
    queryFn: async () => {
      const { data } = await supabase.from("cars").select("*");
      return (data ?? []) as Car[];
    },
  });

  const currentQ = questions[step];
  const currentAnswer = answers[currentQ.key];
  const carCount = cars?.length ?? 0;

  const advance = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
      setReached((r) => Math.max(r, step + 1));
    } else {
      finalize(answers as QuizAnswer);
    }
  };

  const selectOption = (value: string) => {
    if (locked || computing) return;
    const key = currentQ.key;
    const newAnswers = { ...answers, [key]: key === "family_size" ? parseInt(value) : value };
    setAnswers(newAnswers);
    setLocked(true);
    // A short beat so the selection registers before the next question slides in
    timer.current = setTimeout(
      () => {
        setLocked(false);
        if (step < questions.length - 1) {
          setStep(step + 1);
          setReached((r) => Math.max(r, step + 1));
        } else {
          finalize(newAnswers as QuizAnswer);
        }
      },
      reduceMotion ? 0 : 260,
    );
  };

  const finalize = async (fullAnswers: QuizAnswer) => {
    setComputing(true);
    setEngineNotice(null);
    setRecap(
      questions
        .map((q) => labelFor(q, fullAnswers[q.key]))
        .filter((l): l is string => Boolean(l)),
    );

    try {
      // Kept on purpose so the progress steps can play through
      await new Promise((r) => setTimeout(r, 2400));

      const lifestyleProfile = buildLifestyleProfile(fullAnswers);
      const inventory = cars ?? [];

      const { recommendations, fallbackReason } = await getRecommendations(inventory, fullAnswers, 4);

      const scored = recommendations.map(({ car, breakdown }) => ({
        car,
        breakdown,
        explanation: buildAdvisorExplanation(car, breakdown, fullAnswers, lifestyleProfile),
      }));

      if (fallbackReason) {
        setEngineNotice("Recommendation service unavailable. Scored with the built-in engine.");
      }

      setResults(scored);
      setProfile(lifestyleProfile);
      setShowResults(true);

      void supabase.from("user_preferences").insert({
        session_id: sessionId,
        ...fullAnswers,
        recommendations: scored.map((r) => ({ id: r.car.id, score: r.breakdown.total })),
      });
    } catch (err) {
      console.error("Matching failed:", err);
      toast.error("We couldn't finish your matches. Please try again.");
    } finally {
      setComputing(false);
    }
  };

  const restart = () => {
    setStep(0);
    setReached(0);
    setAnswers({});
    setShowResults(false);
    setResults([]);
    setProfile(null);
    setRecap([]);
  };

  // Keyboard: 1..n picks an option, left arrow goes back
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e) => {
    if (showResults || computing || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const n = parseInt(e.key);
    if (n >= 1 && n <= currentQ.options.length) selectOption(currentQ.options[n - 1].value);
    if (e.key === "ArrowLeft" && step > 0) setStep(step - 1);
  };
  useEffect(() => {
    const fn = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (showResults) window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [showResults, reduceMotion]);

  const gridClass = currentQ.options.length === 3 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className="container mx-auto min-h-[80vh] px-4 py-10 md:py-14">
      <div className={`mx-auto ${showResults ? "max-w-3xl" : "max-w-5xl"}`}>
        {/* Header */}
        <header className="mb-8 md:mb-10 max-w-2xl">
          <h1 className="font-grotesk text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {showResults ? "Your matches" : "Find the car that fits your life"}
          </h1>
          <p className="text-base md:text-lg leading-relaxed text-muted-foreground">
            {showResults
              ? "Ranked from our live inventory against your answers, each with the reason it made the list."
              : "Nine short questions. Every car in our live inventory is scored against your answers, and each match comes with a plain-English reason."}
          </p>
          {!showResults && (
            <p className="mt-4 inline-flex items-center gap-2.5 rounded-full border border-border/50 bg-secondary/30 px-3.5 py-1.5 text-sm text-foreground/90">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              {carCount > 0 ? `AI advisor, scoring against ${carCount} live cars` : "AI advisor, loading live inventory"}
            </p>
          )}
        </header>

        {!showResults ? (
          <div className="grid items-start gap-8 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
            <BriefRail
              step={step}
              reached={reached}
              answers={answers}
              onJump={(i) => !computing && setStep(i)}
            />

            <div className="min-w-0">
              {/* Mobile progress */}
              <div className="mb-4 lg:hidden">
                <div className="mb-2 flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>
                    Question {step + 1} of {questions.length}
                  </span>
                  <span>{currentQ.short}</span>
                </div>
                <div className="flex gap-1" aria-hidden="true">
                  {questions.map((q, i) => (
                    <span
                      key={q.key}
                      className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-secondary"}`}
                    />
                  ))}
                </div>
              </div>

              {computing ? (
                <MatchingProgress count={carCount} recap={recap} />
              ) : (
                <section className="glass-strong rounded-3xl p-6 md:p-9 lg:min-h-[30rem]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={step}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <p className="mb-3 hidden text-sm text-muted-foreground tabular-nums lg:block">
                        Question {step + 1} of {questions.length}
                      </p>
                      <h2 className="mb-7 max-w-[30ch] font-grotesk text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
                        {currentQ.advisor}
                      </h2>

                      <div className={`grid gap-3 ${gridClass}`}>
                        {currentQ.options.map((opt, i) => {
                          const selected = currentAnswer !== undefined && String(currentAnswer) === opt.value;
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => selectOption(opt.value)}
                              aria-pressed={selected}
                              className={`group flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                                selected
                                  ? "border-primary bg-primary/10"
                                  : "border-border/40 bg-secondary/20 hover:border-primary/50 hover:bg-secondary/40"
                              }`}
                            >
                              <span
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                  selected
                                    ? "border-primary/60 bg-primary/10 text-primary"
                                    : "border-border/50 text-muted-foreground group-hover:text-primary"
                                }`}
                              >
                                <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[15px] font-medium leading-tight text-foreground">
                                  {opt.label}
                                </span>
                                <span className="mt-1 block text-xs leading-snug text-muted-foreground">{opt.desc}</span>
                              </span>
                              {selected ? (
                                <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                              ) : (
                                <kbd className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/50 font-sans text-[11px] text-muted-foreground tabular-nums sm:flex">
                                  {i + 1}
                                </kbd>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                        {step > 0 ? (
                          <button
                            type="button"
                            onClick={() => setStep(step - 1)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                          >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Previous
                          </button>
                        ) : (
                          <span className="hidden text-xs text-muted-foreground sm:block">
                            Tip: press a number key to choose
                          </span>
                        )}

                        {currentAnswer !== undefined && !locked && (
                          <button
                            type="button"
                            onClick={advance}
                            className="btn-luxury inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            {step === questions.length - 1 ? "Show my matches" : "Keep answer and continue"}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </section>
              )}
            </div>
          </div>
        ) : (
          profile && (
            <>
              {engineNotice && <p className="mb-4 text-center text-xs text-muted-foreground">{engineNotice}</p>}
              <MatchResults results={results} profile={profile} answers={answers as QuizAnswer} onRestart={restart} />
            </>
          )
        )}
      </div>
    </div>
  );
}