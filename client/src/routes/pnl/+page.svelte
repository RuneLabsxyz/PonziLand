<script lang="ts">
  import PnlImage from '$lib/components/+game-ui/widgets/command-center/PnlImage.svelte';
  import { page } from '$app/state';

  const value = $derived(Number(page.url.searchParams.get('value')) || 0);
</script>

<PnlImage {value} />
