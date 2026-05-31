import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: [
        "src/config/featureFlags.js",
        "src/utils/abTest.js",
        "src/utils/eventTracker.js"
      ],
      reporter: ["text", "json", "html"]
    }
  }
});