import { defineConfig } from "vite";
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
