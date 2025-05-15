import { writable } from 'svelte/store';

const STORAGE_KEY = 'ponziland-widgets-state';

const DEFAULT_WIDGETS_STATE: WidgetsState = {
  'wallet-lookup': {
    id: 'wallet-lookup',
    type: 'wallet',
    position: { x: window.innerWidth - 320, y: 20 }, // Top right
    isMinimized: false,
    isOpen: true
  },
  'land-hud': {
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

// Load state from localStorage or use default
function loadState(): WidgetsState {
  if (typeof window === 'undefined') return DEFAULT_WIDGETS_STATE;
  
  const savedState = localStorage.getItem(STORAGE_KEY);
  if (!savedState) return DEFAULT_WIDGETS_STATE;
  
  try {
    const parsed = JSON.parse(savedState);
    return parsed;
  } catch (e) {
    console.error('Failed to parse saved widgets state:', e);
    return DEFAULT_WIDGETS_STATE;
  }
}

// Save state to localStorage
function saveState(state: WidgetsState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createWidgetsStore() {
  const { subscribe, set, update } = writable<WidgetsState>(loadState());

  return {
    subscribe,
    addWidget: (widget: WidgetState) => update(state => {
      const newState = {
        ...state,
        [widget.id]: widget
      };
      saveState(newState);
      return newState;
    }),
    updateWidget: (id: string, updates: Partial<WidgetState>) => update(state => {
      const newState = {
        ...state,
        [id]: { ...state[id], ...updates }
      };
      saveState(newState);
      return newState;
    }),
    removeWidget: (id: string) => update(state => {
      const newState = { ...state };
      delete newState[id];
      saveState(newState);
      return newState;
    }),
    toggleMinimize: (id: string) => update(state => {
      const newState = {
        ...state,
        [id]: { ...state[id], isMinimized: !state[id].isMinimized }
      };
      saveState(newState);
      return newState;
    }),
    closeWidget: (id: string) => update(state => {
      const newState = {
        ...state,
        [id]: { ...state[id], isOpen: false }
      };
      saveState(newState);
      return newState;
    }),
    resetToDefault: () => {
      set(DEFAULT_WIDGETS_STATE);
      saveState(DEFAULT_WIDGETS_STATE);
    }
  };
}

export const widgetsStore = createWidgetsStore(); 