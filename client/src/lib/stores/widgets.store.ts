import { writable } from 'svelte/store';

const DEFAULT_WIDGETS_STATE: WidgetsState = {
  walletLookup: {
    id: 'wallet-lookup',
    type: 'wallet',
    position: { x: window.innerWidth - 320, y: 20 }, // Top right
    isMinimized: false,
    isOpen: true
  },
  landHud: {
    id: 'land-hud',
    type: 'land-hud',
    position: { x: window.innerWidth - 320, y: window.innerHeight - 280 }, // Bottom right
    isMinimized: false,
    isOpen: true
  }
};

export interface WidgetState {
  id: string;
  type: string;
  position: { x: number; y: number };
  isMinimized: boolean;
  isOpen: boolean;
  data?: Record<string, any>;
}

interface WidgetsState {
  [key: string]: WidgetState;
}

function createWidgetsStore() {
  const { subscribe, set, update } = writable<WidgetsState>(DEFAULT_WIDGETS_STATE);

  return {
    subscribe,
    addWidget: (widget: WidgetState) => update(state => ({
      ...state,
      [widget.id]: widget
    })),
    updateWidget: (id: string, updates: Partial<WidgetState>) => update(state => ({
      ...state,
      [id]: { ...state[id], ...updates }
    })),
    removeWidget: (id: string) => update(state => {
      const newState = { ...state };
      delete newState[id];
      return newState;
    }),
    toggleMinimize: (id: string) => update(state => ({
      ...state,
      [id]: { ...state[id], isMinimized: !state[id].isMinimized }
    })),
    closeWidget: (id: string) => update(state => ({
      ...state,
      [id]: { ...state[id], isOpen: false }
    }))
  };
}

export const widgetsStore = createWidgetsStore(); 