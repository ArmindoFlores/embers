import { defineConfig } from "vite";
// @ts-expect-error The package "vite-plugin-raw" does not include type declarations
import raw from "vite-plugin-raw";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        raw({
            match: /\.frag$/,
        })
    ],
    server: {
        headers: {
            "Cache-Control": "public, max-age=60"
        },
        cors: true
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                background: resolve(__dirname, "background.html"),
            }
        }
    }
});
