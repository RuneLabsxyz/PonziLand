import { writable } from 'svelte/store';
import {
  createLandWithActions,
  landStore,
} from '../../routes/next/store.svelte';
import { GRID_SIZE } from '$lib/const';
import { ensureNumber, locationIntToString, parseLocation } from '$lib/utils';

const STORAGE_KEY = 'ponziland-widgets-state';

const DEFAULT_WIDGETS_STATE: WidgetsState = {
  'wallet-lookup': {
    id: 'wallet-lookup',
    type: 'wallet',
    position: { x: window.innerWidth - 320, y: 20 }, // Top right
    isMinimized: false,
    isOpen: true,
  },
  'land-hud': {
    id: 'land-hud',
    type: 'land-hud',
    position: { x: window.innerWidth - 320, y: window.innerHeight - 280 }, // Bottom right
    isMinimized: false,
    isOpen: true,
  },
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

// Validate widget data structure
function isValidWidget(widget: any): widget is WidgetState {
  return (
    widget &&
    typeof widget === 'object' &&
    typeof widget.id === 'string' &&
    typeof widget.type === 'string' &&
    typeof widget.position === 'object' &&
    typeof widget.position.x === 'number' &&
    typeof widget.position.y === 'number' &&
    typeof widget.isMinimized === 'boolean' &&
    typeof widget.isOpen === 'boolean'
  );
}

// Process widget data before saving
function processWidgetDataForStorage(widget: WidgetState): WidgetState {
  if (widget.type === 'land-info' && widget.data?.land) {
    // For land-info widgets, only store the location
    return {
      ...widget,
      data: {
        location: widget.data.land.location
      }
    };
  }
  return widget;
}

// Process widget data after loading
function processWidgetDataAfterLoad(widget: any): WidgetState | null {
  // Validate widget structure
  if (!isValidWidget(widget)) {
    console.warn('Invalid widget data found, skipping:', widget);
    return null;
  }

  // For land-info widgets, we only need to validate the location exists
  if (widget.type === 'land-info') {
    if (!widget.data?.location) {
      console.warn('Land info widget missing location:', widget);
      return null;
    }
    return widget;
  }

  return widget;
}

// Load state from localStorage or use default
function loadState(): WidgetsState {
  if (typeof window === 'undefined') return DEFAULT_WIDGETS_STATE;

  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (!savedState) return DEFAULT_WIDGETS_STATE;

    const parsed = JSON.parse(savedState);
    if (!parsed || typeof parsed !== 'object') {
      console.warn('Invalid saved state format, using defaults');
      return DEFAULT_WIDGETS_STATE;
    }

    // Process each widget's data after loading
    const processedState: WidgetsState = {};
    for (const [id, widget] of Object.entries(parsed)) {
      const processedWidget = processWidgetDataAfterLoad(widget);
      if (processedWidget) {
        processedState[id] = processedWidget;
      }
    }

    // If no valid widgets were found, return defaults
    if (Object.keys(processedState).length === 0) {
      console.warn('No valid widgets found in saved state, using defaults');
      return DEFAULT_WIDGETS_STATE;
    }

    return processedState;
  } catch (e) {
    console.error('Failed to load widgets state:', e);
    // Clear corrupted data
    localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_WIDGETS_STATE;
  }
}

// Save state to localStorage
function saveState(state: WidgetsState) {
  if (typeof window === 'undefined') return;

  try {
    // Process each widget's data before saving
    const processedState: WidgetsState = {};
    for (const [id, widget] of Object.entries(state)) {
      if (isValidWidget(widget)) {
        processedState[id] = processWidgetDataForStorage(widget);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(processedState));
  } catch (e) {
    console.error('Failed to save widgets state:', e);
    // Clear corrupted data
    localStorage.removeItem(STORAGE_KEY);
  }
}

function createWidgetsStore() {
  const { subscribe, set, update } = writable<WidgetsState>(
    DEFAULT_WIDGETS_STATE,
  );

  // Initialize store with saved state
  const savedState = loadState();
  set(savedState);

  return {
    subscribe,
    addWidget: (widget: WidgetState) =>
      update((state) => {
        if (!isValidWidget(widget)) {
          console.error('Invalid widget data:', widget);
          return state;
        }
        const newState = {
          ...state,
          [widget.id]: widget,
        };
        saveState(newState);
        return newState;
      }),
    updateWidget: (id: string, updates: Partial<WidgetState>) =>
      update((state) => {
        if (!state[id]) {
          console.error('Widget not found:', id);
          return state;
        }
        const newState = {
          ...state,
          [id]: { ...state[id], ...updates },
        };
        saveState(newState);
        return newState;
      }),
    removeWidget: (id: string) =>
      update((state) => {
        const newState = { ...state };
        delete newState[id];
        saveState(newState);
        return newState;
      }),
    toggleMinimize: (id: string) =>
      update((state) => {
        if (!state[id]) {
          console.error('Widget not found:', id);
          return state;
        }
        const newState = {
          ...state,
          [id]: { ...state[id], isMinimized: !state[id].isMinimized },
        };
        saveState(newState);
        return newState;
      }),
    closeWidget: (id: string) =>
      update((state) => {
        if (!state[id]) {
          console.error('Widget not found:', id);
          return state;
        }
        const newState = {
          ...state,
          [id]: { ...state[id], isOpen: false },
        };
        saveState(newState);
        return newState;
      }),
    resetToDefault: () => {
      set(DEFAULT_WIDGETS_STATE);
      saveState(DEFAULT_WIDGETS_STATE);
    },
  };
}

export const widgetsStore = createWidgetsStore();
