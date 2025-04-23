<script lang="ts">
  import { Card } from '../ui/card';
  import type { SelectedLand } from '$lib/stores/stores.svelte';

  let {
    land,
  }: {
    land?: SelectedLand;
  } = $props();
</script>

<div class="absolute left-0 -translate-y-12">
  <Card>
    <div class="flex items-center gap-2 text-ponzi-number">
      <span>{land?.owner?.slice(0, 4) + '...' + land?.owner?.slice(-4)}</span>
    </div>
  </Card>
</div>

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }
</style>
