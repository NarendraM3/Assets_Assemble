import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    cssMinify: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) {
            return "vendor";
          }
          if (id.includes("node_modules/@radix-ui/")) {
            return "ui";
          }
          if (id.includes("node_modules/")) {
            return "vendor";
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
  },
});
