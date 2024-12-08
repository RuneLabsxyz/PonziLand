import { writable } from 'svelte/store';

export const tileHUD = writable<{
    location: number;
    owner: string | null;   
    sellPrice: number;
    tokenUsed: number;
} | null>(null);


export const mousePosCoords = writable<{
    x: number;
    y: number;
} | null>(null);

export const accountAddress = writable<string | null>('0x1234567890abcdef');

