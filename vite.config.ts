import { defineConfig } from "vite";
// @ts-expect-error The package "vite-plugin-raw" does not include type declarations
import raw from "vite-plugin-raw";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        raw({
            match: /\.frag$/,
        })
    ],
});
