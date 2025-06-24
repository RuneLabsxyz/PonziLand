export let cursorStore: {
  hoveredTileIndex?: number;
  selectedTileIndex?: number;
} = $state({
  hoveredTileIndex: undefined,
  selectedTileIndex: undefined,
});
