import { buildSpritesheet, type SpritesheetMetadata } from '@threlte/extras';
import { biomeAtlasMeta } from '$lib/components/+game-map/three/biomes';
import { buildingAtlasMeta } from '$lib/components/+game-map/three/buildings';

interface LoadingProgress {
  total: number;
  loaded: number;
  items: Record<string, boolean>;
}

class LoadingStore {
  private _spritesheets = $state<LoadingProgress>({
    total: 0,
    loaded: 0,
    items: {},
  });

  private _assets = $state<LoadingProgress>({
    total: 0,
    loaded: 0,
    items: {},
  });

  private _isLoading = $state(true);

  // Spritesheet atlas instances
  buildingAtlas =
    buildSpritesheet.from<typeof buildingAtlasMeta>(buildingAtlasMeta);
  biomeAtlas = buildSpritesheet.from<typeof biomeAtlasMeta>(biomeAtlasMeta);

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

    // Initialize progress tracking
    this._spritesheets = {
      total: spritesheetNames.length,
      loaded: 0,
      items: Object.fromEntries(spritesheetNames.map((name) => [name, false])),
    };

    this._assets = {
      total: assetNames.length,
      loaded: 0,
      items: Object.fromEntries(assetNames.map((name) => [name, false])),
    };

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

    try {
      await Promise.all([...spritesheetPromises, ...assetPromises]);
      this._isLoading = false;
    } catch (error) {
      console.error('Loading failed:', error);
      this._isLoading = false;
    }
  }

  private async loadSpritesheet(name: string, promise: Promise<any>) {
    try {
      await promise;
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
    if (!this._spritesheets.items[name]) {
      this._spritesheets.items[name] = true;
      this._spritesheets.loaded++;
    }
  }

  private markAssetLoaded(name: string) {
    if (!this._assets.items[name]) {
      this._assets.items[name] = true;
      this._assets.loaded++;
    }
  }

  get spritesheets() {
    return this._spritesheets;
  }

  get assets() {
    return this._assets;
  }

  get totalProgress() {
    const totalItems = this._spritesheets.total + this._assets.total;
    const loadedItems = this._spritesheets.loaded + this._assets.loaded;
    return totalItems > 0 ? loadedItems / totalItems : 0;
  }

  get spritesheetProgress() {
    return this._spritesheets.total > 0
      ? this._spritesheets.loaded / this._spritesheets.total
      : 0;
  }

  get assetProgress() {
    return this._assets.total > 0
      ? this._assets.loaded / this._assets.total
      : 0;
  }

  get isLoading() {
    return this._isLoading;
  }

  get isComplete() {
    return !this._isLoading && this.totalProgress >= 1;
  }

  // Get the spritesheet promises for components that need them
  getAllSpritesheets() {
    return Promise.all([
      this.buildingAtlas.spritesheet,
      this.biomeAtlas.spritesheet,
      this.roadAtlas.spritesheet,
      this.nukeAtlas.spritesheet,
      this.fogAtlas.spritesheet,
      this.ownerAtlas.spritesheet,
    ]);
  }
}

export const loadingStore = new LoadingStore();
