import type { Severity } from "@bantaybuhay/shared";
import { cx } from "./cx";

export const SEVERITY_WORD: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

// Each severity has its own shape, so meaning never rests on color alone.
const SHAPES: Record<Severity, string> = {
  low: "M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2z",
  medium: "M8 2l6.5 11.5h-13z",
  high: "M8 1.5l6.5 6.5L8 14.5 1.5 8z",
  critical: "M2 2h12v12H2z",
};

// Literal class names, so Tailwind can find them.
export const SEVERITY_FILL: Record<Severity, string> = {
  low: "bg-severity-low",
  medium: "bg-severity-medium",
  high: "bg-severity-high",
  critical: "bg-severity-critical",
};

const TEXT: Record<Severity, string> = {
  low: "text-severity-low-text",
  medium: "text-severity-medium-text",
  high: "text-severity-high-text",
  critical: "text-severity-critical-text",
};

export function SeverityShape({ severity, size = 14 }: { severity: Severity; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d={SHAPES[severity]} fill="currentColor" />
    </svg>
  );
}

// A filled badge with shape and word. Fills always carry dark text for contrast.
export function SeverityBadge({ severity, size = "md" }: { severity: Severity; size?: "sm" | "md" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full font-bold text-on-severity",
        SEVERITY_FILL[severity],
        size === "sm" ? "px-2 py-0.5 text-[12px]" : "px-3 py-1 text-[13px]",
      )}
    >
      <SeverityShape severity={severity} size={size === "sm" ? 10 : 12} />
      {SEVERITY_WORD[severity]}
    </span>
  );
}

// Shape and word in the severity's text color, for use on light surfaces.
export function SeverityLabel({ severity }: { severity: Severity }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-[13px] font-bold", TEXT[severity])}>
      <SeverityShape severity={severity} size={12} />
      {SEVERITY_WORD[severity]}
    </span>
  );
}
