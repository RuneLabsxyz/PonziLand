import { writable } from 'svelte/store';

const STORAGE_KEY = 'ponziland-widgets-state';

const DEFAULT_WIDGETS_STATE: WidgetsState = {
  wallet: {
    id: 'wallet',
    type: 'wallet',
    position: { x: window.innerWidth - 320, y: 20 }, // Top right
    isMinimized: false,
    isOpen: true,
    fixed: true,
    fixedStyles:
      'width: 320px; height: auto; top: 0px; right: 0px; transform: none;',
    disableControls: true, // Wallet widget should not be closable
    transparency: 0.9, // Slightly transparent by default
  },
  'land-hud': {
    id: 'land-hud',
    type: 'land-hud',
    position: { x: window.innerWidth - 320, y: window.innerHeight - 280 }, // Bottom right
    isMinimized: false,
    isOpen: true,
    fixed: true,
    fixedStyles: 'width: 500px; bottom: 0px; right: 0px; transform: none;',
    disableControls: true, // Land HUD should not be closable
    transparency: 0.9, // Slightly transparent by default
  },
  settings: {
    id: 'settings',
    type: 'settings',
    position: { x: 20, y: 20 }, // Top left
    isMinimized: false,
    isOpen: false,
    dimensions: { width: 320, height: 200 }, // Default size for settings widget
  },
  'my-lands': {
    id: 'my-lands',
    type: 'my-lands',
    position: { x: 20, y: 10 },
    dimensions: { width: 450, height: 600 },
    isMinimized: false,
    isOpen: false,
  },
  market: {
    id: 'market',
    type: 'market',
    position: { x: 40, y: 30 },
    dimensions: { width: 450, height: 600 },
    isMinimized: false,
    isOpen: false,
  },
  help: {
    id: 'help',
    type: 'help',
    position: { x: 400, y: 100 },
    dimensions: { width: 450, height: 600 },
    isMinimized: false,
    isOpen: false,
  },
  tutorial: {
    id: 'tutorial',
    type: 'tutorial',
    position: { x: 100, y: 100 },
    dimensions: { width: 600, height: 400 },
    isMinimized: false,
    isOpen: false,
  },
  guild: {
    id: 'guild',
    type: 'guild',
    position: { x: 100, y: 100 },
    dimensions: { width: 800, height: 600 },
    isMinimized: false,
    isOpen: false,
  },
  leaderboard: {
    id: 'leaderboard',
    type: 'leaderboard',
    position: { x: window.innerWidth - 320, y: 600 },
    dimensions: { width: 320, height: 300 },
    isMinimized: false,
    isOpen: false,
  },
};

export interface WidgetState {
  id: string;
  type: string;
  position: { x: number; y: number };
  isMinimized: boolean;
  isOpen: boolean;
  dimensions?: { width: number; height: number };
  data?: Record<string, any>;
  zIndex?: number;
  fixed?: boolean; // Whether the widget should be fixed in position
  fixedStyles?: string; // Custom styles to apply when fixed
  disableControls?: boolean; // Whether to disable minimize and close buttons
  transparency?: number; // Widget transparency (0-1, where 0 is fully transparent and 1 is fully opaque)
  disableResize?: boolean;
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
        location: widget.data.land.location,
      },
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

    // Start with default widgets
    const finalState = { ...DEFAULT_WIDGETS_STATE };

    // Process each widget's data after loading
    for (const [id, widget] of Object.entries(parsed)) {
      // Skip default widgets - they should always use their default configuration
      if (id in DEFAULT_WIDGETS_STATE) continue;

      const processedWidget = processWidgetDataAfterLoad(widget);
      if (processedWidget) {
        finalState[id] = processedWidget;
      }
    }

    return finalState;
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
        // Set initial z-index to be above existing widgets
        const maxZIndex = Math.max(
          ...Object.values(state).map((w) => w.zIndex || 0),
          0,
        );

        // If a widget already has this position offset it by 10px and retry if another exists at this position
        const position = { ...widget.position };
        let offset = 0;

        while (
          Object.values(state).some(
            (w) => w.position.x === position.x && w.position.y === position.y,
          )
        ) {
          offset += 10;
          position.x = widget.position.x + offset;
          position.y = widget.position.y + offset;
        }

        console.log('zindex', maxZIndex);
        const newState = {
          ...state,
          [widget.id]: {
            ...widget,
            position,
            zIndex: maxZIndex + 3,
            isMinimized: false,
            isOpen: true,
          },
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
        // Set initial z-index to be above existing widgets
        const maxZIndex = Math.max(
          ...Object.values(state).map((w) => w.zIndex || 0),
          0,
        );
        const newState = {
          ...state,
          [id]: { ...state[id], ...updates, zIndex: maxZIndex + 3 },
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
    bringToFront: (id: string) =>
      update((state) => {
        if (!state[id]) {
          console.error('Widget not found:', id);
          return state;
        }
        const maxZIndex = Math.max(
          ...Object.values(state).map((w) => w.zIndex || 0),
          0,
        );
        const newState = {
          ...state,
          [id]: { ...state[id], zIndex: maxZIndex + 1 },
        };
        saveState(newState);
        return newState;
      }),
  };
}

export const widgetsStore = createWidgetsStore();
