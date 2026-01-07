<script lang="ts">
  import { tutorialState, tutorialAttribute } from './stores.svelte';

  // Simple check: show full-screen dark overlay when darken_widget is active
  // The overlay is at z-[9998], below widgets (z-9999) and tutorial dialog (z-9999)
  // This darkens everything except the modal and dialog which render on top
  let showWidgetOverlay = $derived(
    tutorialState.tutorialEnabled && tutorialAttribute('darken_widget').has,
  );
</script>

{#if showWidgetOverlay}
  <!-- Full-screen dark overlay - z-[39] is below GameUi (z-40) but above canvas -->
  <div class="fixed inset-0 bg-black/70 pointer-events-none z-[39]"></div>
{/if}
