import { Link, useLocation } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionTemplate,
  useSpring,
} from "framer-motion";
import { Sparkles, Menu, X, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import ChatBot from "./ChatBot";
import { FEATURES } from "@/lib/featureFlags";

const navItems = [
  { path: "/", label: "Home" },
  { path: "/car-catalogue", label: "Car Catalogue" },
  ...(FEATURES.importEstimator ? [{ path: "/import-estimator", label: "Import Guide" }] : []),
  ...(FEATURES.contact ? [{ path: "/contact", label: "Contact" }] : []),
];

// Original automotive badge mark — a hexagonal frame (the shape language of
// a performance-car emblem) around a sculpted "W" chevron and a single
// speed-line beneath it. Built to read as motion and precision rather than
// the shield-and-crest look of an insurance or security mark.
function LuxuryLogo({ size = "default" }: { size?: "default" | "small" }) {
  const s = size === "small" ? 28 : 36;
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hexagonal badge frame */}
      <path
        d="M24 3L42.5 13.5V34.5L24 45L5.5 34.5V13.5L24 3Z"
        fill="url(#badgeFill)"
        stroke="url(#badgeStroke)"
        strokeWidth="1.4"
      />
      {/* Inset facet line for depth */}
      <path
        d="M24 7.5L38.2 15.75V32.25L24 40.5L9.8 32.25V15.75L24 7.5Z"
        stroke="url(#facetStroke)"
        strokeWidth="0.75"
        opacity="0.5"
      />
      {/* Sculpted W chevron */}
      <path
        d="M13.5 17L18.5 30L24 19.5L29.5 30L34.5 17"
        stroke="url(#markGrad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Speed line */}
      <line x1="16" y1="34" x2="32" y2="34" stroke="url(#markGrad)" strokeWidth="1.6" strokeLinecap="round" />
      {/* Apex spark */}
      <path d="M24 9.5L25.6 12L24 14.5L22.4 12L24 9.5Z" fill="url(#markGrad)" />

      <defs>
        <linearGradient id="badgeFill" x1="5.5" y1="3" x2="42.5" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(240, 16%, 9%)" />
          <stop offset="1" stopColor="hsl(240, 18%, 3%)" />
        </linearGradient>
        <linearGradient id="badgeStroke" x1="5.5" y1="3" x2="42.5" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(38, 92%, 68%)" />
          <stop offset="1" stopColor="hsl(38, 65%, 38%)" />
        </linearGradient>
        <linearGradient id="facetStroke" x1="9.8" y1="7.5" x2="38.2" y2="40.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(38, 92%, 70%)" />
          <stop offset="1" stopColor="hsl(38, 40%, 30%)" />
        </linearGradient>
        <linearGradient id="markGrad" x1="13.5" y1="17" x2="34.5" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(38, 95%, 72%)" />
          <stop offset="1" stopColor="hsl(38, 85%, 50%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export { LuxuryLogo };

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Continuous scroll-driven motion instead of a hard on/off "scrolled"
  // toggle — the glass, border and shadow all ease in together as one
  // smooth curve rather than snapping at a threshold.
  const { scrollY } = useScroll();
  const smoothScroll = useSpring(scrollY, { stiffness: 220, damping: 32, mass: 0.4 });

  const navBlur = useTransform(smoothScroll, [0, 90], [10, 22]);
  const navBgOpacity = useTransform(smoothScroll, [0, 90], [0.035, 0.09]);
  const navBorderOpacity = useTransform(smoothScroll, [0, 90], [0.12, 0.22]);
  const navShadowOpacity = useTransform(smoothScroll, [0, 90], [0, 0.18]);
  const navScale = useTransform(smoothScroll, [0, 90], [1, 0.985]);

  const navBackdropFilter = useMotionTemplate`blur(${navBlur}px)`;
  const navBackground = useMotionTemplate`hsl(240 18% 6% / ${navBgOpacity})`;
  const navBorderColor = useMotionTemplate`hsl(38 92% 55% / ${navBorderOpacity})`;
  const navBoxShadow = useMotionTemplate`0 20px 60px -12px hsl(38 92% 45% / ${navShadowOpacity})`;

  // Scroll progress hairline — a small orchestrated touch that ties the
  // navbar to the one thing a nav bar actually tracks: how far down the
  // page you are. Reads like a dashboard gauge rather than decoration.
  const { scrollYProgress } = useScroll();
  const progressScaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Scroll progress hairline */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-[hsl(38,92%,55%)] to-[hsl(38,92%,70%)]"
        style={{ scaleX: progressScaleX }}
      />

      {/* Floating Oval Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-5">
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            backdropFilter: navBackdropFilter,
            WebkitBackdropFilter: navBackdropFilter,
            background: navBackground,
            borderColor: navBorderColor,
            boxShadow: navBoxShadow,
            scale: navScale,
          }}
          className="flex items-center justify-between gap-2 w-full max-w-5xl px-5 py-2.5 rounded-[50px] border transition-colors"
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ scale: 1.08, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 16 }}
            >
              <LuxuryLogo />
            </motion.div>
            <div className="hidden sm:block">
              <span className="text-sm font-grotesk font-bold text-gradient-gold tracking-wider">
                ELEGANCE
              </span>
              <span className="block text-[9px] text-muted-foreground tracking-[0.3em] -mt-0.5">
                WHEELS
              </span>
            </div>
          </Link>

          {/* Desktop nav — pill style */}
          <div className="hidden md:flex items-center gap-0.5 bg-secondary/30 rounded-[40px] p-1 backdrop-blur-sm border border-border/10">
            {navItems.map((item) => {
              const isActive =
                item.path === "/car-catalogue"
                  ? location.pathname === "/car-catalogue" ||
                    location.pathname === "/catalogue" ||
                    location.pathname.startsWith("/car/")
                  : location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative px-5 py-2 rounded-[30px] text-sm font-medium transition-all duration-300 group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-[30px] bg-primary shadow-lg shadow-primary/30"
                      transition={{ type: "spring", bounce: 0.18, duration: 0.55 }}
                    />
                  )}
                  <span
                    className={`relative z-10 transition-all duration-300 ${
                      isActive
                        ? "text-primary-foreground font-semibold"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                  {!isActive && (
                    <span className="absolute inset-0 rounded-[30px] bg-primary/0 group-hover:bg-primary/8 transition-all duration-300 group-hover:shadow-[0_0_15px_-3px_hsla(38,92%,55%,0.15)]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* CTA buttons desktop */}
          <div className="hidden md:flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/lifestyle-match"
                className="btn-luxury group inline-flex items-center gap-2 pl-5 pr-4 py-2.5 rounded-[30px] bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
              >
                <Sparkles className="w-4 h-4" /> Find Your Car
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
          </div>

          {/* Mobile toggle */}
          <motion.button
            onClick={() => setMobileOpen((v) => !v)}
            whileTap={{ scale: 0.9 }}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={mobileOpen ? "close" : "open"}
                initial={{ opacity: 0, rotate: -45 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 45 }}
                transition={{ duration: 0.18 }}
                className="flex"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </motion.div>

        {/* Mobile menu dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-[-1] bg-background/40 backdrop-blur-sm md:hidden"
              />
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
                className="absolute top-full mt-2 left-4 right-4 md:hidden glass-strong rounded-3xl border border-border/30 overflow-hidden shadow-xl"
              >
                {navItems.map((item, i) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 26 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-5 py-3.5 text-sm font-medium transition-colors ${
                        location.pathname === item.path
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: navItems.length * 0.04 }}
                  className="border-t border-border/20 p-3 flex flex-col gap-2"
                >
                  <Link
                    to="/lifestyle-match"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-semibold"
                  >
                    <Sparkles className="w-4 h-4" /> Find Your Car
                  </Link>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      {/* Main content */}
      <main className="pt-20">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Chatbot */}
      <ChatBot />
    </div>
  );
}