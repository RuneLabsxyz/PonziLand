<script lang="ts">
  import { Pane, Slider } from 'svelte-tweakpane-ui';
  import { devsettings } from './utils/devsettings.store.svelte';
</script>

<Pane title="Frustum Settings" position="fixed" x={0} y={100}>
  <Slider
    bind:value={devsettings.frustumPadding}
    label="Frustum Padding"
    min={-5}
    max={5}
    step={1}
  />
</Pane>
