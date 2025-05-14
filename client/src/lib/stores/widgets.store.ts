import { writable } from 'svelte/store';

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
  const { subscribe, set, update } = writable<WidgetsState>({});

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