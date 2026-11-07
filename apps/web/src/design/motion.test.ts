// @vitest-environment node
// The motion tokens exist twice: in src/ui/motion.ts for Motion components and as CSS variables
// for transitions. This keeps them identical, so an animation can't drift from the system.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DISTANCE, DURATION, EASE, PULSE, STAGGER } from "../ui/motion";

const css = readFileSync(fileURLToPath(new URL("../index.css", import.meta.url)), "utf8");
const variable = (name: string) => {
  const match = css.match(new RegExp(`--bb-${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`--bb-${name} isn't defined in index.css`);
  return match[1]!.trim();
};

describe("motion tokens", () => {
  it.each(Object.entries(DURATION))("duration %s matches", (name, seconds) => {
    expect(variable(`duration-${name}`)).toBe(`${Math.round(seconds * 1000)}ms`);
  });

  it.each(Object.entries(EASE))("curve %s matches", (name, curve) => {
    expect(variable(`ease-${name}`)).toBe(`cubic-bezier(${curve.join(", ")})`);
  });

  it.each(Object.entries(DISTANCE))("distance %s matches", (name, pixels) => {
    expect(variable(`distance-${name}`)).toBe(`${pixels}px`);
  });

  it.each(Object.entries(STAGGER))("stagger %s matches", (name, seconds) => {
    expect(variable(`stagger-${name}`)).toBe(`${Math.round(seconds * 1000)}ms`);
  });

  it.each(Object.entries(PULSE))("%s pulse period matches", (severity, pulse) => {
    expect(variable(`pulse-${severity}`)).toBe(`${pulse.period}ms`);
  });

  it("keeps the console fast: nothing it uses is slower than the slow tier", () => {
    expect(DURATION.instant).toBeLessThan(DURATION.fast);
    expect(DURATION.fast).toBeLessThan(DURATION.base);
    expect(DURATION.base).toBeLessThanOrEqual(0.3);
    expect(DURATION.slow).toBeLessThanOrEqual(0.5);
  });

  it("pulses critical incidents faster than high ones", () => {
    expect(PULSE.critical.period).toBeLessThan(PULSE.high.period);
  });
});
