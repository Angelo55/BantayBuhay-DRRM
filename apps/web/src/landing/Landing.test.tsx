import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signInRole } from "../lib/router";
import { BARANGAY_COUNT, CITY_AREA_KM2 } from "./BarangayMap";
import { Landing } from "./Landing";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("Landing", () => {
  it("names the product and the city in its one h1", () => {
    render(<Landing />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]!.textContent).toBe("Incident detection and response for Kabankalan City");
  });

  it("draws every barangay from the official boundaries", () => {
    render(<Landing />);
    expect(BARANGAY_COUNT).toBe(32);
    expect(CITY_AREA_KM2).toBeGreaterThan(600);
    const map = screen.getByRole("img", { name: "Map of the 32 barangays of Kabankalan City" });
    expect(map.querySelectorAll("path")).toHaveLength(32);
  });

  it("makes no requests to the API, so it works for anyone", () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    render(<Landing />);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends each role to its own sign-in page", () => {
    render(<Landing />);
    for (const [label, role] of [
      ["Sign in as an operator", "operator"],
      ["Sign in as a responder", "responder"],
      ["Sign in as a civilian", "civilian"],
    ] as const) {
      expect(screen.getByRole("link", { name: label }).getAttribute("href")).toBe(`/login?as=${role}`);
    }
    fireEvent.click(screen.getByRole("link", { name: "Sign in as a responder" }));
    expect(window.location.pathname).toBe("/login");
    expect(signInRole()).toBe("responder");
  });

  it("selects an incident in the console preview", () => {
    render(<Landing />);
    const flooding = screen.getByRole("button", { name: /Flooding/ });
    fireEvent.click(flooding);
    expect(flooding.getAttribute("aria-current")).toBe("true");
  });
});
