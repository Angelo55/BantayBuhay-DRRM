import { describe, expect, it } from "vitest";
import { canTransition } from "./index.js";

describe("canTransition", () => {
  it.each([
    ["detected", "verified"],
    ["verified", "dispatched"],
    ["dispatched", "on_scene"],
    ["on_scene", "resolved"],
  ] as const)("allows the normal flow from %s to %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ["detected", "dismissed"],
    ["verified", "dismissed"],
  ] as const)("lets an operator close %s as a false alarm", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ["detected", "dispatched"],
    ["detected", "resolved"],
    ["verified", "on_scene"],
    ["dispatched", "detected"],
    ["dispatched", "dismissed"],
    ["resolved", "detected"],
    ["dismissed", "verified"],
  ] as const)("refuses to skip or reverse from %s to %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});
