import type { Client } from '$lib/contexts/client.svelte';
import { ModelsMapping, type Config, type SchemaType } from '$lib/models.gen';
import { ToriiQueryBuilder, type ParsedEntity } from '@dojoengine/sdk';
import type { Subscription } from '@dojoengine/torii-client';

export class ConfigStore {
  private configState = $state<Config | undefined>(undefined);

  // Subscription handle for cleanup
  private subscription: Subscription | undefined;

  constructor() {
    // State starts empty - will be populated when setup() is called
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

        // Update the rune state
        if (!this.configState) {
          // No existing config, use the new data as-is
          this.configState = configModel as Config;
        } else {
          // Merge new config with existing config to preserve unchanged fields
          this.configState = { ...this.configState, ...configModel } as Config;
        }
      }
    });
  }

  /**
   * Get reactive config - components can access this directly
   * Returns undefined until config loads
   */
  public get config(): Config | undefined {
    return this.configState;
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
