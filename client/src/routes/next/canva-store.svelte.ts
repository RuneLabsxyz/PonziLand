import type Konva from 'konva';

export let canvaStore = $state<{
  scale: number;
  stage: Konva.Stage | undefined;
  position: { x: number; y: number };
}>({ scale: 1, stage: undefined, position: { x: 0, y: 0 } });
