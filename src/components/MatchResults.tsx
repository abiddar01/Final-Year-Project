import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  RotateCcw,
  Trophy,
  Users,
  Gauge,
  Fuel,
  Gem,
  CarFront,
  Sparkles,
  Calendar,
  Ship,
  ArrowRight,
  Quote,
  GitCompareArrows,
  Check,
  X,
  ThumbsUp,
  AlertTriangle,
} from "lucide-react";
import type { Car, QuizAnswer } from "@/lib/types";
import type { ScoreBreakdown } from "@/lib/matchingEngine";
import { formatPKR, getAvailabilityLabel, getAvailabilityColor } from "@/lib/formatPKR";
import OptimizedImage from "@/components/OptimizedImage";
import {
  type LifestyleProfile,
  buildStrengths,
  buildGaps,
  buildBestFor,
  buildNotIdealFor,
} from "@/lib/lifestyleProfile";
import { useCompare } from "@/contexts/CompareContext";
import { FEATURES } from "@/lib/featureFlags";

interface MatchResult {
  car: Car;
  breakdown: ScoreBreakdown;
  explanation: string;
}

interface Props {
  results: MatchResult[];
  profile: LifestyleProfile;
  answers: QuizAnswer;
  onRestart: () => void;
}

function TagPills({ items, tone }: { items: string[]; tone: "good" | "bad" }) {
  if (items.length === 0) return null;
  const cls =
    tone === "good"
      ? "bg-primary/10 text-primary border-primary/20"
      : "bg-destructive/10 text-destructive border-destructive/20";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>
          {t}
        </span>
      ))}
    </div>
  );
}

function CarCTAs({ car, primary = false }: { car: Car; primary?: boolean }) {
  const availability = car.availability_type || "in_showroom";
  const { has, toggle } = useCompare();
  const inCompare = has(car.id);
  const baseBtn =
    "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all";
  const primaryBtn = primary ? "py-2.5 text-sm" : "";

  return (
    <div className={`flex flex-wrap gap-2 ${primary ? "mt-2" : "mt-3"}`}>
      <Link
        to={`/car/${car.id}`}
        className={`${baseBtn} ${primaryBtn} bg-primary text-primary-foreground hover:opacity-90 flex-1 min-w-[120px]`}
      >
        View Details <ArrowRight className="w-3.5 h-3.5" />
      </Link>

      {availability === "in_showroom" && (
        <Link
          to={`/car/${car.id}#book`}
          className={`${baseBtn} ${primaryBtn} glass border border-primary/30 text-foreground hover:border-primary flex-1 min-w-[120px]`}
        >
          <Calendar className="w-3.5 h-3.5" /> Book Test Drive
        </Link>
      )}

      {availability === "available_on_import" && FEATURES.importEstimator && (
        <Link
          to={`/car/import/${car.id}`}
          className={`${baseBtn} ${primaryBtn} glass border border-primary/30 text-primary hover:bg-primary/10 flex-1 min-w-[120px]`}
        >
          <Ship className="w-3.5 h-3.5" /> Start Import
        </Link>
      )}

      {FEATURES.compare && (
        <button
          onClick={() => toggle(car.id)}
          className={`${baseBtn} ${primaryBtn} ${
            inCompare
              ? "bg-primary/15 text-primary border border-primary/40"
              : "glass border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40"
          } flex-1 min-w-[120px]`}
        >
          {inCompare ? <Check className="w-3.5 h-3.5" /> : <GitCompareArrows className="w-3.5 h-3.5" />}
          {inCompare ? "Added" : "Compare"}
        </button>
      )}
    </div>
  );
}

export default function MatchResults({ results, profile, answers, onRestart }: Props) {
  if (results.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">No cars in our catalogue match yet. Check back soon.</p>
        <button onClick={onRestart} className="text-primary mt-4 text-sm flex items-center gap-1 mx-auto">
          <RotateCcw className="w-4 h-4" /> Retake
        </button>
      </div>
    );
  }

  const best = results[0];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Lifestyle Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-6 mb-8 border border-primary/20"
      >
        <div className="flex items-start gap-4">
          <div className="text-5xl leading-none">{profile.emoji}</div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-1">
              Your Lifestyle Profile
            </p>
            <h2 className="text-2xl md:text-3xl font-grotesk font-bold text-foreground">
              {profile.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{profile.tagline}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {profile.traits.map((t) => (
                <span
                  key={t}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onRestart}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retake
          </button>
        </div>
      </motion.div>

      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-grotesk font-bold">Hand-picked for a {profile.title}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {results.length} cars from our live inventory, scored against your profile.
      </p>

      {/* Best Match — Featured */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-strong rounded-2xl overflow-hidden mb-8 border border-primary/30 gold-glow"
      >
        <div className="grid md:grid-cols-2">
          <div className="relative overflow-hidden bg-secondary aspect-[4/3] md:aspect-auto md:h-full md:max-h-[420px]">
            <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Best Match
            </div>
            <div className="absolute top-4 right-4 z-10">
              <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg gold-glow">
                {best.breakdown.total}%
              </div>
            </div>
            {best.car.image_url ? (
              <img
                src={best.car.image_url}
                alt={best.car.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <CarFront className="w-16 h-16 text-muted-foreground/20" />
              </div>
            )}
          </div>

          <div className="p-6 flex flex-col">
            <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mb-1">
              {best.car.brand} • {best.car.year}
            </p>
            <h3 className="text-2xl font-grotesk font-bold text-foreground">{best.car.name}</h3>
            <p className="text-xl font-grotesk font-bold text-gradient-gold mt-1">
              {formatPKR(best.car.price)}
            </p>
            <span
              className={`inline-block w-fit px-2 py-0.5 rounded text-[10px] font-semibold border mt-2 mb-4 ${getAvailabilityColor(best.car.availability_type || "in_showroom")}`}
            >
              {getAvailabilityLabel(best.car.availability_type || "in_showroom")}
            </span>

            {/* Quick specs */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="glass rounded-lg p-2 text-center">
                <Users className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Seats</p>
                <p className="text-xs font-semibold">{best.car.seats ?? "—"}</p>
              </div>
              <div className="glass rounded-lg p-2 text-center">
                <Gauge className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">HP</p>
                <p className="text-xs font-semibold">{best.car.horsepower ?? "—"}</p>
              </div>
              <div className="glass rounded-lg p-2 text-center">
                <Fuel className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Fuel</p>
                <p className="text-xs font-semibold capitalize">{best.car.fuel_type}</p>
              </div>
            </div>

            {/* Advisor explanation */}
            <div className="glass rounded-xl p-4 mb-3 border border-primary/10">
              <div className="flex items-start gap-2">
                <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-primary font-semibold uppercase tracking-wider mb-1">
                    Advisor's note
                  </p>
                  <p className="text-sm text-foreground/90 leading-relaxed">{best.explanation}</p>
                </div>
              </div>
            </div>

            {/* Why it matches */}
            {(() => {
              const strengths = buildStrengths(best.car, best.breakdown, answers);
              const gaps = buildGaps(best.car, best.breakdown, answers);
              return (
                <div className="grid sm:grid-cols-2 gap-2.5 mb-3">
                  <div className="rounded-xl p-3 border border-primary/15 bg-primary/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1 mb-1.5">
                      <ThumbsUp className="w-3 h-3" /> Why it matches
                    </p>
                    <ul className="space-y-1">
                      {strengths.length === 0 ? (
                        <li className="text-xs text-muted-foreground">A solid all-rounder.</li>
                      ) : (
                        strengths.map((s) => (
                          <li key={s} className="text-xs text-foreground/85 flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-primary mt-0.5 shrink-0" /> {s}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <div className="rounded-xl p-3 border border-destructive/15 bg-destructive/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-destructive flex items-center gap-1 mb-1.5">
                      <AlertTriangle className="w-3 h-3" /> Trade-offs
                    </p>
                    <ul className="space-y-1">
                      {gaps.length === 0 ? (
                        <li className="text-xs text-muted-foreground">No notable gaps for your profile.</li>
                      ) : (
                        gaps.map((g) => (
                          <li key={g} className="text-xs text-foreground/85 flex items-start gap-1.5">
                            <X className="w-3 h-3 text-destructive mt-0.5 shrink-0" /> {g}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              );
            })()}

            {/* Best for / Not ideal for */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Best for:</span>
                <TagPills items={buildBestFor(best.car)} tone="good" />
              </div>
              {buildNotIdealFor(best.car).length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Not ideal for:</span>
                  <TagPills items={buildNotIdealFor(best.car)} tone="bad" />
                </div>
              )}
            </div>

            <CarCTAs car={best.car} primary />
          </div>
        </div>
      </motion.div>

      {/* Other Recommendations */}
      {results.length > 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-grotesk font-bold text-foreground flex items-center gap-2">
            <Gem className="w-4 h-4 text-primary" /> Also worth considering
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {results.slice(1).map(({ car, breakdown, explanation }, i) => (
              <motion.div
                key={car.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.1 }}
                className="glass rounded-2xl overflow-hidden hover:border-primary/30 hover:gold-glow transition-all duration-500 flex flex-col"
              >
                <div className="relative h-44 bg-secondary">
                  {car.image_url ? (
                    <OptimizedImage
                      src={car.image_url}
                      alt={car.name}
                      className="hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CarFront className="w-10 h-10 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold gold-glow">
                    {breakdown.total}%
                  </div>
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-background/70 backdrop-blur-sm text-[10px] font-semibold text-foreground">
                    #{i + 2} Match
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <p className="text-[10px] text-primary font-bold uppercase tracking-wider">
                    {car.brand} • {car.year}
                  </p>
                  <h4 className="font-grotesk font-bold text-foreground">{car.name}</h4>
                  <p className="text-sm font-grotesk font-bold text-gradient-gold mt-1">
                    {formatPKR(car.price)}
                  </p>
                  <span
                    className={`inline-block w-fit px-2 py-0.5 rounded text-[10px] font-semibold border mt-2 ${getAvailabilityColor(car.availability_type || "in_showroom")}`}
                  >
                    {getAvailabilityLabel(car.availability_type || "in_showroom")}
                  </span>

                  <p className="text-xs text-foreground/80 mt-3 leading-relaxed line-clamp-2">
                    {explanation}
                  </p>

                  {(() => {
                    const strengths = buildStrengths(car, breakdown, answers).slice(0, 2);
                    const gaps = buildGaps(car, breakdown, answers).slice(0, 1);
                    return (
                      <div className="mt-3 space-y-1.5 flex-1">
                        {strengths.map((s) => (
                          <p key={s} className="text-[11px] text-foreground/80 flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-primary mt-0.5 shrink-0" /> {s}
                          </p>
                        ))}
                        {gaps.map((g) => (
                          <p key={g} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                            <X className="w-3 h-3 text-destructive mt-0.5 shrink-0" /> {g}
                          </p>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="mt-3 mb-1">
                    <TagPills items={buildBestFor(car).slice(0, 2)} tone="good" />
                  </div>

                  <CarCTAs car={car} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
