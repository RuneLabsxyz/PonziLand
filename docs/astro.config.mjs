// @ts-check
import { defineConfig, envField } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  integrations: [mdx(), icon()],

  vite: {
    plugins: [tailwindcss()],
  },

  env: {
    schema: {
      TORII_URL: envField.string({
        context: "client",
        access: "public",
        url: true,
        optional: false,
      }),
    },
  },
});
