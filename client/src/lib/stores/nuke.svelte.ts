export let nukeStore = $state<{
  pending: Map<string, boolean>;
  nuking: Map<string, boolean>;
}>({
  pending: new Map(),
  nuking: new Map(),
});
