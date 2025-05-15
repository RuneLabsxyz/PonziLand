import { LandTileStore } from "$lib/api/land_tiles.svelte";

export let landStore = $state(new LandTileStore());