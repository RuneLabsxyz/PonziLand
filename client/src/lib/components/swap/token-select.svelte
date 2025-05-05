<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '../ui/select';
  import data from '$profileData';
  import type { Token } from '$lib/interfaces';

  let { value = $bindable<Token | undefined>(), ...rest } = $props();
</script>

<Select onSelectedChange={(v) => (value = v?.value as Token)}>
  <SelectTrigger {...rest} class="text-stroke-none">
    {#if value}
      <div class="flex gap-2 items-center text-black">
        <img class="h-4 w-4" src={value.images.icon} alt={value.symbol} />
        {value.symbol}
      </div>
    {:else}
      <span> Select Token </span>
    {/if}
  </SelectTrigger>
  <SelectContent class="text-stroke-none">
    {#each data.availableTokens as token}
      <SelectItem value={token}>
        <div class="flex gap-2 items-center text-stroke-none">
          <img class="h-4 w-4" src={token.images.icon} alt={token.symbol} />
          {token.symbol}
        </div>
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
