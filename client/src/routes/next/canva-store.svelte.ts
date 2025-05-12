import type Konva from 'konva';

export let canvaStore = $state<{
  scale: number;
  stage: Konva.Stage | undefined;
  layer: Konva.Layer | undefined;
  rulerPosition: { x: number; y: number };
  position: { x: number; y: number };
  gridPosition: { x: number; y: number };
}>({
  scale: 1,
  stage: undefined,
  layer: undefined,
  position: { x: 0, y: 0 },
  rulerPosition: { x: 0, y: 0 },
  gridPosition: { x: -1, y: -1 },
});
