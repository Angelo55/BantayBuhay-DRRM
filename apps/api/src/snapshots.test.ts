import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { folderStore, supabaseStore } from "./snapshots.js";

const IMAGE = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

describe("folderStore", () => {
  it("reads back what it saved, and null for an unknown name", async () => {
    const store = folderStore(join(mkdtempSync(join(tmpdir(), "bb-store-")), "nested"));
    await store.save("a.jpg", IMAGE);
    expect(await store.read("a.jpg")).toEqual(IMAGE);
    expect(await store.read("missing.jpg")).toBeNull();
  });
});

describe("supabaseStore", () => {
  const options = { url: "https://example.supabase.co", bucket: "snapshots" };

  it("uploads to the private bucket without overwriting", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 200 }));
    const store = supabaseStore({ ...options, serviceRoleKey: "sb_secret_test_not_real", fetch });

    await store.save("abc.jpg", IMAGE);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://example.supabase.co/storage/v1/object/snapshots/abc.jpg");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-upsert"]).toBe("false");
    expect(headers.apikey).toBe("sb_secret_test_not_real");
    // Secret keys aren't JWTs, so they don't go in Authorization.
    expect(headers.authorization).toBeUndefined();
  });

  it("sends a legacy JWT key as a bearer token too", async () => {
    const fetch = vi.fn(async () => new Response(IMAGE, { status: 200 }));
    const store = supabaseStore({ ...options, serviceRoleKey: "eyJtest.not.real", fetch });

    expect(await store.read("abc.jpg")).toEqual(IMAGE);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://example.supabase.co/storage/v1/object/authenticated/snapshots/abc.jpg");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer eyJtest.not.real");
  });

  it("treats a missing object as null and other failures as errors", async () => {
    const missing = supabaseStore({
      ...options,
      serviceRoleKey: "sb_secret_test_not_real",
      fetch: vi.fn(async () => new Response("{}", { status: 400 })),
    });
    expect(await missing.read("gone.jpg")).toBeNull();

    const broken = supabaseStore({
      ...options,
      serviceRoleKey: "sb_secret_test_not_real",
      fetch: vi.fn(async () => new Response("{}", { status: 500 })),
    });
    await expect(broken.save("x.jpg", IMAGE)).rejects.toThrow(/500/);
  });
});
