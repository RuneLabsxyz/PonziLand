import { glob } from "astro/loaders";
import type { Loader } from "astro/loaders";
import { categories, type CategoryKey } from "../lib/categories.config";

export function docsLoader(): Loader {
  // Use glob loader for file parsing (MDX support, etc.)
  const baseLoader = glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/docs",
  });

  return {
    name: "docs-loader",
    load: async (context) => {
      console.time("loadDoc");
      // Call the base glob loader
      await baseLoader.load(context);

      // Enrich each entry with category metadata
      const entries = Array.from(context.store.entries());

      for (const [id, entry] of entries) {
        const filePath = id as string;

        // Extract category from file path
        const categoryKey = getCategoryFromPath(filePath);

        if (categoryKey) {
          const categoryMeta = categories[categoryKey];

          // Enrich the entry data
          context.store.set({
            id,
            data: {
              ...entry.data,
              categoryKey,
              categoryLabel: categoryMeta.label,
              categoryOrder: categoryMeta.order,
              categoryIcon: categoryMeta.icon,
            },
          });
        } else {
          // Mark root-level docs (not in any category folder)
          context.store.set({
            id,
            data: {
              ...entry.data,
              categoryKey: "root",
              categoryLabel: null,
              categoryOrder: 0,
              categoryIcon: null,
            },
          });
        }
      }

      console.timeEnd("loadDoc");
    },
  };
}

function getCategoryFromPath(filePath: string): CategoryKey | null {
  // Extract first folder from path (e.g., "getting-started/intro.md" -> "getting-started")
  const match = filePath.match(/^([^\/]+)\//);
  if (!match) return null;

  const folder = match[1];
  return Object.keys(categories).find(
    (key) => categories[key as CategoryKey].folder === folder,
  ) as CategoryKey | null;
}
