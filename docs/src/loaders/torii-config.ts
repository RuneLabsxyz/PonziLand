import type { Loader } from "astro/loaders";
import { TORII_URL } from "astro:env/client";

interface ToriiConfigRaw {
  auction_duration: number;
  base_time: number;
  buy_fee: string;
  claim_fee: string;
  claim_fee_threshold: string;
  decay_rate: number;
  drop_rate: number;
  floor_price: string;
  id: number;
  linear_decay_time: number;
  liquidity_safety_multiplier: number;
  main_currency: string;
  max_auctions: number;
  max_auctions_from_bid: number;
  max_circles: number;
  min_auction_price: string;
  min_auction_price_multiplier: number;
  our_contract_for_auction: string;
  our_contract_for_fee: string;
  price_decrease_rate: number;
  rate_denominator: number;
  scaling_factor: number;
  tax_rate: number;
  time_speed: number;
  [key: string]: unknown;
}

export interface GameConfig {
  auction_duration: number;
  base_time: number;
  buy_fee: bigint;
  claim_fee: bigint;
  claim_fee_threshold: bigint;
  decay_rate: number;
  drop_rate: number;
  floor_price: bigint;
  id: number;
  linear_decay_time: number;
  liquidity_safety_multiplier: number;
  main_currency: string;
  max_auctions: number;
  max_auctions_from_bid: number;
  max_circles: number;
  min_auction_price: bigint;
  min_auction_price_multiplier: number;
  our_contract_for_auction: string;
  our_contract_for_fee: string;
  price_decrease_rate: number;
  rate_denominator: number;
  scaling_factor: number;
  tax_rate: number;
  time_speed: number;
  [key: string]: unknown;
}

export function toriiConfigLoader(): Loader {
  return {
    name: "torii-config-loader",
    load: async ({ store, logger }) => {
      logger.info("Fetching game config from Torii API");

      const response = await fetch(TORII_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "SELECT * FROM `ponzi_land-Config` LIMIT 1;",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch config: ${response.status} ${response.statusText}`,
        );
      }

      const data: ToriiConfigRaw[] = await response.json();

      if (!data || data.length === 0) {
        throw new Error("No config data returned from API");
      }

      const rawConfig = data[0];

      // Convert hex strings to BigInt for numeric fields
      const config: GameConfig = {
        ...rawConfig,
        buy_fee: BigInt(rawConfig.buy_fee),
        claim_fee: BigInt(rawConfig.claim_fee),
        claim_fee_threshold: BigInt(rawConfig.claim_fee_threshold),
        floor_price: BigInt(rawConfig.floor_price),
        min_auction_price: BigInt(rawConfig.min_auction_price),
      };

      // Store as a single entry with ID "config"
      store.set({
        id: "config",
        data: config,
      });

      logger.info("Game config loaded successfully");
    },
  };
}
