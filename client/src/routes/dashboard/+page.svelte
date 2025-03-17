<script lang="ts">
  import data from '$lib/data.json';
  import Card from '$lib/components/ui/card/card.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import type { Token } from '$lib/interfaces';

  const tokens: Token[] = data.availableTokens;
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl mb-4 text-white">Game Tokens</h1>

  <Card class="shadow-ponzi">
    <div class="text-xl text-white mb-3">Active Tokens</div>

    <ScrollArea class="h-[400px] w-full">
      <div class="space-y-2">
        {#each tokens as token}
          <div
            class="flex items-center justify-between p-3 bg-black/20 rounded text-white"
          >
            <div class="flex items-center gap-3">
              <img
                src={token.images.icon}
                alt={token.symbol}
                class="w-6 h-6 rounded-full"
              />
              <span class="font-bold">{token.symbol}</span>
            </div>
            <span class="font-mono text-sm">{token.address}</span>
          </div>
        {/each}
      </div>
    </ScrollArea>
  </Card>
</div>
