<script lang="ts">
  import Draggable from '$lib/components/ui/draggable.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import MinimizedToolbar from '$lib/components/ui/minimized-toolbar.svelte';
  import WidgetContent from './widget-content.svelte';
  import { tutorialState } from '$lib/components/tutorial/stores.svelte';

  // Widgets to hide during tutorial mode
  const tutorialHiddenWidgets = ['wallet'];
</script>

{#each Object.entries($widgetsStore) as [id, widget]}
  {@const hiddenInTutorial =
    tutorialState.tutorialEnabled &&
    tutorialHiddenWidgets.includes(widget.type)}
  {#if widget.isOpen && !widget.isMinimized && !widget.isDocked && !hiddenInTutorial}
    <Draggable
      {id}
      type={widget.type}
      initialPosition={widget.position}
      initialDimensions={widget.dimensions}
      bind:isMinimized={widget.isMinimized}
      disableResize={widget.disableResize}
    >
      {#snippet children({ setCustomControls, setCustomTitle })}
        <WidgetContent
          type={widget.type}
          data={widget.data}
          {setCustomControls}
          {setCustomTitle}
        />
      {/snippet}
    </Draggable>
  {/if}
{/each}

<!-- Minimized Windows Toolbar -->
<MinimizedToolbar />
