export let nukeStore = $state<{
  pending: { [location: string]: boolean };
  nuking: { [location: string]: boolean };
}>({
  pending: {},
  nuking: {},
});

export function setPending(location: string) {
  nukeStore.pending = { ...nukeStore.pending, [location]: true };
}

export function clearPending(location: string) {
  const newPending = { ...nukeStore.pending };
  delete newPending[location];
  nukeStore.pending = newPending;
}

export function setNuking(location: string) {
  clearPending(location);
  nukeStore.nuking = { ...nukeStore.nuking, [location]: true };
}

export function clearNuking(location: string) {
  const newNuking = { ...nukeStore.nuking };
  delete newNuking[location];
  nukeStore.nuking = newNuking;
}
