<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import CloseButton from '$lib/components/ui/close-button.svelte';
  import Register from '$lib/components/socialink/register.svelte';

  let {
    visible = $bindable(false),
    onfinish,
  }: {
    visible: boolean;
    onfinish?: (username: string) => void;
  } = $props();

  function handleFinish(username: string) {
    visible = false;
    onfinish?.(username);
  }
</script>

{#if visible}
  <div class="bg-black opacity-60 fixed w-screen h-screen top-0 left-0 z-[99]">
    &nbsp;
  </div>
  <Card
    class="fixed bg-ponzi top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] p-6 min-w-80"
  >
    <CloseButton
      onclick={() => {
        visible = false;
      }}
    />
    <Register onfinish={handleFinish} />
  </Card>
{/if}
