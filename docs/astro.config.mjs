// @ts-check
import { defineConfig, envField } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import svelte from "@astrojs/svelte";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  integrations: [mdx(), icon(), svelte()],

  vite: {
    plugins: [
      // @ts-expect-error https://github.com/withastro/astro/issues/14030
      tailwindcss(),
    ],
    resolve: {
      conditions: ["svelte", "import", "module", "browser", "default"],
    },
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

  adapter: node({
    mode: "standalone",
  }),
});
