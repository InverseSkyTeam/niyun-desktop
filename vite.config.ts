import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const host = process.env.TAURI_DEV_HOST;

function splitVendorChunks(id: string): string | undefined {
    if (
        id.includes("node_modules/react") ||
        id.includes("node_modules/react-dom") ||
        id.includes("node_modules/zustand") ||
        id.includes("node_modules/react-router")
    ) {
        return "react";
    }
    if (
        id.includes("node_modules/ai") ||
        id.includes("node_modules/@tauri-apps/plugin-http")
    ) {
        return "ai";
    }
    return undefined;
}

export default defineConfig(async () => ({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },

    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                  protocol: "ws",
                  host,
                  port: 1421,
              }
            : undefined,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: splitVendorChunks,
            },
        },
    },
}));
