<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { availableWidgets } from './widgets.config';
  import { PUBLIC_SOCIALINK_URL } from '$env/static/public';
  import accountDataProvider, { setup } from '$lib/account.svelte';
  import { onMount } from 'svelte';
  import { ENABLE_GUILD } from '$lib/flags';
  import { tutorialState } from '$lib/components/tutorial/stores.svelte';

  let url = $derived(
    `${PUBLIC_SOCIALINK_URL}/api/user/${accountDataProvider.address}/team/info`,
  );

  function addWidget(widgetType: string) {
    const widget = availableWidgets.find((w) => w.type === widgetType);
    if (!widget) return;

    // Check if widget already exists
    if ($widgetsStore[widget.id]) {
      if ($widgetsStore[widget.id].isOpen) {
        // If widget is open but minimized, unminimize it
        if ($widgetsStore[widget.id].isMinimized) {
          widgetsStore.updateWidget(widget.id, { isMinimized: false });
        } else {
          // If widget is open and not minimized, close it
          widgetsStore.updateWidget(widget.id, { isOpen: false });
        }
      } else {
        // If widget is closed, open it
        widgetsStore.updateWidget(widget.id, { isOpen: true });
      }
      return;
    }

    // Add new widget
    widgetsStore.addWidget({
      id: widget.id,
      type: widget.type,
      position: { x: 300, y: 100 }, // Default position
      isMinimized: false,
      isOpen: true,
    });
  }

  onMount(async () => {
    if (tutorialState.tutorialEnabled) {
      widgetsStore.removeWidget('disclaimer');
    }
    if (ENABLE_GUILD) {
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.team === null) {
          addWidget('guild');
        }
      } catch (error) {
        console.error('Failed to fetch team info:', error);
      }
    } else {
      widgetsStore.removeWidget('guild');
    }
  });
</script>

<!-- Hide widget launcher entirely during tutorial -->
{#if !tutorialState.tutorialEnabled}
  <div
    class="fixed bottom-2 left-2 flex gap-2 items-center"
    style="pointer-events: all;"
  >
    {#each availableWidgets as widget}
      <Button
        class="w-24 h-24 flex flex-col gap-1"
        onclick={() => addWidget(widget.type)}
      >
        <img src={widget.icon} class="w-16 h-14" alt="" />
        <div class="font-ponzi-number stroke-3d-black text-[11px]">
          {widget.label}
        </div>
      </Button>
    {/each}
  </div>
{/if}
