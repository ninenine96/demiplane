import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@demiplane/common": new URL(
        "./packages/common/src/index.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "shared/**/*.test.ts", "frontend/**/*.test.ts"],
  },
});
