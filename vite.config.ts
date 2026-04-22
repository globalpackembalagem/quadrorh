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
    include: [],
  },
  build: {
    chunkSizeWarningLimit: 2000,
    commonjsOptions: {
      ignoreDynamicRequires: true,
      transformMixedEsModules: true,
    },
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["@radix-ui/react-accordion", "@radix-ui/react-alert-dialog", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-popover", "@radix-ui/react-select", "@radix-ui/react-tabs", "lucide-react"],
          charts: ["recharts"],
          utils: ["date-fns", "xlsx-js-style", "zod"],
        },
      },
    },
  },
}));
