import { writable } from 'svelte/store';

export const usernames = writable<Record<string, string>>({});

export function updateUsernames(newUsernames: Record<string, string>) {
  usernames.update((current) => ({ ...current, ...newUsernames }));
}
