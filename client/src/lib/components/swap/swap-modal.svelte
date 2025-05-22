<script>
  import { Card } from '$lib/components/ui/card';
  import CloseButton from '$lib/components/ui/close-button.svelte';
  import Swap from './swap.svelte';
  let { visible = $bindable(true), ...props } = $props();
</script>

{#if visible}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
  >
    <Card>
      <CloseButton onclick={() => (visible = false)} />
      <h1 class="text-2xl mb-3 text-stroke-none">Swap</h1>
      <Swap
        {...props}
        onSwap={() => {
          props?.onSwap?.();
          visible = false;
        }}
      />
    </Card>
  </div>
{/if}
