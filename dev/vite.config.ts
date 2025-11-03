import { defineConfig, mergeConfig } from "vite";
import config from "../vite.config.ts";

export default mergeConfig(
  config,
  defineConfig({
    root: "dev",
    server: {
      port: 3000,
    },
  }),
);
