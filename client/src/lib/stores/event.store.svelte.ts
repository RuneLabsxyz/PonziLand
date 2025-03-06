import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { writable } from 'svelte/store';

export type ClaimEvent = CurrencyAmount;

export const claimQueue = writable<ClaimEvent[]>([]);

export let nukingStore = $state({ value: [] });
