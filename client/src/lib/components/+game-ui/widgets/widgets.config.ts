export interface Widget {
  id: string;
  type: string;
  label: string;
}

export const availableWidgets: Widget[] = [
  { id: 'wallet', type: 'wallet', label: 'Wallet Lookup' },
  { id: 'land-hud', type: 'land-hud', label: 'Land HUD' },
  { id: 'settings', type: 'settings', label: 'Settings' },
  { id: 'my-lands', type: 'my-lands', label: 'My Lands' },
];
