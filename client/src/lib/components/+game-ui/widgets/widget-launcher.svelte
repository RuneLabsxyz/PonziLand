<script lang="ts">
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { Plus } from 'lucide-svelte';
  import { availableWidgets } from './widgets.config';

  function addWidget(widgetType: string) {
    const widget = availableWidgets.find((w) => w.type === widgetType);
    if (!widget) return;

    // Check if widget already exists
    if ($widgetsStore[widget.id]) {
      // If it exists but is closed, just open it
      if (!$widgetsStore[widget.id].isOpen) {
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
</script>

<div class="fixed bottom-4 left-4" style="pointer-events: all;">
  <div class="bg-black/80 rounded-lg p-2 flex gap-2">
    {#each availableWidgets as widget}
      <button
        class="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-md text-white flex items-center gap-2 transition-colors"
        onclick={() => addWidget(widget.type)}
      >
        <Plus size={16} />
        {widget.label}
      </button>
    {/each}
  </div>
</div>
