/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Shared Vitest base config for AI Product OS apps.
 *
 * Usage in an app's vitest.config.ts:
 *   import { defineConfig, mergeConfig } from "vitest/config";
 *   import baseConfig from "../../libs/shared/vitest.config";
 *   export default mergeConfig(baseConfig, defineConfig({ ... }));
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".next"],
    setupFiles: [],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/api/**"],
      exclude: ["src/**/*.test.*", "node_modules"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
});
