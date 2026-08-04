import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
    plugins: [vue(), tailwindcss()],
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
                manualChunks(id: string) {
                    if (
                        id.includes("node_modules/vue") ||
                        id.includes("node_modules/@vue")
                    ) {
                        return "vue";
                    }
                    if (
                        id.includes("node_modules/ai") ||
                        id.includes("node_modules/@tauri-apps/plugin-http")
                    ) {
                        return "ai";
                    }
                },
            },
        },
    },
}));
