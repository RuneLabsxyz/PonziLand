export interface Widget {
  id: string;
  type: string;
  label: string;
  icon: string;
}

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

export interface WidgetsState {
  [key: string]: WidgetState;
}

export const DEFAULT_WIDGETS_STATE: WidgetsState = {
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
  'price-chart': {
    id: 'price-chart',
    type: 'price-chart',
    position: { x: 60, y: 50 },
    dimensions: { width: 800, height: 600 },
    isMinimized: false,
    isOpen: false,
  },
};

export const availableWidgets: Widget[] = [
  {
    id: 'my-lands',
    type: 'my-lands',
    label: 'My Lands',
    icon: '/ui/icons/Icon_Thin_MyLand.png',
  },
  {
    id: 'market',
    type: 'market',
    label: 'Market',
    icon: '/ui/icons/Icon_Thin_Auction.png',
  },
  {
    id: 'help',
    type: 'help',
    label: 'Help',
    icon: '/ui/icons/Icon_Book.png',
  },
  {
    id: 'guild',
    type: 'guild',
    label: 'Guild',
    icon: '/ui/icons/Icon_Guilds.png',
  },
  {
    id: 'leaderboard',
    type: 'leaderboard',
    label: 'Leaderboard',
    icon: '/ui/icons/Icon_Cup.png',
  },
  {
    id: 'price-chart',
    type: 'price-chart',
    label: 'Price Chart',
    icon: '/ui/icons/Icon_Chart.png',
  },
  // {
  //   id: 'notifications',
  //   type: 'notifications',
  //   label: 'Notifications',
  //   icon: '/ui/icons/Icon_Thin_Notification.png',
  // },
];
