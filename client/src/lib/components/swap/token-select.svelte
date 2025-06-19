<script lang="ts">
  import TokenSelect from '$lib/components/ui/token/token-select.svelte';
  import type { Token } from '$lib/interfaces';

  let {
    value = $bindable<Token | string | undefined>(),
    class: className,
  }: { value: Token | string | undefined; class?: string } = $props();

  // Handle the unified component's value which can be Token or string
  let internalValue = $state<Token | string | undefined>(value);

  // Sync external value changes to internal
  $effect(() => {
    internalValue = value;
  });

  // Sync internal value changes to external
  $effect(() => {
    value = internalValue;
  });
</script>

<TokenSelect
  bind:value={internalValue}
  variant="swap"
  tutorialEnabled={true}
  class={className}
/>
