<script lang="ts">
  import PnlImage from '$lib/components/+game-ui/widgets/command-center/PnlImage.svelte';
  import { page } from '$app/state';
  import PonziProgress from '$lib/components/+game-ui/widgets/command-center/PonziProgress.svelte';

  const pnl = $derived(Number(page.url.searchParams.get('pnl')) || 0);
</script>

<PonziProgress />

<PnlImage {pnl} />
