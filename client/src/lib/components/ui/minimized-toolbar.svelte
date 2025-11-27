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
  <div class="minimized-toolbar">
    <Card class="toolbar-card">
      {#each minimizedWidgets as widget}
        <button
          class="toolbar-icon"
          onclick={() => restoreWidget(widget.id)}
          title={getWidgetLabel(widget.type)}
        >
          <img
            src={getWidgetIcon(widget.type)}
            alt={getWidgetLabel(widget.type)}
            class="icon-image"
          />
        </button>
      {/each}
    </Card>
  </div>
{/if}

<style>
  .minimized-toolbar {
    position: fixed;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1000;
    pointer-events: all;
  }

  :global(.toolbar-card) {
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 8px 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 48px;
    backdrop-filter: blur(10px);
  }

  .toolbar-icon {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 6px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 4px;
  }

  .toolbar-icon:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  .icon-image {
    width: 24px;
    height: 24px;
    object-fit: contain;
    filter: brightness(0.9);
  }

  .toolbar-icon:hover .icon-image {
    filter: brightness(1.1);
  }
</style>
