<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { cn } from '$lib/utils';
  import data from '$profileData';
  import { tutorialState } from '../tutorial/stores.svelte';

  let { value = $bindable<string>(), class: className } = $props();
</script>

<Select onSelectedChange={(v) => (value = v?.value as string)}>
  <SelectTrigger
    class={cn(
      'w-full bg-[#282835] text-[#D9D9D9] rounded font-ponzi-number stroke-3d-black',
      className,
    )}
  >
    {#if value}
      {#each data.availableTokens as token}
        {#if token.address === value}
          <div class="flex gap-2 items-center">
            <TokenAvatar {token} class="h-6 w-6 border-2 border-black" />
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
      <SelectItem
        value={token.address}
        disabled={tutorialState.tutorialEnabled && token.symbol !== 'eSTRK'}
      >
        <div class="flex gap-2 items-center font-ponzi-number text-white">
          <TokenAvatar {token} />
          {token.symbol}
        </div>
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
