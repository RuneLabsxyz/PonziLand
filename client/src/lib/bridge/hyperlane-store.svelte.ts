// HyperlaneProvider.tsx
import { initializeHyperlane } from './config';
import { WarpCore, MultiProtocolProvider, type ChainMap } from '@hyperlane-xyz/sdk';
import { GithubRegistry } from '@hyperlane-xyz/registry';


interface HyperlaneState {
  warpCore: WarpCore | null; // Usar any para evitar tipos estáticos de Hyperlane
  multiProvider: MultiProtocolProvider | null;
  registry: GithubRegistry | null;
  chainAddresses: ChainMap<Record<string, string>>| null;
  isReady: boolean;
  error: string | null;
}

class HyperlaneStore {
  private state = $state<HyperlaneState>({
    warpCore: null,
    multiProvider: null,
    registry: null,
  chainAddresses: null,
    isReady: false,
    error: null
  });

  constructor() {
    this.initialize();
  }

  // Getters usando runes
  get warpCore() {
    return this.state.warpCore;
  }

  get multiProvider() {
    return this.state.multiProvider;
  }

  get registry() {
    return this.state.registry;
  }

  get chainAddresses() {
    return this.state.chainAddresses;
  }

  get isReady() {
    return this.state.isReady;
  }

  get error() {
    return this.state.error;
  }

  private async initialize() {
    try {
      const { warpCore, multiProvider, registry, chainAddresses } = await initializeHyperlane();
      console.log('Hyperlane initialized:', { warpCore, multiProvider, registry, chainAddresses })
      this.state = {
        warpCore,
        multiProvider,
        registry,
        chainAddresses,
        isReady: true,
        error: null
      };
    } catch (error) {
      console.error('Error initializing Hyperlane:', error);
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Método para reinicializar si es necesario
  async reinitialize() {
    this.state.isReady = false;
    this.state.error = null;
    await this.initialize();
  }
}

// Exportar instancia global del store
export const hyperlaneStore = new HyperlaneStore();