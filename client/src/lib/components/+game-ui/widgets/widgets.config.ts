import { ENABLE_GUILD, ENABLE_LEADERBOARD } from '$lib/flags';

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

const baseWidgetsState: WidgetsState = {
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
  'data-maps': {
    id: 'data-maps',
    type: 'data-maps',
    position: { x: 60, y: 40 },
    dimensions: { width: 340, height: 0 },
    isMinimized: false,
    isOpen: false,
    disableResize: true,
    fixedStyles: 'width: 340px; height: auto;',
  },
  swap: {
    id: 'swap',
    type: 'swap',
    position: { x: 80, y: 60 },
    dimensions: { width: 400, height: 0 },
    isMinimized: false,
    isOpen: false,
    disableResize: true,
    fixedStyles: 'width: 400px; height: auto;',
  },
  history: {
    id: 'history',
    type: 'history',
    position: { x: 100, y: 50 },
    dimensions: { width: 550, height: 400 },
    isMinimized: false,
    isOpen: false,
  },
  disclaimer: {
    id: 'disclaimer',
    type: 'disclaimer',
    position: {
      x: window.innerWidth / 2 - 200,
      y: window.innerHeight / 2 - 150,
    },
    dimensions: { width: 400, height: 0 },
    fixedStyles: 'width: 400px; height: auto;',
    isMinimized: false,
    isOpen: true,
    disableResize: true,
    disableControls: true,
    zIndex: 9999,
  },
};

const guildWidgetState: WidgetState = {
  id: 'guild',
  type: 'guild',
  position: { x: 100, y: 100 },
  dimensions: { width: 800, height: 600 },
  isMinimized: false,
  isOpen: false,
};

const leaderboardWidgetState: WidgetState = {
  id: 'leaderboard',
  type: 'leaderboard',
  position: { x: window.innerWidth - 320, y: 600 },
  dimensions: { width: 320, height: 300 },
  isMinimized: false,
  isOpen: false,
};

export const DEFAULT_WIDGETS_STATE: WidgetsState = Object.assign(
  baseWidgetsState,
  ENABLE_GUILD ? { guild: guildWidgetState } : {},
  ENABLE_LEADERBOARD ? { leaderboard: leaderboardWidgetState } : {},
);

const allWidgets: (Widget & { if?: boolean })[] = [
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
    if: ENABLE_GUILD,
  },
  {
    id: 'leaderboard',
    type: 'leaderboard',
    label: 'Leaderboard',
    icon: '/ui/icons/Icon_Cup.png',
    if: ENABLE_LEADERBOARD,
  },
  {
    id: 'data-maps',
    type: 'data-maps',
    label: 'Data Maps',
    icon: '/ui/icons/Icon_Thin_MyLand.png', // Reusing existing icon, could be replaced with a heatmap-specific icon
  },
  {
    id: 'history',
    type: 'history',
    label: 'History',
    icon: '/ui/icons/Icon_Notification.png',
  },
  // {
  //   id: 'notifications',
  //   type: 'notifications',
  //   label: 'Notifications',
  //   icon: '/ui/icons/Icon_Thin_Notification.png',
  // },
];

export const availableWidgets: Widget[] = allWidgets.filter(
  (widget) => widget.if !== false,
);
