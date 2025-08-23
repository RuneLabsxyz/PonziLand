import {
  DEFAULT_WIDGETS_STATE,
  type WidgetsState,
  type WidgetState,
} from '$lib/components/+game-ui/widgets/widgets.config';
import { WIDGETS_STORAGE_KEY } from '$lib/const';
import { writable } from 'svelte/store';

const STORAGE_KEY = WIDGETS_STORAGE_KEY;

// TODO(Red): Migrate this to a class with a proper handling of widget data
//
// A function for opening (that opens or creates the widget if it doesn't exist)
// And see usage for the rest.
//
// Using a writable is not really useful in that situation, especially when we have runes,
// and this is not performance sensitive.

// Validate widget data structure
function isValidWidget(widget: unknown): widget is WidgetState {
  return (
    widget != undefined &&
    widget != null &&
    typeof widget === 'object' &&
    'id' in widget &&
    typeof widget.id === 'string' &&
    'type' in widget &&
    typeof widget.type === 'string' &&
    'position' in widget &&
    typeof widget.position === 'object' &&
    'x' in widget.position! &&
    typeof widget.position.x === 'number' &&
    'y' in widget.position &&
    typeof widget.position.y === 'number' &&
    'isMinimized' in widget &&
    typeof widget.isMinimized === 'boolean' &&
    'isOpen' in widget &&
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
function processWidgetDataAfterLoad(widget: unknown): WidgetState | null {
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

    // Clean up closed land-info widgets from storage
    const cleanedState = { ...parsed };
    let hasChanges = false;
    for (const [id, widget] of Object.entries(cleanedState)) {
      if (
        typeof widget === 'object' &&
        widget !== null &&
        'type' in widget &&
        'isOpen' in widget &&
        widget.type === 'land-info' &&
        !widget.isOpen
      ) {
        delete cleanedState[id];
        hasChanges = true;
      }
    }
    if (hasChanges) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedState));
    }

    // Start with default widgets
    const finalState = { ...DEFAULT_WIDGETS_STATE };

    // Process each widget's data after loading
    for (const [id, widget] of Object.entries(parsed)) {
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

// Normalize z-indices to prevent them from growing too large
function normalizeZIndices(state: WidgetsState): WidgetsState {
  const widgets = Object.entries(state);
  if (widgets.length === 0) return state;

  // Sort widgets by their current z-index
  const sortedWidgets = widgets.sort(
    ([, a], [, b]) => (a.zIndex || 0) - (b.zIndex || 0),
  );

  // Assign new z-indices starting from 1
  const newState = { ...state };
  sortedWidgets.forEach(([id, widget], index) => {
    newState[id] = {
      ...widget,
      zIndex: index + 1,
    };
  });

  return newState;
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

        const newState = {
          ...state,
          [widget.id]: {
            ...widget,
            position,
            zIndex: maxZIndex + 1,
            isMinimized: false,
            isOpen: true,
          },
        };
        const normalizedState = normalizeZIndices(newState);
        saveState(normalizedState);
        return normalizedState;
      }),
    updateWidget: (id: string, updates: Partial<WidgetState>) =>
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
          [id]: { ...state[id], ...updates, zIndex: maxZIndex + 1 },
        };
        const normalizedState = normalizeZIndices(newState);
        saveState(normalizedState);
        return normalizedState;
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

        // For land-info widgets, remove them completely
        if (state[id].type === 'land-info') {
          const newState = { ...state };
          delete newState[id];
          saveState(newState);
          return newState;
        }

        // For other widgets, just mark them as closed
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
        const normalizedState = normalizeZIndices(newState);
        saveState(normalizedState);
        return normalizedState;
      }),
  };
}

export const widgetsStore = createWidgetsStore();
