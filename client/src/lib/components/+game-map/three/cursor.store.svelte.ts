export let cursorStore: {
  hoveredTileIndex?: number;
  selectedTileIndex?: number;
  gridPosition?: { x: number; y: number; id: number };
  absolutePosition?: { x: number; y: number };
} = $state({
  hoveredTileIndex: undefined,
  selectedTileIndex: undefined,
  gridPosition: undefined,
  absolutePosition: undefined,
});
