import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { componentTagger } from "lovable-tagger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    componentTagger(),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
        await import("@replit/vite-plugin-dev-banner").then((m) =>
          m.devBanner(),
        ),
      ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  // Override root when used in middleware mode (server/vite.ts sets it)
  // This allows Vite to resolve files correctly
  root: path.resolve(__dirname, "client"),
  // Load .env from project root (parent directory)
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  publicDir: "public",
  server: {
    host: "0.0.0.0",
    port: 3001,
    strictPort: false, // Allow fallback to next available port if 3001 is in use
    fs: {
      strict: true,
      deny: [".env", ".env.*", "*.{crt,pem,key}"],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
    headers: {
      // Allow unsafe-eval in development for Vite HMR and dev tools
      // This is safe in development but should be removed in production
      'Content-Security-Policy': process.env.NODE_ENV === 'development' 
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; object-src 'none'; base-uri 'self';"
        : "script-src 'self' 'unsafe-inline' https:; object-src 'none'; base-uri 'self';"
    },
  },
});
