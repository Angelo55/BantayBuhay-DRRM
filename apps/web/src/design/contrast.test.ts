// @vitest-environment node
// Runs in Node, not jsdom, so it can read the real token file from disk. A color change
// that breaks contrast fails here. (Vitest turns CSS imports, even ?raw, into empty strings.)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("../index.css", import.meta.url)), "utf8");
if (!css.includes("--bb-fg:")) throw new Error("couldn't read the design tokens from index.css");

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...block.matchAll(/--bb-([a-z0-9-]+):\s*(#[0-9a-f]{6})/g)].map((match) => [match[1]!, match[2]!]),
  );
}

const light = tokens(":root");
const dark = { ...light, ...tokens(':root[data-theme="dark"]') };

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

const TEXT_PAIRS: [string, string][] = [
  ["fg", "card"],
  ["fg", "card-muted"],
  ["fg", "canvas"],
  ["fg-2", "card"],
  ["fg-2", "card-muted"],
  ["fg-2", "canvas"],
  ["info", "card"],
  ["info", "info-soft"],
  ["on-inverse", "inverse"],
  ["on-inverse-2", "inverse"],
  ["on-accent", "accent"],
  ["on-accent", "accent-strong"],
  ["on-severity", "severity-low"],
  ["on-severity", "severity-medium"],
  ["on-severity", "severity-high"],
  ["on-severity", "severity-critical"],
  ["severity-low-text", "card"],
  ["severity-medium-text", "card"],
  ["severity-high-text", "card"],
  ["severity-critical-text", "card"],
  ["severity-critical-text", "card-muted"],
  ["on-critical-banner", "critical-banner"],
];

// Control borders and focus rings need 3:1 against what they sit on (WCAG 1.4.11).
const CONTROL_PAIRS: [string, string][] = [
  ["border-ui", "card"],
  ["border-ui", "card-muted"],
  ["focus", "card"],
  ["focus", "canvas"],
];

describe.each([
  ["light", light],
  ["dark", dark],
])("%s theme", (_name, theme) => {
  it.each(TEXT_PAIRS)("%s on %s reaches 4.5:1", (text, background) => {
    expect(theme[text], `missing --bb-${text}`).toBeDefined();
    expect(contrast(theme[text]!, theme[background]!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(CONTROL_PAIRS)("%s against %s reaches 3:1", (control, background) => {
    expect(contrast(theme[control]!, theme[background]!)).toBeGreaterThanOrEqual(3);
  });
});
