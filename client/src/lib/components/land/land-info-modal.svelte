<script>
  import { uiStore } from '$lib/stores/stores.svelte';
  import { Card } from '../ui/card';
  import CloseButton from '../ui/close-button.svelte';

  const handleCancel = () => {
    uiStore.showModal = false;
  };
</script>

<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
>
  <Card class="flex flex-col min-w-96 min-h-96 relative">
    <CloseButton
      onclick={handleCancel}
      className="absolute top-0 right-0 m-2"
    />
  </Card>
</div>
