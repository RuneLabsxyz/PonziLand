/**
 * PonziLand Store for Midgard
 * Simple store to query owned lands from Torii
 */

import { setupClient, type Client } from '$lib/contexts/client.svelte';
import { ModelsMapping, type SchemaType } from '$lib/models.gen';
import { ToriiQueryBuilder, type ParsedEntity } from '@dojoengine/sdk';
import { padAddress, locationToCoordinates } from '$lib/utils';
import accountState from '$lib/account.svelte';

export interface OwnedLand {
  location: number;
  coordinates: { x: number; y: number };
  owner: string;
  sellPrice: bigint;
  tokenUsed: string;
  level: string;
  stakeAmount: bigint;
}

class PonziLandStore {
  public lands = $state<OwnedLand[]>([]);
  public isLoading = $state(false);
  public error = $state<string | null>(null);

  private client: Client | undefined;
  private subscription: { cancel: () => void } | undefined;

  async setup(): Promise<void> {
    // Get Dojo client
    this.client = await setupClient();
    if (!this.client) {
      this.error = 'Failed to setup client';
      return;
    }

    // Initial load
    await this.loadLands();

    // Subscribe to updates
    await this.subscribe();
  }

  private getQuery() {
    return new ToriiQueryBuilder()
      .addEntityModel(ModelsMapping.Land)
      .addEntityModel(ModelsMapping.LandStake)
      .includeHashedKeys();
  }

  async loadLands(): Promise<void> {
    if (!this.client || !accountState.address) return;

    this.isLoading = true;
    this.error = null;

    try {
      const userAddress = padAddress(accountState.address);
      const entities: ParsedEntity<SchemaType>[] = [];

      let data = await this.client.getEntities({ query: this.getQuery() });
      entities.push(...data.getItems());

      while (data.cursor != undefined) {
        const query = data.getNextQuery(this.getQuery());
        data = await this.client.getEntities({ query });
        entities.push(...data.getItems());
      }

      // Build land map with stakes
      if (userAddress) {
        this.processEntities(entities, userAddress);
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load lands';
      console.error('Failed to load lands:', e);
    } finally {
      this.isLoading = false;
    }
  }

  private processEntities(
    entities: ParsedEntity<SchemaType>[],
    userAddress: string,
  ): void {
    const landMap = new Map<number, OwnedLand>();
    const stakeMap = new Map<number, bigint>();

    // First pass: collect all stakes
    for (const entity of entities) {
      const stake = entity.models.ponzi_land?.LandStake;
      if (stake?.location && stake?.amount) {
        stakeMap.set(Number(stake.location), BigInt(stake.amount));
      }
    }

    // Second pass: collect lands owned by user
    for (const entity of entities) {
      const land = entity.models.ponzi_land?.Land;
      if (
        land?.owner &&
        land?.location &&
        land?.sell_price &&
        land?.token_used &&
        padAddress(land.owner) === userAddress
      ) {
        const location = Number(land.location);
        landMap.set(location, {
          location,
          coordinates: locationToCoordinates(location),
          owner: land.owner,
          sellPrice: BigInt(land.sell_price),
          tokenUsed: land.token_used,
          level: String(land.level ?? 1),
          stakeAmount: stakeMap.get(location) ?? 0n,
        });
      }
    }

    this.lands = Array.from(landMap.values());
  }

  private async subscribe(): Promise<void> {
    if (!this.client) return;

    const [, sub] = await this.client.subscribeEntityQuery({
      query: this.getQuery(),
      callback: (result) => {
        if (result.error) {
          console.error('PonziLand subscription error:', result.error);
        } else if (accountState.address) {
          // Reload on updates
          this.loadLands();
        }
      },
    });

    this.subscription = sub;
  }

  cleanup(): void {
    if (this.subscription) {
      this.subscription.cancel();
      this.subscription = undefined;
    }
    this.lands = [];
    this.error = null;
  }
}

export const ponziLandStore = new PonziLandStore();
