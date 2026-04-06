/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { qrcode } from "vite-plugin-qrcode";
import manifest from "./manifest";
import workbox from "./workbox.config";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { createHtmlPlugin } from "vite-plugin-html";

const isDevHost = process.env.npm_lifecycle_event === "dev:host";

// Enable HTTPS (required for camera access, etc.)
const DEV_ENABLE_HTTPS = isDevHost;

// Enable to test PWA functionality in dev, but it may slow down HMR.
// NOTE: PWA + HTTPS only works on localhost, not network IPs. Set DEV_ENABLE_HTTPS to `false` for mobile testing.
const DEV_ENABLE_PWA = false;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  cacheDir: ".cache/vite",
  optimizeDeps: {
    include: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  plugins: [
    react({
      jsxImportSource: "@emotion/react",
      babel: {
        plugins: ["@emotion/babel-plugin"],
        compact: true,
      },
    }),
    DEV_ENABLE_HTTPS && basicSsl(),
    createHtmlPlugin({
      entry: "src/main.tsx",

      inject: {
        data: {
          meticulousScript:
            mode !== "production"
              ? `<script data-recording-token="KIKSNlPyMynKq363rTfrFLcwE0pS492DGKYrI3ol" data-is-production-environment="false" src="https://snippet.meticulous.ai/v1/meticulous.js"></script>`
              : "",
        },
      },
    }),
    // Generate QR code for npm run dev:host
    qrcode({ filter: (url) => /^https?:\/\/192\.168\.0\./.test(url) }),
    // https://vite-pwa-org.netlify.app/
    VitePWA({
      manifest, // manifest.ts
      devOptions: {
        enabled: DEV_ENABLE_PWA,
        type: "module",
      },
      registerType: "prompt",
      workbox, // workbox.config.ts
      includeAssets: ["**/*", "sw.js", "!splash-screens/**/*"],
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", ".json", ".mjs", ".mts"],
    dedupe: ["react", "react-dom", "@emotion/react"],
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.code === "SOURCEMAP_ERROR" ||
          warning.message.includes("PURE") // ignore PURE comment warning
        ) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.match(/node_modules\/react(-dom)?\//) ||
              id.includes("node_modules/react-is/") ||
              id.includes("node_modules/scheduler/")
            ) {
              return "vendor-react";
            }
            if (id.includes("@dnd-kit")) {
              return "dnd-kit";
            }
            if (id.includes("@mui") || id.includes("@emotion")) {
              return "ui-lib";
            }
            if (id.includes("emoji-picker-react")) {
              return "emoji";
            }
            if (id.includes("ntc-ts")) {
              return "ntc";
            }
            return "vendor"; // other node_modules
          }

          if (id.includes("src/components/tasks")) {
            return "tasks";
          }
          if (id.includes("src/components/settings")) {
            return "settings";
          }
        },
      },
    },
  },
}));
