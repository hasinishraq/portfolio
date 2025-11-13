// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

// https://astro.build/config for upload
export default defineConfig({
  site: "https://hasinishraq.com",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
