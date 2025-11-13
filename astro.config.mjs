// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config for upload
export default defineConfig({
   site: 'https://hasinishraq.github.io',
   base: '/portfolio',
    vite: {
      plugins: [tailwindcss()],
    },
});
