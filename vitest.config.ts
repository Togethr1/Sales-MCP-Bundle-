import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

function fromRoot(path: string) {
  return fileURLToPath(new URL(path, import.meta.url));
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@sales-mcp/core": fromRoot("./packages/core/src/index.ts"),
      "@sales-mcp/fixtures": fromRoot("./packages/fixtures/src/index.ts"),
      "@sales-mcp/providers": fromRoot("./packages/providers/src/index.ts"),
      "@sales-mcp/workflows": fromRoot("./packages/workflows/src/index.ts"),
    },
  },
});
