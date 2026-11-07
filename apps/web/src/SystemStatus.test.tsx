import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SystemStatus } from "./SystemStatus";

function respondWith(status: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ status, checks: {} }))),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SystemStatus", () => {
  it("reports ready when the API is ready", async () => {
    respondWith("ready");
    render(<SystemStatus />);
    expect(await screen.findByText("All systems ready")).toBeTruthy();
  });

  it("reports unavailable when a dependency is down", async () => {
    respondWith("not_ready");
    render(<SystemStatus />);
    expect(await screen.findByText("System unavailable")).toBeTruthy();
  });

  it("reports unavailable when the API can't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    render(<SystemStatus />);
    expect(await screen.findByText("System unavailable")).toBeTruthy();
  });

  it("announces its status to screen readers", async () => {
    respondWith("ready");
    render(<SystemStatus />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(await screen.findByText("All systems ready")).toBeTruthy();
  });
});
