import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: "dev",
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "src/components/index.ts"),
      "@context": path.resolve(__dirname, "src/plugin/context/plugin-context.tsx"),
      "@icons": path.resolve(__dirname, "src/icons/index.ts"),
      "@types": path.resolve(__dirname, "src/types.d.ts"),
      "@utils": path.resolve(__dirname, "src/plugin/utils/index.ts"),
    },
  },
});
