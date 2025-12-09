<script lang="ts">
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { availableWidgets } from '$lib/components/+game-ui/widgets/widgets.config';
  import { Card } from '$lib/components/ui/card';

  // Get minimized widgets
  const minimizedWidgets = $derived(
    Object.values($widgetsStore).filter(
      (widget) => widget.isMinimized && widget.isOpen && !widget.fixed,
    ),
  );

  function getWidgetIcon(type: string): string {
    const widget = availableWidgets.find((w) => w.type === type);
    return widget?.icon || '/ui/icons/Icon_Thin_Book.png'; // fallback icon
  }

  function getWidgetLabel(type: string): string {
    const widget = availableWidgets.find((w) => w.type === type);
    return widget?.label || type;
  }

  function restoreWidget(id: string) {
    widgetsStore.updateWidget(id, { isMinimized: false });
  }
</script>

{#if minimizedWidgets.length > 0}
  <div
    class="fixed left-2.5 top-1/2 -translate-y-1/2 z-[1000] pointer-events-auto"
  >
    <Card
      class="bg-black/80 border-white/10 rounded-lg px-1 py-2 flex flex-col gap-1 min-w-12 backdrop-blur-[10px]"
    >
      {#each minimizedWidgets as widget}
        <button
          class="bg-white/10 border-0 rounded-md w-10 h-10 flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out p-1 hover:bg-white/20 hover:scale-105"
          onclick={() => restoreWidget(widget.id)}
          title={getWidgetLabel(widget.type)}
        >
          <img
            src={getWidgetIcon(widget.type)}
            alt={getWidgetLabel(widget.type)}
            class="w-6 h-6 object-contain brightness-90 hover:brightness-110"
          />
        </button>
      {/each}
    </Card>
  </div>
{/if}
