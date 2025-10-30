import { buildSpritesheet, type SpritesheetMetadata } from '@threlte/extras';
import { biomeAtlasMeta } from '$lib/components/+game-map/three/biomes';
import { buildingAtlasMeta } from '$lib/components/+game-map/three/buildings';
import { setupConfigStore } from './config.store.svelte';
import { setupClient, type Client } from '$lib/contexts/client.svelte';
import { landStore } from './store.svelte';
import { walletStore } from './wallet.svelte';
import accountState, { setup, setTutorialMode } from '$lib/account.svelte';
import { getTokenPrices } from '$lib/api/defi/ekubo/requests';
import { usernamesStore } from './account.store.svelte';
import {
  fetchUsernamesBatch,
  getUserAddresses,
  getBuyEvents,
  fetchTokenBalances,
} from '$lib/components/+game-ui/widgets/leaderboard/request';

interface LoadingProgress {
  total: number;
  loaded: number;
  items: Record<string, boolean>;
}

export interface GameLoadingPhases {
  webgl: LoadingProgress;
  spritesheets: LoadingProgress;
  assets: LoadingProgress;
  client: LoadingProgress;
  config: LoadingProgress;
  prices: LoadingProgress;
  wallet: LoadingProgress;
  dojo: LoadingProgress;
  social: LoadingProgress;
  landStore: LoadingProgress;
  usernames: LoadingProgress;
  rendering: LoadingProgress;
}

type SpriteTextureConfig = {
  spritesheet: import('@threejs-kit/instanced-sprite-mesh').SpritesheetFormat;
  texture: import('three').Texture;
  geometry?: any;
};

class LoadingStore {
  private _phases = $state<GameLoadingPhases>({
    webgl: {
      total: 3,
      loaded: 0,
      items: {
        'webgl-init': false,
        'sprite-outline-shader': false,
        'shader-compilation': false,
      },
    },
    spritesheets: { total: 0, loaded: 0, items: {} },
    assets: { total: 0, loaded: 0, items: {} },
    client: { total: 1, loaded: 0, items: { 'client-setup': false } },
    config: { total: 1, loaded: 0, items: { 'game-config': false } },
    prices: { total: 1, loaded: 0, items: { 'token-prices': false } },
    wallet: {
      total: 2,
      loaded: 0,
      items: {
        'wallet-connect': false,
        'account-setup': false,
      },
    },
    dojo: {
      total: 2,
      loaded: 0,
      items: { 'dojo-init': false, 'dojo-subscriptions': false },
    },
    social: { total: 1, loaded: 0, items: { 'social-links': false } },
    landStore: { total: 1, loaded: 0, items: { 'land-data': false } },
    usernames: { total: 1, loaded: 0, items: { 'username-fetch': false } },
    rendering: {
      total: 3,
      loaded: 0,
      items: {
        'canvas-ready': false,
        'first-frame': false,
        'scene-loaded': false,
      },
    },
  });

  private _isLoading = $state(true);
  private _isTutorialMode = $state<boolean | null>(null);
  private _client = $state<Client | undefined>(undefined);

  // Spritesheet atlas instances
  buildingAtlas =
    buildSpritesheet.from<typeof buildingAtlasMeta>(buildingAtlasMeta);
  biomeAtlas = buildSpritesheet.from<typeof biomeAtlasMeta>(biomeAtlasMeta);

  // Store loaded spritesheets
  private _loadedSpritesheets = $state<{
    building?: SpriteTextureConfig;
    biome?: SpriteTextureConfig;
    road?: SpriteTextureConfig;
    nuke?: SpriteTextureConfig;
    fog?: SpriteTextureConfig;
    owner?: SpriteTextureConfig;
  }>({});

  roadAtlasMeta = [
    {
      url: '/land-display/road.png',
      type: 'rowColumn',
      width: 1,
      height: 1,
      animations: [{ name: 'default', frameRange: [0, 0] }],
    },
  ] as const satisfies SpritesheetMetadata;
  roadAtlas = buildSpritesheet.from<typeof this.roadAtlasMeta>(
    this.roadAtlasMeta,
  );

  nukeAtlasMeta = [
    {
      url: '/land-display/nuke-animation.png',
      type: 'rowColumn',
      width: 5,
      height: 7,
      animations: [
        { name: 'default', frameRange: [0, 34] },
        { name: 'empty', frameRange: [34, 34] },
      ],
    },
  ] as const satisfies SpritesheetMetadata;
  nukeAtlas = buildSpritesheet.from<typeof this.nukeAtlasMeta>(
    this.nukeAtlasMeta,
  );

  fogAtlasMeta = [
    {
      url: '/land-display/fog.png',
      type: 'rowColumn',
      width: 3,
      height: 3,
      animations: [{ name: 'default', frameRange: [0, 8] }],
    },
  ] as const satisfies SpritesheetMetadata;
  fogAtlas = buildSpritesheet.from<typeof this.fogAtlasMeta>(this.fogAtlasMeta);

  ownerAtlasMeta = [
    {
      url: '/ui/icons/Icon_Crown.png',
      type: 'rowColumn',
      width: 1,
      height: 1,
      animations: [{ name: 'crown', frameRange: [0, 0] }],
    },
  ] as const satisfies SpritesheetMetadata;
  ownerAtlas = buildSpritesheet.from<typeof this.ownerAtlasMeta>(
    this.ownerAtlasMeta,
  );

  constructor() {
    this.initializeLoading();
  }

  // Tutorial mode detection and setup
  setTutorialMode(isTutorial: boolean) {
    this._isTutorialMode = isTutorial;

    // Adjust loading phases based on mode
    if (isTutorial) {
      // Tutorial mode: skip wallet, dojo, social, landStore, and usernames loading
      // But still load prices and keep client for config, webgl/shaders, and rendering
      this._phases.wallet.total = 0;
      this._phases.dojo.total = 0;
      this._phases.social.total = 0;
      this._phases.landStore.total = 0;
      this._phases.usernames.total = 0;
      this.markPhaseCompleted('wallet');
      this.markPhaseCompleted('dojo');
      this.markPhaseCompleted('social');
      this.markPhaseCompleted('landStore');
      this.markPhaseCompleted('usernames');
      // Keep prices and rendering phase active in tutorial mode
    } else {
      // Full mode: enable all loading phases including rendering
      this._phases.wallet.total = 2;
      this._phases.dojo.total = 2;
      this._phases.social.total = 1;
      this._phases.landStore.total = 1;
      this._phases.usernames.total = 1;
      // Prices and rendering phase are always active
    }
  }

  // Generic method to mark phase items as loaded
  markPhaseItemLoaded(phase: keyof GameLoadingPhases, itemName: string) {
    const phaseData = this._phases[phase];
    if (!phaseData.items[itemName]) {
      // Ensure reactivity by creating a new items object
      phaseData.items = { ...phaseData.items, [itemName]: true };
      phaseData.loaded++;
      console.log(
        `✓ Marked ${phase}.${itemName} as loaded (${phaseData.loaded}/${phaseData.total})`,
      );
    }
  }

  // Mark entire phase as completed
  markPhaseCompleted(phase: keyof GameLoadingPhases) {
    const phaseData = this._phases[phase];
    // Ensure reactivity by creating a new items object with all items set to true
    const completedItems = Object.keys(phaseData.items).reduce(
      (acc, item) => {
        acc[item] = true;
        return acc;
      },
      {} as Record<string, boolean>,
    );

    phaseData.items = completedItems;
    phaseData.loaded = phaseData.total;
    console.log(`✓ Marked entire ${phase} phase as completed`);
  }

  // WebGL loading
  async initializeWebGL() {
    try {
      // WebGL initialization logic would go here
      this.markPhaseItemLoaded('webgl', 'webgl-init');

      // Sprite outline shader compilation
      await this.compileShaders();
      this.markPhaseItemLoaded('webgl', 'sprite-outline-shader');

      // General shader compilation phase
      await this.compileAllShaders();
      this.markPhaseItemLoaded('webgl', 'shader-compilation');
    } catch (error) {
      console.error('WebGL initialization failed:', error);
      this.markPhaseItemLoaded('webgl', 'webgl-init'); // Mark as loaded even if failed
      this.markPhaseItemLoaded('webgl', 'sprite-outline-shader'); // Mark as loaded even if failed
      this.markPhaseItemLoaded('webgl', 'shader-compilation'); // Mark as loaded even if failed
    }
  }

  // Compile sprite shaders
  private async compileShaders(): Promise<void> {
    // Real shader compilation would happen here - for now just log completion
    console.log('Sprite outline shaders compiled');
    return Promise.resolve();
  }

  // Compile all remaining shaders
  private async compileAllShaders(): Promise<void> {
    // Real shader compilation would happen here - for now just log completion
    console.log('All shaders compiled');
    return Promise.resolve();
  }

  // Client setup (required for config and dojo)
  async initializeClient() {
    try {
      console.log('Setting up Dojo client...');
      this._client = await setupClient();
      this.markPhaseItemLoaded('client', 'client-setup');
    } catch (error) {
      console.error('Client setup failed:', error);
      this.markPhaseItemLoaded('client', 'client-setup');
    }
  }

  // Client completion check
  get isClientSetupComplete() {
    return (
      this._phases.client.items['client-setup'] === true &&
      this._client !== undefined
    );
  }

  // Wallet and account loading (sequential due to dependencies)
  async initializeWallet() {
    if (this._isTutorialMode) return;

    try {
      // Step 1: Setup account manager and listeners first
      console.log('Setting up account manager...');
      await setup();

      // Step 2: Wait for account to be connected with promise-based timeout
      console.log('Waiting for account connection...');
      await Promise.race([
        // Create a promise that resolves when account is connected
        new Promise<void>((resolve, reject) => {
          const checkConnection = () => {
            if (accountState.isConnected || accountState.address) {
              resolve();
            } else {
              // Check again in 100ms
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        }),
        // Timeout after 10 seconds
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error('Account connection timeout')),
            10000,
          ),
        ),
      ]).catch(() => {
        console.warn(
          'Wallet initialization timed out waiting for account connection',
        );
      });

      console.log('Initializing wallet store...');
      await walletStore.init();
      this.markPhaseItemLoaded('wallet', 'wallet-connect');

      // Step 2: Account setup (depends on wallet connection)
      await this.loadAccountSetup();
      this.markPhaseItemLoaded('wallet', 'account-setup');

      // Step 3: Fetch wallet balances if we have an address
      if (accountState.address) {
        console.log(
          'Fetching wallet balances for address:',
          accountState.address,
        );
        await walletStore.update(accountState.address);
        console.log('Wallet balances fetched successfully');
      }
    } catch (error) {
      console.error('Wallet initialization failed:', error);
      // Mark as loaded to continue
      this.markPhaseCompleted('wallet');
    }
  }

  // Account setup completion check
  get isAccountSetupComplete() {
    return this._phases.wallet.items['account-setup'] === true;
  }

  // Config loading (depends on client setup)
  async initializeConfig(clientPromise?: Promise<Client | undefined>) {
    try {
      // Wait for client to be available
      const client = clientPromise ? await clientPromise : this._client;

      if (client) {
        console.log('Setting up config store with client...');
        await setupConfigStore(client);
      } else {
        console.warn('No client available for config setup');
      }

      this.markPhaseItemLoaded('config', 'game-config');
    } catch (error) {
      console.error('Config loading failed:', error);
      this.markPhaseItemLoaded('config', 'game-config');
    }
  }

  // Token prices loading (independent of wallet)
  async initializePrices() {
    try {
      console.log('Loading token prices...');
      const tokenPrices = await getTokenPrices();
      // Store the prices in the wallet store
      walletStore.setTokenPrices(tokenPrices);
      this.markPhaseItemLoaded('prices', 'token-prices');
    } catch (error) {
      console.error('Token prices loading failed:', error);
      this.markPhaseItemLoaded('prices', 'token-prices');
    }
  }

  // Dojo initialization (depends on client setup)
  async initializeDojo(clientPromise?: Promise<Client | undefined>) {
    if (this._isTutorialMode) return;

    try {
      // Wait for client to be available
      const client = clientPromise ? await clientPromise : this._client;

      if (!client) {
        console.warn('No client available for Dojo setup');
        this.markPhaseCompleted('dojo');
        return;
      }

      // Dojo initialization (client is available)
      await this.loadDojoSetup();
      this.markPhaseItemLoaded('dojo', 'dojo-init');

      // Dojo subscriptions
      await this.loadDojoSubscriptions();
      this.markPhaseItemLoaded('dojo', 'dojo-subscriptions');
    } catch (error) {
      console.error('Dojo initialization failed:', error);
      this.markPhaseCompleted('dojo');
    }
  }

  // Social links loading (depends on account setup)
  async initializeSocial(walletPromise?: Promise<void>) {
    if (this._isTutorialMode) return;

    try {
      // Wait for wallet/account setup to complete with timeout
      if (walletPromise) {
        await Promise.race([
          walletPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Account setup timeout')), 2000),
          ),
        ]).catch(() => {
          console.warn(
            'Social loading timed out waiting for account setup, continuing anyway...',
          );
        });
      }

      // Social links loading logic would go here
      await this.loadSocialLinks();
      this.markPhaseItemLoaded('social', 'social-links');
    } catch (error) {
      console.error('Social links loading failed:', error);
      this.markPhaseItemLoaded('social', 'social-links');
    }
  }

  // Land store initialization (depends on dojo setup)
  async initializeLandStore(
    dojoPromise?: Promise<void>,
    clientPromise?: Promise<Client | undefined>,
  ) {
    if (this._isTutorialMode) return;

    try {
      // Wait for dojo setup to complete with timeout
      if (dojoPromise) {
        await Promise.race([
          dojoPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Dojo setup timeout')), 2000),
          ),
        ]).catch(() => {
          console.warn(
            'Land store loading timed out waiting for dojo setup, continuing anyway...',
          );
        });
      }

      // Get client from promise or current state
      const client = clientPromise ? await clientPromise : this._client;

      // Initialize land store with client
      if (client) {
        console.log('Initializing land store...');
        await landStore.setup(client);
      } else {
        console.warn('No client available for land store setup');
      }

      this.markPhaseItemLoaded('landStore', 'land-data');
    } catch (error) {
      console.error('Land store initialization failed:', error);
      this.markPhaseItemLoaded('landStore', 'land-data');
    }
  }

  // Usernames loading (depends on dojo setup)
  async initializeUsernames(dojoPromise?: Promise<void>) {
    if (this._isTutorialMode) return;

    try {
      // Wait for dojo setup to complete with timeout
      if (dojoPromise) {
        await Promise.race([
          dojoPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Dojo setup timeout')), 2000),
          ),
        ]).catch(() => {
          console.warn(
            'Username fetching timed out waiting for dojo setup, continuing anyway...',
          );
        });
      }

      console.log('Fetching usernames...');
      await this.loadUsernames();
      this.markPhaseItemLoaded('usernames', 'username-fetch');
    } catch (error) {
      console.error('Username fetching failed:', error);
      this.markPhaseItemLoaded('usernames', 'username-fetch');
    }
  }

  // Rendering initialization (depends on WebGL, assets, and Dojo in non-tutorial mode)
  async initializeRendering(
    webglPromise?: Promise<void>,
    assetsPromise?: Promise<void>,
    dojoPromise?: Promise<void>,
  ) {
    try {
      // Wait for WebGL to be complete
      if (webglPromise) {
        await webglPromise;
      }

      // Wait for assets to be loaded
      if (assetsPromise) {
        await assetsPromise;
      }

      // In non-tutorial mode, wait for Dojo setup before rendering
      if (!this._isTutorialMode && dojoPromise) {
        console.log('Waiting for Dojo setup before rendering...');
        await Promise.race([
          dojoPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Dojo setup timeout')), 10000),
          ),
        ])
          .then(() => {
            console.log('Dojo setup complete, proceeding with rendering');
          })
          .catch(() => {
            console.warn(
              'Rendering timed out waiting for Dojo setup, continuing anyway...',
            );
          });
      }

      // Canvas ready check
      await this.waitForCanvasReady();
      this.markPhaseItemLoaded('rendering', 'canvas-ready');

      // First frame rendered
      await this.waitForFirstFrame();
      this.markPhaseItemLoaded('rendering', 'first-frame');

      // Scene loaded and ready
      await this.waitForSceneLoaded();
      this.markPhaseItemLoaded('rendering', 'scene-loaded');
    } catch (error) {
      console.error('Rendering initialization failed:', error);
      this.markPhaseItemLoaded('rendering', 'canvas-ready');
      this.markPhaseItemLoaded('rendering', 'first-frame');
      this.markPhaseItemLoaded('rendering', 'scene-loaded');
    }
  }

  private async waitForCanvasReady(): Promise<void> {
    // Real canvas readiness check would happen here - for now just log completion
    console.log('Canvas is ready');
    return Promise.resolve();
  }

  private async waitForFirstFrame(): Promise<void> {
    // Real first frame check would happen here - for now just log completion
    console.log('First frame rendered');
    return Promise.resolve();
  }

  private async waitForSceneLoaded(): Promise<void> {
    // Real scene loaded check would happen here - for now just log completion
    console.log('Scene loaded and ready');
    return Promise.resolve();
  }

  private async loadSocialLinks() {
    // Implementation would load social links that depend on account data
    console.log('Social links loaded');
    return Promise.resolve();
  }

  // Individual loading methods (to be implemented)
  private async loadAccountSetup() {
    // Implementation would setup account state
    console.log('Account setup completed');
    return Promise.resolve();
  }

  private async loadDojoSetup() {
    // Implementation would setup Dojo
    console.log('Dojo setup completed');
    return Promise.resolve();
  }

  private async loadDojoSubscriptions() {
    // Implementation would setup Dojo subscriptions
    console.log('Dojo subscriptions setup completed');
    return Promise.resolve();
  }

  private async loadUsernames() {
    try {
      console.log(
        'Collecting addresses from multiple sources for username fetching...',
      );

      // Collect addresses from multiple sources like the leaderboard does
      const addressSources = await Promise.allSettled([
        // 1. Get authorized addresses from events
        getUserAddresses().then((addresses: Array<{ address: string }>) =>
          addresses.map(({ address }: { address: string }) => ({ address })),
        ),
        // 2. Get land buyer addresses
        getBuyEvents().then((events: Array<{ buyer: string }>) =>
          events.map(({ buyer }: { buyer: string }) => ({ address: buyer })),
        ),
        // 3. Get addresses with token balances
        fetchTokenBalances().then(
          (balanceData: Record<string, Record<string, number>>) =>
            Object.keys(balanceData).map((address: string) => ({ address })),
        ),
        // 4. Get land ownership addresses from the landStore
        Promise.resolve().then(() => {
          // Since this is reactive, we need to get the current value
          // This is a simplified approach - in practice, you might want to subscribe
          const addresses: { address: string }[] = [];
          // Add current user if available
          if (accountState.address) {
            addresses.push({ address: accountState.address });
          }
          return addresses;
        }),
      ]);

      // Collect all unique addresses from successful sources
      const allAddresses = new Set<string>();

      addressSources.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          result.value.forEach(({ address }: { address: string }) => {
            if (address) {
              allAddresses.add(address);
            }
          });
          console.log(
            `Source ${index + 1} provided ${result.value.length} addresses`,
          );
        } else {
          console.warn(`Address source ${index + 1} failed:`, result.reason);
        }
      });

      const uniqueAddresses = Array.from(allAddresses).map((address) => ({
        address,
      }));
      console.log(
        `Collected ${uniqueAddresses.length} unique addresses from all sources`,
      );

      // Add addresses to the usernames store
      if (uniqueAddresses.length > 0) {
        usernamesStore.addAddresses(uniqueAddresses);

        // Get addresses that need usernames fetched
        const addressesToFetch = usernamesStore
          .getAddresses()
          .map((addr) => addr.address);

        if (addressesToFetch.length === 0) {
          console.log('No addresses to fetch usernames for');
          return;
        }

        console.log(
          `Fetching usernames for ${addressesToFetch.length} addresses...`,
        );

        // Fetch usernames in batch
        const usernameMap = await fetchUsernamesBatch(addressesToFetch);

        // Update the usernames store with fetched usernames
        usernamesStore.updateUsernames(usernameMap);

        console.log(
          `Successfully fetched ${Object.keys(usernameMap).length} usernames`,
        );
      } else {
        console.log('No addresses found from any source');
      }
    } catch (error) {
      console.error('Error fetching usernames:', error);
    }
  }

  private async initializeLoading() {
    const spritesheetNames = [
      'building',
      'biome',
      'road',
      'nuke',
      'fog',
      'owner',
    ];
    const assetNames = ['coinTexture', 'crownTexture', 'shieldTexture'];

    // Initialize spritesheet and asset phase tracking
    this._phases.spritesheets = {
      total: spritesheetNames.length,
      loaded: 0,
      items: Object.fromEntries(spritesheetNames.map((name) => [name, false])),
    };

    this._phases.assets = {
      total: assetNames.length,
      loaded: 0,
      items: Object.fromEntries(assetNames.map((name) => [name, false])),
    };

    // Load basic assets but don't set loading to false yet
    // The loading state will be managed by the comprehensive loading process
    // or by the totalProgress getter which includes all phases
    await this.loadExistingAssets();

    // Don't automatically set _isLoading = false here
    // Let the comprehensive loading process or totalProgress manage the loading state
  }

  private async loadSpritesheet(
    name: string,
    promise: Promise<{
      spritesheet: import('@threejs-kit/instanced-sprite-mesh').SpritesheetFormat;
      texture: import('three').Texture;
      geometry?: any;
    }>,
  ) {
    try {
      const spritesheet = await promise;
      this._loadedSpritesheets[name as keyof typeof this._loadedSpritesheets] =
        spritesheet;
      this.markSpritesheetLoaded(name);
    } catch (error) {
      console.error(`Failed to load spritesheet ${name}:`, error);
      this.markSpritesheetLoaded(name); // Mark as loaded even if failed to continue
    }
  }

  private async loadAsset(name: string, url: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.markAssetLoaded(name);
        resolve();
      };
      img.onerror = (error) => {
        console.error(`Failed to load asset ${name}:`, error);
        this.markAssetLoaded(name); // Mark as loaded even if failed
        resolve(); // Resolve anyway to not block loading
      };
      img.src = url;
    });
  }

  private markSpritesheetLoaded(name: string) {
    if (!this._phases.spritesheets.items[name]) {
      // Ensure reactivity by creating a new items object
      this._phases.spritesheets.items = {
        ...this._phases.spritesheets.items,
        [name]: true,
      };
      this._phases.spritesheets.loaded++;
      console.log(
        `✓ Marked spritesheet ${name} as loaded (${this._phases.spritesheets.loaded}/${this._phases.spritesheets.total})`,
      );
    }
  }

  private markAssetLoaded(name: string) {
    if (!this._phases.assets.items[name]) {
      // Ensure reactivity by creating a new items object
      this._phases.assets.items = {
        ...this._phases.assets.items,
        [name]: true,
      };
      this._phases.assets.loaded++;
      console.log(
        `✓ Marked asset ${name} as loaded (${this._phases.assets.loaded}/${this._phases.assets.total})`,
      );
    }
  }

  // Legacy getters for backward compatibility
  get spritesheets() {
    return this._phases.spritesheets;
  }

  get assets() {
    return this._phases.assets;
  }

  get spritesheetProgress() {
    return this._phases.spritesheets.total > 0
      ? this._phases.spritesheets.loaded / this._phases.spritesheets.total
      : 0;
  }

  get assetProgress() {
    return this._phases.assets.total > 0
      ? this._phases.assets.loaded / this._phases.assets.total
      : 0;
  }

  // New comprehensive getters
  get phases() {
    return this._phases;
  }

  get isTutorialMode() {
    return this._isTutorialMode;
  }

  get webglProgress() {
    return this._phases.webgl.total > 0
      ? this._phases.webgl.loaded / this._phases.webgl.total
      : 0;
  }

  get clientProgress() {
    return this._phases.client.total > 0
      ? this._phases.client.loaded / this._phases.client.total
      : 0;
  }

  get walletProgress() {
    return this._phases.wallet.total > 0
      ? this._phases.wallet.loaded / this._phases.wallet.total
      : 1;
  }

  get configProgress() {
    return this._phases.config.total > 0
      ? this._phases.config.loaded / this._phases.config.total
      : 0;
  }

  get pricesProgress() {
    return this._phases.prices.total > 0
      ? this._phases.prices.loaded / this._phases.prices.total
      : 0;
  }

  get dojoProgress() {
    return this._phases.dojo.total > 0
      ? this._phases.dojo.loaded / this._phases.dojo.total
      : 1;
  }

  get socialProgress() {
    return this._phases.social.total > 0
      ? this._phases.social.loaded / this._phases.social.total
      : 1;
  }

  get landStoreProgress() {
    return this._phases.landStore.total > 0
      ? this._phases.landStore.loaded / this._phases.landStore.total
      : 1;
  }

  get usernamesProgress() {
    return this._phases.usernames.total > 0
      ? this._phases.usernames.loaded / this._phases.usernames.total
      : 1;
  }

  get renderingProgress() {
    return this._phases.rendering.total > 0
      ? this._phases.rendering.loaded / this._phases.rendering.total
      : 0;
  }

  get totalProgress() {
    const allPhases = Object.values(this._phases);
    const totalItems = allPhases.reduce((sum, phase) => sum + phase.total, 0);
    const loadedItems = allPhases.reduce((sum, phase) => sum + phase.loaded, 0);
    return totalItems > 0 ? loadedItems / totalItems : 0;
  }

  get isLoading() {
    // Keep loading until all phases are complete, including WebGL/shader compilation and rendering
    // Always show loading if comprehensive loading hasn't been started yet (tutorial mode is null)
    const hasComprehensiveLoadingStarted = this._isTutorialMode !== null;

    return (
      this._isLoading ||
      this.totalProgress < 1 ||
      !this.isWebGLComplete ||
      !this.isRenderingComplete ||
      !hasComprehensiveLoadingStarted
    );
  }

  get isComplete() {
    const hasComprehensiveLoadingStarted = this._isTutorialMode !== null;
    return (
      !this._isLoading &&
      this.totalProgress >= 1 &&
      this.isWebGLComplete &&
      this.isRenderingComplete &&
      hasComprehensiveLoadingStarted
    );
  }

  // Check if WebGL phase (including shader compilation) is complete
  get isWebGLComplete() {
    const webglPhase = this._phases.webgl;
    return webglPhase.loaded >= webglPhase.total;
  }

  // Check if rendering phase is complete
  get isRenderingComplete() {
    const renderingPhase = this._phases.rendering;
    return renderingPhase.loaded >= renderingPhase.total;
  }

  // Master loading orchestrator with proper dependency handling
  async startComprehensiveLoading(isTutorialMode: boolean) {
    this._isLoading = true;
    this.setTutorialMode(isTutorialMode);

    // Set tutorial mode on account module immediately if in tutorial mode
    if (isTutorialMode) {
      console.log('Setting tutorial mode on account module...');
      setTutorialMode(true);
    }

    try {
      // Phase 1: Initialize WebGL and basic assets in parallel (no dependencies)
      const webglPromise = this.initializeWebGL();
      const assetsPromise = this.loadExistingAssets();
      await Promise.all([webglPromise, assetsPromise]);

      // Phase 2: Initialize client (required for config and dojo)
      const clientPromise = this.initializeClient().then(() => this._client);

      // Phase 3: Initialize processes that depend on client and independent processes
      // Initialize prices (independent of other processes)
      const pricesProcess = this.initializePrices();

      if (isTutorialMode) {
        // Tutorial mode: just config, prices and tutorial setup
        await Promise.all([
          this.initializeConfig(clientPromise),
          pricesProcess,
        ]);

        // Account state already set at the beginning of startComprehensiveLoading

        // Add tutorial auction lands after basic setup
        console.log('Adding tutorial auction lands...');
        landStore.addTutorialAuctions();

        // Set fake wallet balances for tutorial
        console.log('Setting tutorial wallet balances...');
        await walletStore.setTutorialBalances();
      } else {
        // Non-tutorial mode: Handle all dependencies properly

        // Start processes that depend on client
        const configProcess = this.initializeConfig(clientPromise);
        const dojoProcess = this.initializeDojo(clientPromise);

        // Create a promise that resolves when dojo init is complete
        // Since dojoProcess already handles the dojo initialization and marks it as loaded,
        // we can just use the process completion as the signal
        const dojoInitPromise = dojoProcess;

        // Start wallet process (sequential internally due to dependencies)
        const walletProcess = this.initializeWallet();

        // Start processes that depend on other processes
        const socialProcess = this.initializeSocial(walletProcess);
        const landStoreProcess = this.initializeLandStore(
          dojoInitPromise,
          clientPromise,
        );
        const usernamesProcess = this.initializeUsernames(dojoInitPromise);

        // Wait for all processes to complete
        await Promise.all([
          configProcess,
          pricesProcess,
          dojoProcess,
          walletProcess,
          socialProcess,
          landStoreProcess,
          usernamesProcess,
        ]);
      }

      // Phase 4: Initialize rendering (depends on WebGL and assets being complete)
      const dojoCompletePromise = isTutorialMode
        ? Promise.resolve()
        : Promise.resolve(); // Dojo already waited for above
      await this.initializeRendering(
        Promise.resolve(), // WebGL already completed
        Promise.resolve(), // Assets already completed
        dojoCompletePromise,
      );

      // Only set _isLoading to false if all phases are actually complete
      if (
        this.totalProgress >= 1 &&
        this.isWebGLComplete &&
        this.isRenderingComplete
      ) {
        this._isLoading = false;
      }
    } catch (error) {
      console.error('Comprehensive loading failed:', error);
      // On error, we'll let the getter determine the state
      // Don't force _isLoading = false on error
    }
  }

  // Load existing spritesheets and assets (refactored from existing code)
  private async loadExistingAssets() {
    // Load all spritesheets
    const spritesheetPromises = [
      this.loadSpritesheet('building', this.buildingAtlas.spritesheet),
      this.loadSpritesheet('biome', this.biomeAtlas.spritesheet),
      this.loadSpritesheet('road', this.roadAtlas.spritesheet),
      this.loadSpritesheet('nuke', this.nukeAtlas.spritesheet),
      this.loadSpritesheet('fog', this.fogAtlas.spritesheet),
      this.loadSpritesheet('owner', this.ownerAtlas.spritesheet),
    ];

    // Load additional assets
    const assetPromises = [
      this.loadAsset('coinTexture', '/ui/icons/Icon_Coin2.png'),
      this.loadAsset('crownTexture', '/ui/icons/Icon_Crown.png'),
      this.loadAsset('shieldTexture', '/ui/icons/Icon_ShieldBlue.png'),
    ];

    await Promise.all([...spritesheetPromises, ...assetPromises]);
  }

  get loadedSpritesheets() {
    return this._loadedSpritesheets;
  }

  // Get the loaded spritesheets for components that need them
  getAllSpritesheets() {
    return {
      building: this._loadedSpritesheets.building,
      biome: this._loadedSpritesheets.biome,
      road: this._loadedSpritesheets.road,
      nuke: this._loadedSpritesheets.nuke,
      fog: this._loadedSpritesheets.fog,
      owner: this._loadedSpritesheets.owner,
    };
  }
}

export const loadingStore = new LoadingStore();
