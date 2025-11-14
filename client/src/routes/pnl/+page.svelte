<script lang="ts">
  import PnlImage from '$lib/components/+game-ui/widgets/share/PnlImage.svelte';
  import { page } from '$app/state';
  import PonziProgress from '$lib/components/+game-ui/widgets/share/PonziProgress.svelte';

  const pnl = $derived(Number(page.url.searchParams.get('pnl')) || 0);
</script>

<PonziProgress />

<PnlImage {pnl} />
