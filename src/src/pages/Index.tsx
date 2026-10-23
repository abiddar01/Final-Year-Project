import { Link } from "react-router-dom";
import {
  motion,
  MotionConfig,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useMotionTemplate,
  type MotionValue,
} from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageSquareText,
  Wand2,
  KeyRound,
  Check,
  Gauge,
  CalendarCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRef, type ReactNode, type MouseEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-car.jpg";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import AnimatedCounter from "@/components/AnimatedCounter";
import { LuxuryLogo } from "@/components/Layout";
import { FEATURES } from "@/lib/featureFlags";
import type { Car as CarType } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ───────────────────────── Small building blocks ───────────────────────── */

/** Top-of-page gold progress line. */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-primary/0 via-primary to-primary z-[60]"
    />
  );
}

/** Each line slides up out of a mask — the "film title" reveal. */
function MaskLine({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
      <motion.span
        initial={{ y: "115%", rotate: 2 }}
        animate={{ y: "0%", rotate: 0 }}
        transition={{ duration: 1.1, delay, ease: EASE }}
        className={`block ${className}`}
      >
        {children}
      </motion.span>
    </span>
  );
}

function FadeIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Button that gently pulls toward the cursor. */
function Magnetic({ children, strength = 0.25 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });

  const onMove = (e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div ref={ref} style={{ x, y }} onMouseMove={onMove} onMouseLeave={reset} className="inline-block">
      {children}
    </motion.div>
  );
}

/** Infinite brand ticker. Outline text that fills with gold on hover. */
function BrandMarquee({ brands }: { brands: string[] }) {
  const list = brands.length ? brands : ["Ferrari", "Lamborghini", "Porsche", "Bentley", "Rolls-Royce", "McLaren", "Aston Martin", "Mercedes-AMG"];
  const row = [...list, ...list];
  return (
    <div
      className="relative overflow-hidden py-10 border-y border-border/15"
      style={{ maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)" }}
    >
      <motion.div
        className="flex w-max gap-16 pr-16"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: Math.max(20, list.length * 5), ease: "linear", repeat: Infinity }}
      >
        {row.map((b, i) => (
          <span
            key={`${b}-${i}`}
            className="font-grotesk font-bold text-4xl md:text-6xl whitespace-nowrap text-transparent transition-colors duration-500 hover:text-primary cursor-default"
            style={{ WebkitTextStroke: "1px hsl(var(--muted-foreground) / 0.45)" }}
          >
            {b}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ───────────────────────── Pinned story helpers ───────────────────────── */

/** Fade/lift a block in and out across a scroll range. First/last blocks stay visible at the ends. */
function useStoryFade(
  progress: MotionValue<number>,
  [a, b]: [number, number],
  first = false,
  last = false,
  travel = 60,
  maxBlur = 12,
) {
  const pad = 0.05;
  const input = [a - pad, a + pad, b - pad, b + pad];
  const opacity = useTransform(progress, input, [first ? 1 : 0, 1, 1, last ? 1 : 0]);
  const y = useTransform(progress, input, [first ? 0 : travel, 0, 0, last ? 0 : -travel]);
  const blur = useTransform(progress, input, [first ? 0 : maxBlur, 0, 0, last ? 0 : maxBlur]);
  const filter = useMotionTemplate`blur(${blur}px)`;
  return { opacity, y, filter };
}

/** One text panel of the pinned "how it works" story. */
function StoryPanel({
  progress,
  range,
  icon: Icon,
  step,
  num,
  title,
  body,
  first,
  last,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  icon: typeof Wand2;
  step: string;
  num: string;
  title: string;
  body: string;
  first?: boolean;
  last?: boolean;
}) {
  const { opacity, y, filter } = useStoryFade(progress, range, first, last);

  return (
    <motion.div style={{ opacity, y, filter }} className="absolute inset-0 flex flex-col justify-center">
      {/* Ghost numeral */}
      <span
        aria-hidden
        className="absolute -top-6 -left-2 font-grotesk font-bold text-[10rem] md:text-[13rem] leading-none text-transparent select-none pointer-events-none"
        style={{ WebkitTextStroke: "1px hsl(var(--primary) / 0.16)" }}
      >
        {num}
      </span>

      <div className="relative flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center shadow-lg shadow-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{step}</span>
      </div>
      <h3 className="relative font-grotesk font-bold text-4xl md:text-6xl leading-[1.05] tracking-tight mb-6">{title}</h3>
      <p className="relative text-lg text-muted-foreground max-w-md leading-relaxed font-light">{body}</p>
    </motion.div>
  );
}

/** Rail dot that lights up once the story passes its position. */
function RailDot({ progress, at }: { progress: MotionValue<number>; at: number }) {
  const fill = useTransform(progress, [Math.max(0, at - 0.02), at + 0.01], [0, 1]);
  const glow = useTransform(fill, [0, 1], [0, 0.9]);
  return (
    <span
      className="absolute -left-[6px] w-[13px] h-[13px] rounded-full bg-background border border-primary/60"
      style={{ top: `calc(${at * 100}% - 6px)` }}
    >
      <motion.span style={{ opacity: fill }} className="absolute inset-[2px] rounded-full bg-primary" />
      <motion.span
        style={{ opacity: glow }}
        className="absolute -inset-2 rounded-full bg-primary/30 blur-md pointer-events-none"
      />
    </span>
  );
}

/* ───────────────────── Story visual: the "match engine" ───────────────────── */

/** A crossfading layer inside the visual card. */
function VisualLayer({
  progress,
  range,
  first,
  last,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  first?: boolean;
  last?: boolean;
  children: ReactNode;
}) {
  const { opacity, y, filter } = useStoryFade(progress, range, first, last, 28, 8);
  return (
    <motion.div
      style={{ opacity, y, filter }}
      className="absolute inset-0 pt-20 px-7 pb-16 flex flex-col justify-center pointer-events-none"
    >
      {children}
    </motion.div>
  );
}

/** Lifestyle chip that "selects" itself as you scroll. */

function Chip({
  progress,
  at,
  label,
}: {
  progress: MotionValue<number>;
  at: number;
  label: string;
}) {
  const selected = useTransform(progress, [at, at + 0.03], [0, 1]);

  const textColor = useTransform(
    selected,
    [0, 1],
    ["#a1a1aa", "#fbbf24"]
  );

  return (
    <motion.span
      className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium"
      style={{ color: textColor }}
    >
      {/* Golden selection background */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border border-amber-400/70 bg-amber-400/15 shadow-[0_0_20px_rgba(234,179,8,0.25)]"
        style={{ opacity: selected }}
      />

      {/* One tick and one label — no duplicate text */}
      <motion.span
        aria-hidden="true"
        className="relative z-10 flex items-center"
        style={{ opacity: selected }}
      >
        <Check className="h-3.5 w-3.5 stroke-[3]" />
      </motion.span>

      <span className="relative z-10 whitespace-nowrap">
        {label}
      </span>
    </motion.span>
  );
}

/** Ranked match row with an animated bar + counting percentage. */
function MatchRow({
  progress,
  start,
  end,
  name,
  tag,
  score,
  top,
}: {
  progress: MotionValue<number>;
  start: number;
  end: number;
  name: string;
  tag: string;
  score: number;
  top?: boolean;
}) {
  const scale = useTransform(progress, [start, end], [0, score / 100]);
  const raw = useTransform(progress, [start, end], [0, score]);
  const label = useTransform(raw, (v) => `${Math.round(v)}%`);
  const rowOpacity = useTransform(progress, [start - 0.03, start], [0, 1]);
  const rowY = useTransform(progress, [start - 0.03, start], [14, 0]);

  return (
    <motion.div
      style={{ opacity: rowOpacity, y: rowY }}
      className={`rounded-2xl border p-4 ${
        top ? "border-primary/40 bg-primary/[0.07] shadow-[0_0_40px_-12px_hsl(var(--primary)/0.6)]" : "border-border/20 bg-foreground/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="min-w-0">
          <p className="font-grotesk font-bold text-sm md:text-base truncate">{name}</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">{tag}</p>
        </div>
        <motion.span className={`font-grotesk font-bold text-2xl tabular-nums ${top ? "text-gradient-gold" : "text-foreground/80"}`}>
          {label}
        </motion.span>
      </div>
      <div className="h-1.5 rounded-full bg-border/25 overflow-hidden">
        <motion.div
          style={{ scaleX: scale }}
          className="h-full origin-left rounded-full bg-gradient-to-r from-primary/60 to-primary"
        />
      </div>
    </motion.div>
  );
}

/** Layer 1 — "Tell us how you live". */
function ProfileLayer({ progress }: { progress: MotionValue<number> }) {
  const chips = ["Daily commute", "Family weekends", "Track days", "Highway cruising", "City parking", "Weekend getaways"];
  const budget = useTransform(progress, [0.04, 0.28], [0.15, 0.72]);
  return (
    <VisualLayer progress={progress} range={[0, 0.33]} first>
      <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-4">How do you drive?</p>
      <div className="flex flex-wrap gap-2.5 mb-9">
        {chips.map((c, i) => (
          <Chip key={c} progress={progress} at={0.02 + i * 0.04} label={c} />
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Budget</p>
        <Gauge className="w-4 h-4 text-primary" />
      </div>
      <div className="relative h-2 rounded-full bg-border/25">
        <motion.div style={{ scaleX: budget }} className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-primary/50 to-primary" />
        <motion.span
          style={{ left: useTransform(budget, (v) => `${v * 100}%`) }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-background border-2 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.7)]"
        />
      </div>
    </VisualLayer>
  );
}

/** Layer 2 — "We match the car". Sample data: edit freely. */
function MatchLayer({ progress }: { progress: MotionValue<number> }) {
  return (
    <VisualLayer progress={progress} range={[0.33, 0.66]}>
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Your ranked shortlist</p>
      </div>
      <div className="space-y-3">
        <MatchRow progress={progress} start={0.37} end={0.47} name="Porsche 911 Carrera" tag="In showroom" score={96} top />
        <MatchRow progress={progress} start={0.42} end={0.54} name="Bentley Continental GT" tag="Available on import" score={91} />
        <MatchRow progress={progress} start={0.47} end={0.6} name="Mercedes-AMG GT" tag="In showroom" score={87} />
      </div>
    </VisualLayer>
  );
}

/** Layer 3 — "Drive it or import it". */
function DeliverLayer({ progress }: { progress: MotionValue<number> }) {
  const steps = ["Ordered", "Shipped", "Customs", "Delivered"];
  const line = useTransform(progress, [0.72, 0.96], [0, 1]);
  return (
    <VisualLayer progress={progress} range={[0.66, 1]} last>
      {/* Test drive ticket */}
      <div className="rounded-2xl border border-primary/30 bg-primary/[0.07] p-5 mb-6 shadow-[0_0_40px_-14px_hsl(var(--primary)/0.6)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-grotesk font-bold text-sm">Test drive confirmed</p>
            <p className="text-xs text-muted-foreground">Saturday · 11:00 AM</p>
          </div>
        </div>
        <div className="border-t border-dashed border-border/30 pt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary" /> Showroom, DHA Phase 6
        </div>
      </div>

      {/* Import tracker */}
      <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-5">Import tracker</p>
      <div className="relative px-1.5">
        <div className="absolute left-3 right-3 top-[7px] h-px bg-border/30" />
        <motion.div style={{ scaleX: line }} className="absolute left-3 right-3 top-[7px] h-px origin-left bg-primary" />
        <div className="relative flex justify-between">
          {steps.map((s, i) => (
            <TrackerDot key={s} progress={progress} at={0.72 + i * 0.075} label={s} />
          ))}
        </div>
      </div>
    </VisualLayer>
  );
}

function TrackerDot({ progress, at, label }: { progress: MotionValue<number>; at: number; label: string }) {
  const on = useTransform(progress, [at, at + 0.03], [0, 1]);
  return (
    <div className="flex flex-col items-center gap-2.5">
      <span className="relative w-[15px] h-[15px] rounded-full bg-background border border-primary/50">
        <motion.span style={{ opacity: on }} className="absolute inset-[2px] rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary))]" />
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

/** Small segmented step indicator at the bottom of the card. */
function StepSegment({ progress, range }: { progress: MotionValue<number>; range: [number, number] }) {
  const fill = useTransform(progress, range, [0, 1]);
  return (
    <div className="flex-1 h-[3px] rounded-full bg-border/25 overflow-hidden">
      <motion.div style={{ scaleX: fill }} className="h-full origin-left bg-primary" />
    </div>
  );
}

/** The visual card replacing the old left-right drifting car photo. */
function MatchEngine({ progress }: { progress: MotionValue<number> }) {
  const sweepY = useTransform(progress, [0, 1], ["-10%", "110%"]);
  return (
    <div className="hidden md:block relative h-[460px] rounded-[2rem] overflow-hidden glass border border-border/25 shadow-2xl shadow-primary/10">
      {/* Backdrop: faint grid + gold aura */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border) / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.35) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div aria-hidden className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/15 blur-[90px]" />
      <div aria-hidden className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-accent/10 blur-[90px]" />

      {/* Scan line tied to scroll */}
      <motion.div
        aria-hidden
        style={{ top: sweepY }}
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent shadow-[0_0_24px_hsl(var(--primary)/0.8)]"
      />

      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border/15 bg-background/30 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
        </div>
        <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Elegance AI · Match engine</span>
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-primary opacity-60 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-primary" />
        </span>
      </div>

      {/* Layers */}
      <ProfileLayer progress={progress} />
      <MatchLayer progress={progress} />
      <DeliverLayer progress={progress} />

      {/* Footer step segments */}
      <div className="absolute bottom-0 inset-x-0 z-10 flex gap-2 px-7 py-5">
        <StepSegment progress={progress} range={[0, 0.33]} />
        <StepSegment progress={progress} range={[0.33, 0.66]} />
        <StepSegment progress={progress} range={[0.66, 1]} />
      </div>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function Index() {
  /* Hero: parallax + cursor spotlight */
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroProgress, [0, 1], [0, 160]);
  const heroScale = useTransform(heroProgress, [0, 1], [1.05, 1.22]);
  const heroContentOpacity = useTransform(heroProgress, [0, 0.7], [1, 0]);
  const heroContentY = useTransform(heroProgress, [0, 1], [0, -80]);

  const mx = useMotionValue(-1000);
  const my = useMotionValue(-1000);
  const smx = useSpring(mx, { stiffness: 120, damping: 20 });
  const smy = useSpring(my, { stiffness: 120, damping: 20 });
  const spotlight = useMotionTemplate`radial-gradient(520px circle at ${smx}px ${smy}px, hsl(var(--primary) / 0.22), transparent 65%)`;
  // Reveals the raw, un-darkened photo only around the cursor.
  const reveal = useMotionTemplate`radial-gradient(360px circle at ${smx}px ${smy}px, black, transparent 70%)`;

  const onHeroMove = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  /* Story: pinned scroll section */
  const storyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: story } = useScroll({ target: storyRef, offset: ["start start", "end end"] });
  const lineScale = useSpring(story, { stiffness: 100, damping: 25 });
  const glowScale = useTransform(story, [0, 0.5, 1], [0.8, 1.3, 0.9]);
  const glowY = useTransform(story, [0, 1], ["-40%", "-60%"]);

  /* Data */
  const { data: featuredCars } = useQuery({
    queryKey: ["featured-cars"],
    queryFn: async () => {
      const { data } = await supabase.from("cars").select("*").eq("is_featured", true).limit(4);
      return (data ?? []) as CarType[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["showroom-stats"],
    queryFn: async () => {
      const [{ count: total }, { data: brandsData }, { count: showroom }, { count: importable }] = await Promise.all([
        supabase.from("cars").select("id", { count: "exact", head: true }),
        supabase.from("cars").select("brand"),
        supabase.from("cars").select("id", { count: "exact", head: true }).eq("availability_type", "in_showroom"),
        supabase.from("cars").select("id", { count: "exact", head: true }).eq("availability_type", "available_on_import"),
      ]);
      const brandList = Array.from(new Set((brandsData ?? []).map((c: { brand: string }) => c.brand))).filter(Boolean);
      return {
        total: total ?? 0,
        brands: brandList.length,
        brandList,
        showroom: showroom ?? 0,
        importable: importable ?? 0,
      };
    },
  });

  return (
    <MotionConfig reducedMotion="user">
      <div>
        <ScrollProgress />

        {/* ═══════════════════ HERO ═══════════════════ */}
        <section
          ref={heroRef}
          onMouseMove={onHeroMove}
          className="relative h-screen min-h-[640px] flex items-center overflow-hidden"
        >
          {/* Photo, slowly zooming + parallax */}
          <motion.div style={{ y: heroY, scale: heroScale }} className="absolute inset-0">
            <motion.img
              initial={{ scale: 1.15, filter: "brightness(0.4)" }}
              animate={{ scale: 1, filter: "brightness(1)" }}
              transition={{ duration: 2.2, ease: EASE }}
              src={heroImage}
              alt="Luxury sports car in the Elegance Wheels showroom"
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Darkening layers */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />

          {/* Cursor lens: the photo brightens & warms where you look */}
          <motion.div
            aria-hidden
            style={{ maskImage: reveal, WebkitMaskImage: reveal }}
            className="absolute inset-0 hidden md:block"
          >
            <img src={heroImage} alt="" className="w-full h-full object-cover" />
          </motion.div>
          <motion.div
            aria-hidden
            style={{ background: spotlight }}
            className="absolute inset-0 pointer-events-none mix-blend-screen hidden md:block"
          />

          {/* Headlight sweep — plays once on load */}
          <motion.div
            aria-hidden
            initial={{ x: "-40%", opacity: 0 }}
            animate={{ x: "140%", opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.8, delay: 0.5, ease: "easeInOut" }}
            className="absolute top-0 bottom-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-primary/25 to-transparent blur-2xl pointer-events-none"
          />

          {/* Bottom fade into page */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-background" />

          <motion.div
            style={{ opacity: heroContentOpacity, y: heroContentY }}
            className="container mx-auto px-4 relative z-10"
          >
            <div className="max-w-4xl">
              <FadeIn delay={0.3}>
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass border border-primary/20 mb-8">
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-primary opacity-60 animate-ping" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-primary" />
                  </span>
                  <span className="text-xs font-medium text-primary tracking-wide">
                    {stats ? `${stats.total} vehicles live in our showroom` : "AI-powered luxury showroom"}
                  </span>
                </div>
              </FadeIn>

              <h1 className="font-grotesk font-bold tracking-tight leading-[0.98] text-6xl md:text-8xl lg:text-[8rem] mb-8">
                <MaskLine delay={0.5}>Drive your</MaskLine>
                <MaskLine delay={0.68}>
                  <span className="text-gradient-gold gold-text-glow">lifestyle.</span>
                </MaskLine>
              </h1>

              <FadeIn delay={1.15}>
                <p className="text-lg md:text-xl text-muted-foreground/90 mb-12 max-w-xl leading-relaxed font-light">
                  Tell us how you live. Our AI picks the car that fits, whether it's parked in our showroom or arriving
                  on import.
                </p>
              </FadeIn>

              <FadeIn delay={1.35}>
                <div className="flex flex-wrap gap-4 items-center">
                  <Magnetic>
                    <Link
                      to="/lifestyle-match"
                      className="btn-luxury group inline-flex items-center gap-3 px-9 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-base shadow-xl shadow-primary/30"
                    >
                      <Sparkles className="w-4 h-4" /> Find my car
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Magnetic>
                  <Magnetic>
                    <Link
                      to="/catalogue"
                      className="btn-luxury inline-flex items-center gap-3 px-9 py-4 rounded-full glass border border-border/40 text-foreground font-semibold text-base hover:border-primary/40"
                    >
                      Browse collection
                    </Link>
                  </Magnetic>
                </div>
              </FadeIn>
            </div>
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
            aria-hidden
          >
            <div className="w-5 h-9 rounded-full border border-muted-foreground/30 flex justify-center pt-2">
              <motion.div
                animate={{ y: [0, 12, 0], opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="w-1 h-1.5 rounded-full bg-primary"
              />
            </div>
          </motion.div>
        </section>

        {/* ═══════════════════ BRAND MARQUEE ═══════════════════ */}
        <BrandMarquee brands={stats?.brandList ?? []} />

        {/* ═══════════════════ NUMBERS ═══════════════════ */}
        <section className="py-28 relative">
          <div className="container mx-auto px-4">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: EASE }}
              className="font-grotesk font-bold text-3xl md:text-5xl max-w-2xl leading-tight mb-16"
            >
              Pakistan's luxury car collection, counted live.
            </motion.h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-border/20">
              {[
                { label: "Vehicles in stock", value: String(stats?.total ?? "—") },
                { label: "Brands", value: String(stats?.brands ?? "—") },
                { label: "Ready for test drive", value: String(stats?.showroom ?? "—") },
                { label: "Available on import", value: String(stats?.importable ?? "—") },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, clipPath: "inset(100% 0 0 0)" }}
                  whileInView={{ opacity: 1, clipPath: "inset(0% 0 0 0)" }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.9, delay: i * 0.12, ease: EASE }}
                  className="group relative border-r border-b border-border/20 p-8 md:p-12 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                  <p className="relative font-grotesk font-bold text-5xl md:text-7xl text-gradient-gold mb-3">
                    <AnimatedCounter value={s.value} />
                  </p>
                  <p className="relative text-sm text-muted-foreground">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════ PINNED STORY ═══════════════════ */}
        <section ref={storyRef} className="relative h-[320vh]">
          <div className="sticky top-0 h-screen overflow-hidden flex items-center">
            {/* Ambient glow tied to scroll */}
            <motion.div
              aria-hidden
              style={{ scale: glowScale, y: glowY }}
              className="absolute top-1/2 right-[10%] w-[620px] h-[620px] rounded-full bg-primary/10 blur-[140px] pointer-events-none"
            />

            <div className="container mx-auto px-4 relative z-10 grid md:grid-cols-[1fr_auto_1fr] gap-10 md:gap-16 items-center">
              {/* Text panels */}
              <div className="relative h-[460px]">
                <StoryPanel
                  progress={story}
                  range={[0, 0.33]}
                  icon={MessageSquareText}
                  step="Step 1 of 3"
                  num="01"
                  title="Tell us how you live."
                  body="Daily commute, family weekends, track days. Answer a few quick questions about how you drive and what you spend."
                  first
                />
                <StoryPanel
                  progress={story}
                  range={[0.33, 0.66]}
                  icon={Wand2}
                  step="Step 2 of 3"
                  num="02"
                  title="We match the car."
                  body="Our AI compares your answers against every vehicle in stock and on import, then ranks the best fits for you."
                />
                <StoryPanel
                  progress={story}
                  range={[0.66, 1]}
                  icon={KeyRound}
                  step="Step 3 of 3"
                  num="03"
                  title="Drive it or import it."
                  body="Book a test drive for cars in our showroom, or place an import order and track it with us to your door."
                  last
                />
              </div>

              {/* Progress rail */}
              <div className="hidden md:block relative w-px h-[460px] bg-border/30">
                <motion.div
                  style={{ scaleY: lineScale }}
                  className="absolute inset-0 origin-top bg-gradient-to-b from-primary to-primary/40 shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
                />
                {[0, 0.5, 1].map((p) => (
                  <RailDot key={p} progress={story} at={p} />
                ))}
              </div>

              {/* Visual side: scroll-driven match engine */}
              <MatchEngine progress={story} />
            </div>
          </div>
        </section>

        {/* ═══════════════════ FEATURED ═══════════════════ */}
        {featuredCars && featuredCars.length > 0 && (
          <section className="py-28">
            <div className="container mx-auto px-4">
              <div className="flex items-end justify-between mb-12 gap-6">
                <motion.h2
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.8, ease: EASE }}
                  className="text-3xl md:text-5xl font-grotesk font-bold leading-tight"
                >
                  Handpicked for you.
                </motion.h2>
                <Link
                  to="/catalogue"
                  className="btn-luxury group text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors px-5 py-2.5 rounded-full glass border border-border/20 hover:border-primary/30 shrink-0"
                >
                  View all <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
            <FeaturedCarousel cars={featuredCars} />
          </section>
        )}

        {/* ═══════════════════ AI MATCH CTA ═══════════════════ */}
        <section className="py-28">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1, ease: EASE }}
              className="relative rounded-[2rem] p-px overflow-hidden"
            >
              {/* Rotating light along the border */}
              <motion.div
                aria-hidden
                animate={{ rotate: 360 }}
                transition={{ duration: 8, ease: "linear", repeat: Infinity }}
                className="absolute -inset-[60%]"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary)) 60deg, transparent 120deg, transparent 360deg)",
                }}
              />

              <div className="relative rounded-[calc(2rem-1px)] bg-background p-12 md:p-24 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10">
                  <motion.div
                    animate={{ y: [0, -8, 0], rotate: [0, 4, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/25 to-accent/15 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-primary/20"
                  >
                    <Sparkles className="w-9 h-9 text-primary" />
                  </motion.div>
                  <h2 className="text-4xl md:text-6xl lg:text-7xl font-grotesk font-bold mb-6 leading-[1.02] tracking-tight">
                    Not sure which car
                    <br />
                    <span className="text-gradient-gold">fits you?</span>
                  </h2>
                  <p className="text-muted-foreground mb-12 max-w-lg mx-auto leading-relaxed text-lg font-light">
                    Answer a few questions about your lifestyle and budget. Get a ranked shortlist in under a minute.
                  </p>
                  <Magnetic strength={0.3}>
                    <Link
                      to="/lifestyle-match"
                      className="btn-luxury group inline-flex items-center gap-3 px-12 py-5 rounded-full bg-primary text-primary-foreground font-semibold text-base shadow-2xl shadow-primary/30"
                    >
                      Start matching
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Magnetic>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════ FOOTER ═══════════════════ */}
        <footer className="relative pt-24 pb-8 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-32 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
              <div className="md:col-span-1">
                <div className="flex items-center gap-3 mb-5">
                  <LuxuryLogo size="small" />
                  <div>
                    <span className="text-sm font-grotesk font-bold text-gradient-gold tracking-wider">ELEGANCE</span>
                    <span className="block text-[9px] text-muted-foreground tracking-[0.3em] -mt-0.5">WHEELS</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  Pakistan's premier AI-powered automotive showroom. Discover luxury, performance and innovation.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://wa.me/923001234567"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                  {FEATURES.contact && (
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass border border-border/30 text-foreground text-xs font-semibold hover:border-primary/30 transition-all"
                    >
                      <Mail className="w-3.5 h-3.5" /> Contact us
                    </Link>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-grotesk font-bold text-foreground mb-5 uppercase tracking-wider">Showroom</h4>
                <ul className="space-y-3">
                  {[
                    { label: "Browse catalogue", path: "/catalogue" },
                    { label: "AI lifestyle match", path: "/lifestyle-match" },
                    ...(FEATURES.compare ? [{ label: "Compare cars", path: "/compare" }] : []),
                    ...(FEATURES.importEstimator ? [{ label: "Import estimator", path: "/import-estimator" }] : []),
                  ].map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.path}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                      >
                        <ChevronRight className="w-3 h-3 text-primary/40 group-hover:translate-x-0.5 transition-transform" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-grotesk font-bold text-foreground mb-5 uppercase tracking-wider">Categories</h4>
                <ul className="space-y-3">
                  {["Luxury sedans", "Sports cars", "SUVs & crossovers", "Electric vehicles"].map((cat) => (
                    <li key={cat}>
                      <Link
                        to="/catalogue"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                      >
                        <ChevronRight className="w-3 h-3 text-primary/40 group-hover:translate-x-0.5 transition-transform" />
                        {cat}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-grotesk font-bold text-foreground mb-5 uppercase tracking-wider">Contact</h4>
                <ul className="space-y-4">
                  {[
                    { icon: MapPin, text: "DHA Phase 6, Lahore, Pakistan", href: undefined },
                    { icon: Phone, text: "+92 300 1234567", href: "tel:+923001234567" },
                    { icon: Mail, text: "info@elegancewheels.pk", href: "mailto:info@elegancewheels.pk" },
                    { icon: Clock, text: "Mon–Sat: 10AM – 8PM", href: undefined },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <item.icon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      {item.href ? (
                        <a href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                          {item.text}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">{item.text}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-border/15">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground/60">
                  © 2026 Elegance Wheels. AI-Powered Smart Car Showroom. All rights reserved.
                </p>
                <div className="flex items-center gap-6">
                  {FEATURES.contact && (
                    <Link to="/contact" className="text-xs text-muted-foreground/70 hover:text-primary transition-colors">
                      Contact
                    </Link>
                  )}
                  {FEATURES.importEstimator && (
                    <Link to="/import-estimator" className="text-xs text-muted-foreground/70 hover:text-primary transition-colors">
                      Import guide
                    </Link>
                  )}
                  {FEATURES.publicAdminLink && (
                    <Link to="/admin" className="text-xs text-muted-foreground/70 hover:text-primary transition-colors">
                      Admin
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}