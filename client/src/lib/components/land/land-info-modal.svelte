<script>
  import { uiStore } from '$lib/stores/stores.svelte';
  import Button from '../ui/button/button.svelte';
  import { Card } from '../ui/card';

  const handleCancel = () => {
    uiStore.showModal = false;
  };
</script>

<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
>
  <Card class="flex flex-col min-w-96 min-h-96">
    <Button on:click={handleCancel}>X</Button>
    <div>land info</div>
  </Card>
</div>
