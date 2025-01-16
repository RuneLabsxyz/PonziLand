<script>
  import { mousePosCoords } from '$lib/stores/stores.svelte';

  import Card from './ui/card/card.svelte';
</script>

<Card class="fixed bottom-0 left-0 z-50">
  <p>
    Mouse: {$mousePosCoords ? `${$mousePosCoords.x}, ${$mousePosCoords.y}` : ''}
  </p>
</Card>
