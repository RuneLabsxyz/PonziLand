import type { Token } from '$lib/interfaces';

type SwapConfig = {
  destinationToken?: Token;
  destinationAmount?: number;
  sourceToken?: Token;
};

class SwapStore {
  private config = $state<SwapConfig>({});

  setConfig(newConfig: SwapConfig) {
    this.config = newConfig;
  }

  setDestinationToken(token: Token) {
    this.config.destinationToken = token;
  }

  setDestinationAmount(amount: number) {
    this.config.destinationAmount = amount;
  }

  setSourceToken(token: Token) {
    this.config.sourceToken = token;
  }

  getConfig() {
    return this.config;
  }

  clearConfig() {
    this.config = {};
  }
}

export const swapStore = new SwapStore();
