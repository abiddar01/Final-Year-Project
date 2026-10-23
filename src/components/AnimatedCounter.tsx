import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface AnimatedCounterProps {
  value: string;
  duration?: number;
}

export default function AnimatedCounter({ value, duration = 2 }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;

    // Extract numeric part and suffix
    const match = value.match(/^([\d,.]+)(.*)$/);
    if (!match) {
      setDisplay(value);
      return;
    }

    const numStr = match[1].replace(/,/g, "");
    const suffix = match[2]; // e.g., "+", " km/h", "%"
    const target = parseFloat(numStr);
    const isInteger = !numStr.includes(".");

    const startTime = performance.now();
    const durationMs = duration * 1000;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;

      if (isInteger) {
        setDisplay(Math.round(current).toLocaleString() + suffix);
      } else {
        setDisplay(current.toFixed(1) + suffix);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value, duration]);

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {display}
    </motion.span>
  );
}
