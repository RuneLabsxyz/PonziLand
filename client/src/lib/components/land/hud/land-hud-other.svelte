<script lang="ts">
  import { useDojo } from '$lib/contexts/dojo';
  import { selectedLandMeta } from '$lib/stores/stores.svelte';
  import { shortenHex } from '$lib/utils';
  import LandOverview from '../../land/land-overview.svelte';
  import { usernames } from '$lib/stores/accounts';
</script>

<div class="flex gap-4 relative items-center p-4">
  {#if $selectedLandMeta}
    <LandOverview land={$selectedLandMeta} />
  {/if}
  <div class="w-full text-stroke-none flex flex-col leading-none text-sm">
    <div class="flex justify-between">
      <p class="opacity-50">Owner</p>
      <p class="text-[#1F75BC] hover:underline">
        <a
          href={`https://sepolia.voyager.online/contract/${$selectedLandMeta?.owner}`}
          target="_blank"
          class="w-full"
        >
          <!-- 
            @dev: Red i know this is discusting
            @TODO: handle in server so we can remove this  
          -->
          {#if $selectedLandMeta?.owner}
            {$usernames[
              $selectedLandMeta?.owner
                ?.replace('0x00', '0x')
                .replace('0x0', '0x')
            ] || shortenHex($selectedLandMeta?.owner)}
          {/if}
        </a>
      </p>
    </div>

    <div class="flex justify-between">
      <p class="opacity-50">Price</p>
      <p>
        {$selectedLandMeta?.sellPrice?.toString()}
        {$selectedLandMeta?.token?.symbol}
      </p>
    </div>
    <div class="flex justify-between">
      <p class="opacity-50">Remaining Stake</p>
      <p>
        {$selectedLandMeta?.stakeAmount?.toString()}
        {$selectedLandMeta?.token?.symbol}
      </p>
    </div>
  </div>
</div>
