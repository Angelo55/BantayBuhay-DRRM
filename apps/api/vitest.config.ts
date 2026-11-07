import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./src/test-support/global-setup.ts"],
    // Test files share one database, so they run one at a time.
    fileParallelism: false,
    // Tests use real Argon2id hashing, which is slow on purpose and slower on a busy machine.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
