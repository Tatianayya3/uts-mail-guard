import path from "node:path";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import zip from "vite-plugin-zip-pack";
import { createManifest } from "./manifest.config";
import pkg from "./package.json" with { type: "json" };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "VITE_");
  return {
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "src") },
    },
    plugins: [
      react(),
      tailwindcss(),
      crx({ manifest: createManifest(env.VITE_API_GATEWAY_URL) }),
      zip({ outDir: "release", outFileName: `mail-guard-${pkg.version}.zip` }),
    ],
    // El popup se carga desde disco (no por red): ~550 kB es aceptable.
    build: { chunkSizeWarningLimit: 700 },
    server: {
      cors: { origin: [/chrome-extension:\/\//] },
    },
  };
});
