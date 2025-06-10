<script lang="ts">
  import { onMount } from 'svelte';
  import data from '$profileData';

  interface Distribution {
    token_address: string;
    land_count: number;
    percentage: number;
  }

  interface GuildInfo {
    name: string;
    image: string;
  }

  interface RankingEntry extends Distribution {
    guildInfo: GuildInfo;
  }

  let rankings = $state<RankingEntry[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Convert decimal to hex without prefix
  function toHexAddress(decimalStr: string): string {
    return BigInt(decimalStr).toString(16);
  }

  // Normalize address by removing 0x0 or 0x00 prefix
  function normalizeAddress(address: string): string {
    return address.replace(/^0x0+/, '');
  }

  // Map token addresses to guild info with normalized addresses as keys
  const guildMap = new Map(
    data.availableTokens.map((token) => [
      normalizeAddress(token.address),
      {
        name: token.name,
        image: token.images.icon,
      },
    ]),
  );

  async function fetchRankings() {
    try {
      const response = await fetch('https://api.ponzi.land/lands/distribution');
      const data = await response.json();

      // Transform and sort the distributions
      rankings = data.distributions
        .map((dist: Distribution) => {
          const hexAddress = toHexAddress(dist.token_address);
          const guildInfo = guildMap.get(hexAddress) || {
            name: 'Unknown Guild',
            image: '/tokens/nftSTRK/icon.png',
          };

          console.log('Mapping address:', {
            original: dist.token_address,
            hex: hexAddress,
            normalized: normalizeAddress(hexAddress),
            found: !!guildMap.get(hexAddress),
            guildInfo,
          });

          return {
            ...dist,
            guildInfo,
          };
        })
        .sort(
          (a: RankingEntry, b: RankingEntry) => b.land_count - a.land_count,
        );
    } catch (err) {
      error = 'Failed to load guild rankings';
      console.error('Error fetching rankings:', err);
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchRankings();
  });
</script>

<div class="flex flex-col h-full w-full">
  <h2 class="text-2xl font-bold text-white mb-4 text-center flex-shrink-0">
    Guild Rankings
  </h2>

  {#if isLoading}
    <div class="text-white text-center flex-shrink-0">Loading rankings...</div>
  {:else if error}
    <div class="text-red-500 text-center flex-shrink-0">{error}</div>
  {:else}
    <div
      class="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
    >
      <div class="w-full max-w-2xl mx-auto space-y-2 px-2">
        {#each rankings as rank, i}
          <div class="flex items-center bg-black/50 p-3 rounded-lg">
            <div class="flex-shrink-0 w-10 text-xl font-bold text-ponzi-number">
              #{i + 1}
            </div>
            <div class="flex-shrink-0 w-10 h-10 mx-2">
              <img
                src={rank.guildInfo.image}
                alt={rank.guildInfo.name}
                class="w-full h-full object-contain"
              />
            </div>
            <div class="flex-grow min-w-0">
              <div class="text-base font-semibold text-white truncate">
                {rank.guildInfo.name}
              </div>
              <div class="text-sm text-gray-400">
                {rank.land_count} lands ({rank.percentage.toFixed(2)}%)
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
