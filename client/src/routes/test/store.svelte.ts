import type { BaseLand } from "$lib/api/land";
import { LandTileStore } from "$lib/api/land_tiles.svelte";

export let landStore = $state(new LandTileStore());

export let selectedLand = $state<{value: BaseLand | null}>({value: null})