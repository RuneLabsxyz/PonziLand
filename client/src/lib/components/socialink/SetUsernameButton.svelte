<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import UsernameModal from '$lib/components/+game-ui/modals/UsernameModal.svelte';
  import { usernameStore } from '$lib/stores/username.store.svelte';

  let {
    class: className = '',
    size = 'sm',
  }: {
    class?: string;
    size?: 'default' | 'sm' | 'md';
  } = $props();

  let modalVisible = $state(false);

  function handleUsernameRegistered() {
    usernameStore.refetch();
  }

  let username = $derived(usernameStore.promise);
</script>

<UsernameModal
  bind:visible={modalVisible}
  onfinish={handleUsernameRegistered}
/>

{#await username then info}
  {#if !info?.exists}
    <Button
      {size}
      onclick={() => (modalVisible = true)}
      class="text-xs px-2 py-0.5 {className}"
    >
      Set Username
    </Button>
  {/if}
{/await}
