<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { usernameStore } from '$lib/stores/username.store.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';

  let {
    class: className = '',
    size = 'sm',
  }: {
    class?: string;
    size?: 'default' | 'sm' | 'md';
  } = $props();

  function openUsernameWidget() {
    widgetsStore.updateWidget('username', { isOpen: true });
  }

  let username = $derived(usernameStore.promise);
</script>

{#await username then info}
  {#if !info?.exists}
    <Button
      {size}
      onclick={openUsernameWidget}
      class="text-xs {className}"
    >
      Set Username
    </Button>
  {/if}
{/await}
