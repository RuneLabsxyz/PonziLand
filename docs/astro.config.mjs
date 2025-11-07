// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";

import tailwindcss from "@tailwindcss/vite";

import starlight from "@astrojs/starlight";

import icon from "astro-icon";

import svelte from "@astrojs/svelte";

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
});
