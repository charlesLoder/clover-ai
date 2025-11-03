/**
 * Vite configuration for development tooling only (Vitest, Storybook) and extended in `dev/vite.config.ts` for local a development server.
 *
 * The production of library build relies on TypeScript (tsc) and not Vite bundling.
 *
 * Key points:
 * - Uses the React plugin for fast HMR and JSX transform during local testing.
 * - Exports a Vitest-focused config via defineConfig from "vitest/config" (not the standard Vite build flow).
 * - Vitest test environment: jsdom + globals + a single setup file (vitest.setup.ts).
 * - Path aliases mirror those in tsconfig.json so imports like `@components` work consistently.
 */
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    root: __dirname,
    setupFiles: "./vitest.setup.ts",
  },
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "src/components/index.ts"),
      "@context": path.resolve(__dirname, "src/plugin/context/index.ts"),
      "@icons": path.resolve(__dirname, "src/icons/index.ts"),
      "@types": path.resolve(__dirname, "src/types.d.ts"),
      "@utils": path.resolve(__dirname, "src/plugin/utils/index.ts"),
    },
  },
});
