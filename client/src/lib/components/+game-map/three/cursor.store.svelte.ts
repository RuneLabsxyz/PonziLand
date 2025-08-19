export let cursorStore: {
  hoveredTileIndex?: number;
  selectedTileIndex?: number;
  gridPosition?: { x: number; y: number; id: number };
} = $state({
  hoveredTileIndex: undefined,
  selectedTileIndex: undefined,
  gridPosition: undefined,
});
