import { writable } from 'svelte/store';

export type MobileTab = 'map' | 'command-center' | 'wallet';

export const activeTab = writable<MobileTab>('map');