import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./src/test-support/global-setup.ts"],
    // Test files share one database, so they run one at a time.
    fileParallelism: false,
  },
});
