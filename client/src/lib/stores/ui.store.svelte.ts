import type { TileInfo } from '$lib/interfaces';

export let uiStore = $state<{
  showModal: boolean;
  modalType: 'bid' | 'buy' | 'land-info' | null;
  modalData: TileInfo | null;
  toolbarActive: 'lands' | 'notifications' | 'auctions' | null;
}>({
  showModal: false,
  modalType: null,
  modalData: null,
  toolbarActive: null,
});

class ProMode {
  public isPro = $state();

  get isProMode() {
    return this.isPro;
  }
  constructor() {
    this.isPro = false;
  }
  toggle() {
    this.isPro = !this.isPro;
  }
}

export const proMode = new ProMode();
