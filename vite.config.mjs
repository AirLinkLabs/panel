import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite config for Airlink Panel.
 *
 * Source: public/styles/tw.css (Tailwind v4 + custom CSS)
 * Output: public/assets/css/panel-[hash].css + public/.vite/manifest.json
 *
 * All panel assets live in public/. assetUrl() resolves paths and
 * prepends ASSET_URL (CDN origin) when configured.
 */
export default defineConfig({
  root: __dirname,
  publicDir: false,
  build: {
    outDir: path.resolve(__dirname, "public"),
    emptyOutDir: false,
    manifest: true,
    rollupOptions: {
      input: {
        panel: path.resolve(__dirname, "public/styles/tw.css"),
      },
      output: {
        entryFileNames: "assets/js/[name]-[hash].js",
        chunkFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "assets/css/[name]-[hash].[ext]";
          }
          return "assets/media/[name]-[hash].[ext]";
        },
      },
    },
    target: "es2020",
    minify: "esbuild",
    sourcemap: false,
  },
  css: {
    devSourcemap: true,
  },
  // Ensure scripts/ is never copied to build output
  server: {
    fs: {
      deny: ["**/scripts/**"],
    },
  },
});
