import {
  DEFAULT_WIDGETS_STATE,
  type WidgetsState,
  type WidgetState,
} from '$lib/components/+game-ui/widgets/widgets.config';
import { WIDGETS_STORAGE_KEY } from '$lib/const';
import { writable, derived } from 'svelte/store';

const STORAGE_KEY = WIDGETS_STORAGE_KEY;

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
        finalState[id] = { ...finalState[id], ...processedWidget };
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
    maximizeWidget: (id: string) =>
      update((state) => {
        if (!state[id]) {
          console.error('Widget not found:', id);
          return state;
        }
        const widget = state[id];

        // Save current state before maximizing
        const preMaximizeState = {
          position: { ...widget.position },
          dimensions: widget.dimensions
            ? { ...widget.dimensions }
            : { width: 550, height: 400 },
        };

        const newState = {
          ...state,
          [id]: {
            ...widget,
            isMaximized: true,
            preMaximizeState,
            position: { x: 0, y: 0 },
            dimensions: {
              width: typeof window !== 'undefined' ? window.innerWidth : 1920,
              height: typeof window !== 'undefined' ? window.innerHeight : 1080,
            },
          },
        };
        saveState(newState);
        return newState;
      }),
    restoreWidget: (id: string) =>
      update((state) => {
        if (!state[id]) {
          console.error('Widget not found:', id);
          return state;
        }
        const widget = state[id];

        if (!widget.preMaximizeState) {
          console.error('No pre-maximize state found for widget:', id);
          return state;
        }

        const newState = {
          ...state,
          [id]: {
            ...widget,
            isMaximized: false,
            position: { ...widget.preMaximizeState.position },
            dimensions: { ...widget.preMaximizeState.dimensions },
            preMaximizeState: undefined,
          },
        };
        saveState(newState);
        return newState;
      }),
    dockWidget: (id: string) =>
      update((state) => {
        if (!state[id]) {
          console.error('Widget not found:', id);
          return state;
        }
        const widget = state[id];

        // Undock any currently docked widget first
        const newState = { ...state };
        for (const [wid, w] of Object.entries(newState)) {
          if (w.isDocked && wid !== id) {
            newState[wid] = {
              ...w,
              isDocked: false,
              position: w.preDockState?.position || w.position,
              dimensions: w.preDockState?.dimensions || w.dimensions,
              preDockState: undefined,
            };
          }
        }

        // Save pre-dock state and dock this widget
        const preDockState = {
          position: { ...widget.position },
          dimensions: widget.dimensions ? { ...widget.dimensions } : undefined,
        };

        newState[id] = {
          ...widget,
          isDocked: true,
          isMaximized: false,
          isMinimized: false,
          isOpen: true,
          preDockState,
        };

        saveState(newState);
        return newState;
      }),
    undockWidget: (id: string) =>
      update((state) => {
        if (!state[id]) {
          console.error('Widget not found:', id);
          return state;
        }
        const widget = state[id];

        const newState = {
          ...state,
          [id]: {
            ...widget,
            isDocked: false,
            position: widget.preDockState?.position || widget.position,
            dimensions: widget.preDockState?.dimensions || widget.dimensions,
            preDockState: undefined,
          },
        };
        saveState(newState);
        return newState;
      }),
  };
}

export const SIDEBAR_DOCK_WIDTH = 450;

function createSidebarStore() {
  const { subscribe, set, update } = writable<{
    collapsed: boolean;
  }>({ collapsed: false });

  return {
    subscribe,
    toggleCollapse: () => update((s) => ({ ...s, collapsed: !s.collapsed })),
    setCollapsed: (collapsed: boolean) => update((s) => ({ ...s, collapsed })),
  };
}

export const sidebarStore = createSidebarStore();

export const widgetsStore = createWidgetsStore();

// Derived store: effective sidebar width (used for layout shifting)
export const sidebarWidth = derived(
  [widgetsStore, sidebarStore],
  ([$widgets, $sidebar]) => {
    const hasDocked = Object.values($widgets).some(
      (w) => w.isDocked && w.isOpen,
    );
    if (!hasDocked) return 0;
    return $sidebar.collapsed ? 40 : SIDEBAR_DOCK_WIDTH;
  },
);
