<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import {
    widgetsStore,
    sidebarStore,
    SIDEBAR_DOCK_WIDTH,
  } from '$lib/stores/widgets.store';
  import type { Snippet } from 'svelte';
  import { PanelRightClose, PanelRightOpen, X, Minimize } from 'lucide-svelte';

  type Props = {
    children: Snippet<
      [
        {
          dockedWidgetId: string;
          dockedWidgetType: string;
          dockedWidgetData: Record<string, any> | undefined;
        },
      ]
    >;
  };

  let { children }: Props = $props();

  // Find the docked widget
  let dockedWidget = $derived(
    Object.values($widgetsStore).find((w) => w.isDocked && w.isOpen),
  );

  let isCollapsed = $derived($sidebarStore.collapsed);

  function handleUndock() {
    if (dockedWidget) {
      widgetsStore.undockWidget(dockedWidget.id);
    }
  }

  function handleClose() {
    if (dockedWidget) {
      widgetsStore.undockWidget(dockedWidget.id);
      widgetsStore.closeWidget(dockedWidget.id);
    }
  }

  function handleMinimize() {
    if (dockedWidget) {
      widgetsStore.undockWidget(dockedWidget.id);
      widgetsStore.updateWidget(dockedWidget.id, { isMinimized: true });
    }
  }

  function toggleCollapse() {
    sidebarStore.toggleCollapse();
  }
</script>

{#if dockedWidget}
  <div
    class="sidebar-dock"
    class:collapsed={isCollapsed}
    style="width: {isCollapsed ? '40px' : `${SIDEBAR_DOCK_WIDTH}px`};"
  >
    {#if isCollapsed}
      <!-- Collapsed strip -->
      <button
        class="collapse-toggle collapsed-strip"
        onclick={toggleCollapse}
        title="Expand sidebar"
      >
        <PanelRightOpen size={18} />
      </button>
    {:else}
      <!-- Full sidebar -->
      <Card class="w-full h-full bg-ponzi flex flex-col overflow-hidden">
        <div class="sidebar-header">
          <div class="sidebar-title font-ponzi-number">
            {dockedWidget.id}
          </div>
          <div class="sidebar-controls text-white">
            <button
              class="window-control"
              onclick={toggleCollapse}
              title="Collapse sidebar"
            >
              <PanelRightClose size={16} />
            </button>
            <button
              class="window-control"
              onclick={handleUndock}
              title="Undock widget"
            >
              <Minimize size={16} />
            </button>
            <button class="window-control" onclick={handleClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>
        <div class="sidebar-content min-h-0 flex-1 overflow-auto">
          {@render children({
            dockedWidgetId: dockedWidget.id,
            dockedWidgetType: dockedWidget.type,
            dockedWidgetData: dockedWidget.data,
          })}
        </div>
      </Card>
    {/if}
  </div>
{/if}

<style>
  .sidebar-dock {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    z-index: 50;
    pointer-events: all;
    transition:
      width 0.25s ease,
      opacity 0.2s ease;
    background: rgba(0, 0, 0, 0.85);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
  }

  .sidebar-dock.collapsed {
    background: rgba(0, 0, 0, 0.6);
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }

  .sidebar-title {
    color: white;
    font-size: 14px;
    font-weight: 500;
    user-select: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar-controls {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .sidebar-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .collapse-toggle {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .collapse-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .collapsed-strip {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
