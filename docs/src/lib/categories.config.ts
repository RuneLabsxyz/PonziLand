export const categories = {
  "getting-started": {
    label: "Getting Started",
    folder: "getting-started",
    order: 1,
    icon: "rocket",
  },
  api: {
    label: "Game API",
    folder: "api",
    order: 2,
    icon: "gamepad",
  },
} as const;

export type CategoryKey = keyof typeof categories;
