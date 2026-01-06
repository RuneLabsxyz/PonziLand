<script lang="ts">
  import { widgetsStore } from '$lib/stores/widgets.store';
  import {
    tutorialState,
    tutorialAttribute,
    getCurrentStepData,
  } from './stores.svelte';

  // Get current step spotlight widget
  let spotlightWidget = $derived(getCurrentStepData()?.spotlight_widget);

  // Check if widget darkening should be shown
  let showWidgetOverlay = $derived(
    tutorialState.tutorialEnabled && tutorialAttribute('darken_widget').has,
  );

  // Get widget data from store
  let widgets = $derived($widgetsStore);

  // Find the target widget by type (widgets can have dynamic IDs like 'land-info [128-128]')
  let targetWidget = $derived.by(() => {
    if (!spotlightWidget) return null;

    // Map conceptual names to actual widget types
    const typeMapping: Record<string, string> = {
      'buy-land': 'land-info',
      'land-info': 'land-info',
    };
    const actualType = typeMapping[spotlightWidget] || spotlightWidget;

    // Find any open, non-minimized widget of this type
    return Object.values(widgets).find(
      (w) => w.type === actualType && w.isOpen && !w.isMinimized,
    );
  });

  // Calculate cutout path for the widget
  let cutoutPath = $derived.by(() => {
    if (!targetWidget) return '';

    const x = targetWidget.position.x;
    const y = targetWidget.position.y;
    const width = targetWidget.dimensions?.width || 400;
    const height = targetWidget.dimensions?.height || 300;
    const padding = 10; // Extra padding around widget

    // Create a polygon that covers the entire screen except for the widget area
    // Format: polygon(outer, inner-hole)
    // We use an inset path to create the hole
    return `polygon(
      evenodd,
      0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
      ${x - padding}px ${y - padding}px,
      ${x + width + padding}px ${y - padding}px,
      ${x + width + padding}px ${y + height + padding}px,
      ${x - padding}px ${y + height + padding}px,
      ${x - padding}px ${y - padding}px
    )`;
  });

  // Position for the glow border
  let glowStyle = $derived.by(() => {
    if (!targetWidget) return '';

    const x = targetWidget.position.x;
    const y = targetWidget.position.y;
    const width = targetWidget.dimensions?.width || 400;
    const height = targetWidget.dimensions?.height || 300;

    return `left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px;`;
  });
</script>

{#if showWidgetOverlay && targetWidget}
  <!-- Dark overlay with cutout -->
  <div
    class="fixed inset-0 z-[8000] bg-black/70 pointer-events-none"
    style="clip-path: {cutoutPath}"
  ></div>

  <!-- Gold glow border around widget -->
  <div class="widget-glow-border pointer-events-none" style={glowStyle}></div>
{/if}

<style>
  .widget-glow-border {
    position: fixed;
    z-index: 8100;
    border: 3px solid #ffd700;
    border-radius: 12px;
    animation: widgetGlow 2s ease-in-out infinite;
  }

  @keyframes widgetGlow {
    0%,
    100% {
      box-shadow:
        0 0 15px rgba(255, 215, 0, 0.4),
        0 0 30px rgba(255, 215, 0, 0.2),
        inset 0 0 10px rgba(255, 215, 0, 0.05);
    }
    50% {
      box-shadow:
        0 0 25px rgba(255, 215, 0, 0.8),
        0 0 50px rgba(255, 215, 0, 0.4),
        inset 0 0 15px rgba(255, 215, 0, 0.1);
    }
  }
</style>
