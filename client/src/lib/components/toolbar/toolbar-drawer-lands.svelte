<script lang="ts">
  import { useLands } from '$lib/api/land.svelte';
  import { landStore } from '$lib/api/mock-land';
  import { useDojo } from '$lib/contexts/dojo';
  import { moveCameraTo } from '$lib/stores/camera';
  import { padAddress, shortenHex, toBigInt } from '$lib/utils';
  import { ScrollArea } from '../ui/scroll-area';

  let landsStore = useLands();

  const { store, client: sdk, account } = useDojo();

  const accountData = $derived(account.getAccount());

  let playerLands = $derived(() => {
    if (!$landsStore) return [];
    if (!accountData) return [];

    const playerLands = $landsStore.filter(
      (land) => land.owner == padAddress(accountData?.address ?? ''),
    );

    return playerLands.map((land) => {
      return {
        location: Number(toBigInt(land.location)),
        block_date_bought: toBigInt(land.block_date_bought),
        sell_price: toBigInt(land.sell_price),
        token_used: land.token_used,
        pool_key: toBigInt(land.pool_key),
      };
    });
  });
</script>

<ScrollArea class="h-full w-full relative">
  <div class="flex flex-col gap-2 pr-8">
    {#each playerLands() as land}
      <button
        class="p-3 text-left"
        onclick={() =>
          moveCameraTo(
            Math.floor(land.location % 64) + 1,
            Math.floor(land.location / 64) + 1,
          )}
      >
        <p class="font-medium">
          Location: {(land.location % 64) + 1}, {Math.floor(
            land.location / 64,
          ) + 1}
        </p>
        <p>Block date bought: {land.block_date_bought}</p>
        <p>Sell Price: {land.sell_price}</p>
        {#if land.token_used}
          <p>Token: {shortenHex(land.token_used)}</p>
        {/if}
        {#if land.pool_key}
          <p>Pool: {land.pool_key}</p>
        {/if}
      </button>
    {/each}
  </div>
</ScrollArea>
