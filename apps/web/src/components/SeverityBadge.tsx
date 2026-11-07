import type { Severity } from "@bantaybuhay/shared";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "../lib/labels";

// Each severity has its own shape, so it never depends on color alone. The shapes stay
// distinct at 12 px: an octagon for critical read as a circle at that size.
const SHAPES: Record<Severity, string> = {
  low: "M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2z",
  medium: "M8 2l6.5 11.5h-13z",
  high: "M8 1.5l6.5 6.5L8 14.5 1.5 8z",
  critical: "M2 2h12v12H2z",
};

export function SeverityShape({ severity, size = 14 }: { severity: Severity; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d={SHAPES[severity]} fill="currentColor" />
    </svg>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[13px] font-bold text-ground"
      style={{ backgroundColor: SEVERITY_COLOR[severity] }}
    >
      <SeverityShape severity={severity} size={12} />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
