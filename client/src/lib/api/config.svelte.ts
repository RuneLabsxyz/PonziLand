/**
 * ConfigStore - Manages dynamic configuration from smart contracts
 *
 * SUBSCRIPTION PATTERN EXPLAINED:
 * ===============================
 * 1. Smart Contract: When config changes in Cairo contract, emits ConfigUpdated event
 * 2. Torii Indexer: Listens to contract events and updates its database
 * 3. Client Subscription: This store subscribes to Config model changes via Torii
 * 4. Svelte Store: Updates reactive store, triggering UI updates automatically
 *
 * PATTERN FOLLOWED:
 * ================
 * - Similar to LandTileStore architecture
 * - Setup method initializes subscription + loads initial data
 * - Internal writable store for reactive updates
 * - Cleanup on destroy to prevent memory leaks
 */

import type { Client } from '$lib/contexts/client.svelte';
import { ModelsMapping, type Config, type SchemaType } from '$lib/models.gen';
import { ToriiQueryBuilder, type ParsedEntity } from '@dojoengine/sdk';
import type { Subscription } from '@dojoengine/torii-client';
import { writable, type Readable } from 'svelte/store';

export class ConfigStore {
  // Internal Svelte store - starts undefined until config loads from blockchain
  private configStore = writable<Config | undefined>(undefined);

  // Subscription handle for cleanup
  private subscription: Subscription | undefined;

  constructor() {
    // Store starts empty - will be populated when setup() is called
  }

  /**
   * Setup the config subscription - called during app initialization
   */
  public async setup(client: Client) {
    // Cancel existing subscription if any (for hot reloads)
    if (this.subscription) {
      this.subscription.cancel();
      this.subscription = undefined;
    }

    // Build query for Config model subscription
    const query = this.getConfigQuery();

    // Subscribe to Config model changes via Torii client
    const subscribeResponse = await client.subscribeEntityQuery({
      query,
      callback: (result) => {
        if (result.error) {
          console.error('❌ Config subscription error:', result.error);
        } else {
          // SUCCESS: Forward new config data to our callback
          // This gets called every time config changes in blockchain
          this.setConfig(result.data);
        }
      },
    });

    // Get initial data immediately (don't wait for first update)
    const initialData = subscribeResponse[0];
    const initialEntities: ParsedEntity<SchemaType>[] = [];
    initialEntities.push(...initialData.getItems());

    // Load initial config data immediately
    this.setConfig(initialEntities);

    // Store subscription for cleanup
    this.subscription = subscribeResponse[1];
  }

  /**
   * Process config entities from subscription updates
   * Called both for initial load and real-time updates
   */
  private setConfig(entities: ParsedEntity<SchemaType>[]) {
    entities.forEach((entity) => {
      // Extract Config model from entity (Dojo structure)
      const configModel = entity.models.ponzi_land?.Config;

      // Only update if we have valid config data
      if (configModel && Object.keys(configModel).length > 0) {
        console.log('🔧 Config updated from contracts:', configModel);

        // Use store.update to merge with current config
        this.configStore.update((currentConfig) => {
          if (!currentConfig) {
            // No existing config, use the new data as-is
            return configModel as Config;
          }

          // Merge new config with existing config to preserve unchanged fields
          return { ...currentConfig, ...configModel } as Config;
        });
      }
    });
  }

  /**
   * Get reactive config store - components subscribe to this
   * Returns undefined until config loads
   */
  public getConfig(): Readable<Config | undefined> {
    return this.configStore;
  }

  /**
   * Build Torii query for Config model
   */
  private getConfigQuery() {
    return new ToriiQueryBuilder()
      .addEntityModel(ModelsMapping.Config) // Subscribe to Config model
      .includeHashedKeys(); // Include entity keys for proper updates
  }

  /**
   * Cleanup subscription to prevent memory leaks
   */
  public destroy() {
    if (this.subscription) {
      this.subscription.cancel();
      this.subscription = undefined;
    }
  }
}
