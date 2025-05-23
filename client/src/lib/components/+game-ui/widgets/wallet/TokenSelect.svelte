<script lang="ts">
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select';
  import data from '$profileData';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';

  let { value = $bindable<string>() } = $props();
</script>

<Select onSelectedChange={(v) => (value = v?.value as string)}>
  <SelectTrigger
    class="w-full bg-[#282835] text-[#D9D9D9] rounded font-ponzi-number stroke-3d-black"
  >
    {#if value}
      {#each data.availableTokens as token}
        {#if token.address === value}
          <div class="flex gap-2 items-center">
            <TokenAvatar token={token} class="h-6 w-6 border-2 border-black" />
            {token.symbol}
          </div>
        {/if}
      {/each}
    {:else}
      Select Token
    {/if}
  </SelectTrigger>
  <SelectContent class="bg-[#282835] text-white">
    {#each data.availableTokens as token}
      <SelectItem value={token.address}>
        <div class="flex gap-2 items-center font-ponzi-number text-white">
          <TokenAvatar token={token} />
          {token.symbol}
        </div>
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
