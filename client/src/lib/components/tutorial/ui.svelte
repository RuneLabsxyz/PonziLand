<script lang="ts">
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { onMount } from 'svelte';
  import WidgetProvider from '../+game-ui/widgets/widget-provider.svelte';

  onMount(() => {
    widgetsStore.addWidget({
      id: 'tutorial',
      type: 'tutorial',
      position: { x: 100, y: 20 },
      dimensions: { width: 500, height: 0 },
      isMinimized: false,
      isOpen: true,
    });
  });
</script>

<div
  class="z-40 absolute top-0 left-0 right-0 bottom-0"
  style="pointer-events: none;"
>
  <WidgetProvider />
</div>
