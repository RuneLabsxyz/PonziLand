import { writable } from 'svelte/store';

export const tileHUD = writable<{
    location: number;
    owner: string | null;   
} | null>(null);


export const mousePosCoords = writable<{
    x: number;
    y: number;
} | null>(null);