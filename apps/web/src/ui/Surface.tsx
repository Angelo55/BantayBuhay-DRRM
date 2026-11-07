import { motion } from "motion/react";
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { DISTANCE, transition } from "./motion";

type CardTone = "card" | "muted" | "glass" | "inverse" | "accent";

const TONES: Record<CardTone, string> = {
  card: "bg-card text-fg shadow-soft",
  muted: "bg-card-muted text-fg",
  glass: "glass text-fg",
  inverse: "bg-inverse text-on-inverse",
  accent: "bg-accent text-on-accent",
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  // "panel" is the large 40 px rounded surface; "card" is the everyday 24 px one.
  shape?: "card" | "panel";
}

export function Card({ tone = "card", shape = "card", className, ...rest }: CardProps) {
  return (
    <div
      className={cx(TONES[tone], shape === "panel" ? "rounded-panel" : "rounded-card", className)}
      {...rest}
    />
  );
}

// A square tile holding an icon or picture, like the reference's illustration tiles.
export function IconTile({
  children,
  size = 56,
  tone = "card",
  className,
}: {
  children: ReactNode;
  size?: 40 | 56 | 72;
  tone?: "card" | "muted" | "inverse";
  className?: string;
}) {
  const sizes = { 40: "h-10 w-10 rounded-[12px]", 56: "h-14 w-14 rounded-tile", 72: "h-18 w-18 rounded-tile" };
  const tones = {
    card: "bg-card text-fg shadow-soft",
    muted: "bg-card-muted text-fg",
    inverse: "bg-inverse text-on-inverse",
  };
  return (
    <span className={cx("inline-flex shrink-0 items-center justify-center overflow-hidden", sizes[size], tones[tone], className)}>
      {children}
    </span>
  );
}

// A large light numeral beside a two-line label, as in the reference's header stats.
export function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <motion.span
        key={String(value)}
        initial={{ opacity: 0.35, y: -DISTANCE.xs }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition.fast}
        className="font-display text-[32px] font-light leading-none tabular-nums text-fg"
      >
        {value}
      </motion.span>
      <span className="max-w-[9ch] text-[13px] leading-tight text-fg-2">{label}</span>
    </div>
  );
}

export function CountBadge({ count, label }: { count: number; label: string }) {
  return (
    <span
      aria-label={`${count} ${label}`}
      className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-info-soft px-1.5 text-[13px] font-bold tabular-nums text-info"
    >
      {count}
    </span>
  );
}

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "info" | "accent" | "inverse" }) {
  const tones = {
    neutral: "bg-card-muted text-fg-2",
    info: "bg-info-soft text-info",
    accent: "bg-accent text-on-accent",
    inverse: "bg-inverse text-on-inverse",
  };
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium", tones[tone])}>
      {children}
    </span>
  );
}
