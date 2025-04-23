<script lang="ts">
  import { uiStore } from '$lib/stores/ui.store.svelte';
</script>

<button
  onclick={() => {
    uiStore.modalInfo = true;
  }}
>
  <img
    src="/ui/icons/Icon_Thin_Help.png"
    alt="help icon"
    style="image-rendering: pixelated;"
    class="h-8 w-8"
  />
</button>
