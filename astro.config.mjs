import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  build: { format: "file" },
  server: { host: "127.0.0.1", port: 4173 },
  devToolbar: { enabled: false },
  vite: { build: { assetsInlineLimit: 0 } },
});
