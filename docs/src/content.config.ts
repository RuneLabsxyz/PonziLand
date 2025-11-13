import { defineCollection, z } from "astro:content";
import { toriiConfigLoader } from "./loaders/torii-config";
import { docsLoader } from "./loaders/docs-loader";

const docs = defineCollection({
  loader: docsLoader(),
  schema: z.object({
    title: z.string(),
    order: z.number().default(0),

    // Auto-populated by loader based on file path
    categoryKey: z.string().optional(),
    categoryLabel: z.string().optional(),
    categoryOrder: z.number().optional(),
    categoryIcon: z.string().optional(),

    // Optional manual overrides
    category: z.string().optional(),
    subcategory: z.string().optional(),
  }),
});

const gameConfig = defineCollection({
  loader: toriiConfigLoader(),
  schema: z
    .object({
      // Game timing configuration
      auction_duration: z.number(),
      base_time: z.number(),
      linear_decay_time: z.number(),
      time_speed: z.number(),

      // Fees (converted from hex to bigint)
      buy_fee: z.bigint(),
      claim_fee: z.bigint(),
      claim_fee_threshold: z.bigint(),

      // Prices (converted from hex to bigint)
      floor_price: z.bigint(),
      min_auction_price: z.bigint(),
      min_auction_price_multiplier: z.number(),

      // Rates and percentages
      decay_rate: z.number(),
      drop_rate: z.number(),
      price_decrease_rate: z.number(),
      rate_denominator: z.number(),
      tax_rate: z.number(),
      scaling_factor: z.number(),

      // Auction configuration
      max_auctions: z.number(),
      max_auctions_from_bid: z.number(),
      liquidity_safety_multiplier: z.number(),

      // Game limits
      max_circles: z.number(),

      // Contract addresses (kept as strings)
      main_currency: z.string(),
      our_contract_for_auction: z.string(),
      our_contract_for_fee: z.string(),

      // Internal ID
      id: z.number(),
    })
    .passthrough(),
});

export const collections = {
  docs,
  gameConfig,
};
