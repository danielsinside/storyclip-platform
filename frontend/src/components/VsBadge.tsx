"use client";
import { motion } from "framer-motion";
import clsx from "clsx";

type VsProps = {
  /** "left" | "right" | null para tintar el glow */
  activeSide?: "left" | "right" | null;
  className?: string;
};

export default function VsBadge({ activeSide = null, className }: VsProps) {
  // color según lado activo usando la paleta del proyecto
  const tint =
    activeSide === "left"
      ? "from-primary/70 to-primary/20"
      : activeSide === "right"
      ? "from-secondary/70 to-secondary/20"
      : "from-primary/50 to-secondary/30";

  return (
    <motion.div
      role="img"
      aria-label="Comparación Antes y Después"
      initial={{ scale: 0.98, opacity: 0.95 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={clsx(
        "pointer-events-none select-none",
        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        "z-50",
        className
      )}
    >
      {/* Glow de fondo */}
      <motion.div
        aria-hidden
        className={clsx(
          "absolute inset-0 -z-10",
          "blur-2xl",
          "bg-gradient-to-b",
          tint
        )}
        animate={{ opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Texto ANTES y DESPUÉS */}
      <div
        className={clsx(
          "font-black tracking-wide",
          "text-center leading-none",
          "flex items-center gap-3",
          "text-[clamp(16px,3.5vw,42px)]",
          "text-foreground",
          "[text-shadow:0_2px_8px_rgba(0,0,0,.8),0_0_20px_hsl(var(--primary)/0.4)]",
          "drop-shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
        )}
        style={{ fontFamily: '"Bebas Neue", var(--font-sans, ui-sans-serif)' }}
      >
        <span>ANTES</span>
        <span className="text-[clamp(12px,2.5vw,32px)] opacity-60 text-muted-foreground">|</span>
        <span>DESPUÉS</span>
      </div>
    </motion.div>
  );
}
