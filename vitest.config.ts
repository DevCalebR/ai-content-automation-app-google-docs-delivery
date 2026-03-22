import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    fileParallelism: false,
    globals: true,
    setupFiles: ["dotenv/config", "./tests/setup-env.ts"],
  },
});
