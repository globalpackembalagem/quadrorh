import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "xlsx-js-style": path.resolve(__dirname, "./src/lib/xlsx-cdn-wrapper.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["xlsx-js-style"],
  },
  build: {
    commonjsOptions: {
      ignoreDynamicRequires: true,
      transformMixedEsModules: true,
    },
    target: "esnext",
  },
}));
