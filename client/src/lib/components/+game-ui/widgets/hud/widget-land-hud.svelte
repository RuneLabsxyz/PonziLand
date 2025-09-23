<script lang="ts">
  import account from '$lib/account.svelte';
  import LandHudAuction from '$lib/components/+game-map/land/hud/land-hud-auction.svelte';
  import LandHudInfo from '$lib/components/+game-map/land/hud/land-hud-info.svelte';
  import LandNukeTime from '$lib/components/+game-map/land/land-nuke-time.svelte';
  import LandOwnerInfo from '$lib/components/+game-map/land/land-owner-info.svelte';
  import { Card } from '$lib/components/ui/card';
  import { selectedLandWithActions } from '$lib/stores/store.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { padAddress } from '$lib/utils';
  import { List, Eye } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  type Props = {
    setCustomTitle?: (title: Snippet<[]> | null) => void;
    setCustomControls?: (controls: Snippet<[]> | null) => void;
  };

  let { setCustomTitle, setCustomControls }: Props = $props();

  const address = $derived(account.address);
  let landWithActions = $derived(selectedLandWithActions());

  let isOwner = $derived(
    landWithActions?.value?.owner === padAddress(address ?? ''),
  );
  let land = $derived(landWithActions?.value);

  $effect(() => {
    if (setCustomTitle) {
      setCustomTitle(customTitleSnippet);
    }
  });

  $effect(() => {
    if (setCustomControls) {
      setCustomControls(customControlsSnippet);
    }
  });
</script>

{#snippet customTitleSnippet()}
  {land ? '' : 'Click on a land to see more info...'}
{/snippet}

{#snippet customControlsSnippet()}
  <button
    class="window-control"
    onclick={() => settingsStore.toggleNoobMode()}
    aria-label={settingsStore.isNoobMode
      ? 'Switch to Pro Mode'
      : 'Switch to Noob Mode'}
  >
    {#if settingsStore.isNoobMode}
      <Eye class="h-4 w-4" />
    {:else}
      <List class="h-4 w-4" />
    {/if}
  </button>
{/snippet}

{#if land}
  {#if land.type !== 'auction'}
    <div class="absolute left-0 top-0 -translate-y-full">
      <LandOwnerInfo {land} {isOwner} />
    </div>
    <div class="absolute right-0 top-0 -translate-y-full">
      <Card>
        <LandNukeTime {land} />
      </Card>
    </div>
  {/if}
  {#if land.type === 'auction'}
    <LandHudAuction {land} />
  {:else if land.type === 'grass'}
    <!-- <LandHudEmpty /> -->
  {:else}
    <LandHudInfo {land} {isOwner} showLand={true} />
  {/if}
{/if}
