// BantayBuhay's motion tokens. Every animation takes its timing from here (Motion components) or
// from the matching CSS variables in index.css (CSS transitions); motion.test.ts keeps the two
// equal. DESIGN.md explains when each token applies.
//
// Character: soft and fluid like the reference (frosted glass, rounded, unhurried), but quick
// where people work. The operations console uses instant to base; only the public landing page
// uses the expressive tier.

export const DURATION = {
  /** Press feedback, toggles, focus. */
  instant: 0.1,
  /** Hover, tint, small state changes, list reflow in the console. */
  fast: 0.18,
  /** Panels, toasts, banners and dialogs entering. */
  base: 0.28,
  /** Sheets, map camera moves, large layout changes. */
  slow: 0.46,
  /** Landing page only: hero sequence and section reveals. */
  expressive: 0.76,
} as const;

export const EASE = {
  /** Most movement between two resting states. */
  standard: [0.32, 0.72, 0, 1],
  /** Things arriving: fast start, soft landing (the reference's signature curve). */
  enter: [0.22, 1, 0.36, 1],
  /** Things leaving: gentle start, quick exit, so they don't linger. */
  exit: [0.4, 0, 1, 1],
  /** Attention: alerts and the one landing moment. */
  emphasized: [0.05, 0.7, 0.1, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export const SPRING = {
  /** Layout changes and panels: settles without wobble. */
  gentle: { type: "spring", stiffness: 260, damping: 30, mass: 1 },
  /** Direct manipulation, such as the swipe handle snapping back. */
  snappy: { type: "spring", stiffness: 520, damping: 38, mass: 1 },
  /** Emergency banner arrival: fast and firm, no bounce that delays reading. */
  alert: { type: "spring", stiffness: 700, damping: 44, mass: 1 },
} as const;

/** Offsets for slides and rises, in pixels. */
export const DISTANCE = { xs: 4, sm: 8, md: 16, lg: 32, xl: 64 } as const;

/** Delay between items in a staggered list or grid, in seconds. */
export const STAGGER = { tight: 0.03, base: 0.06, loose: 0.1 } as const;

/**
 * Map pulse rings by severity: period in milliseconds and largest ring radius in pixels. Only
 * unacknowledged high and critical incidents pulse; medium and low only drop in.
 */
export const PULSE = {
  critical: { period: 1200, radius: 34 },
  high: { period: 1900, radius: 26 },
} as const;

/** Helpers for Motion's `transition` prop. */
export const transition = {
  instant: { duration: DURATION.instant, ease: EASE.standard },
  fast: { duration: DURATION.fast, ease: EASE.standard },
  enter: { duration: DURATION.base, ease: EASE.enter },
  exit: { duration: DURATION.fast, ease: EASE.exit },
  sheet: { duration: DURATION.slow, ease: EASE.enter },
  expressive: { duration: DURATION.expressive, ease: EASE.enter },
} as const;

/** The same curves as CSS strings, for MapLibre, the Web Animations API and GSAP. */
export const cssEase = (curve: readonly number[]) => `cubic-bezier(${curve.join(", ")})`;
