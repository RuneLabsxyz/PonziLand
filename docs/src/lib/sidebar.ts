import { getCollection } from "astro:content";
import { categories } from "./categories.config";

export async function getSidebarData() {
  console.time("getSidebarData");
  const docs = await getCollection("docs");

  console.timeEnd("getSidebarData");

  console.time("groupDocs");
  // Group by category
  const grouped = docs.reduce(
    (acc, doc) => {
      const category = doc.data.categoryKey || "uncategorized";
      if (!acc[category]) acc[category] = [];
      acc[category].push(doc);
      return acc;
    },
    {} as Record<string, typeof docs>,
  );

  // Sort categories by order, then sort docs within each category
  const result = Object.entries(grouped)
    .sort(([aKey], [bKey]) => {
      const aOrder = categories[aKey as keyof typeof categories]?.order ?? 999;
      const bOrder = categories[bKey as keyof typeof categories]?.order ?? 999;
      return aOrder - bOrder;
    })
    .map(([categoryKey, categoryDocs]) => ({
      category: categories[categoryKey as keyof typeof categories] || {
        label: categoryKey,
        folder: categoryKey,
        order: 999,
      },
      categoryKey,
      docs: categoryDocs.sort(
        (a, b) => (a.data.order || 0) - (b.data.order || 0),
      ),
    }));

  console.timeEnd("groupDocs");

  return result;
}
