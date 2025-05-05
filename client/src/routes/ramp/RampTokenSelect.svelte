<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select';
  import data from '$profileData';
  import { onMount } from 'svelte';
  import type { NetworkWithTokens } from '@layerswap/sdk/resources/index.mjs';
  import { ImageIcon } from 'lucide-svelte';
  import ImageIfAvailable from '$lib/components/ui/image-if-available.svelte';

  let {
    values,
    value = $bindable(),
    ...rest
  }: {
    values: NetworkWithTokens.Data.Token[];
    value: NetworkWithTokens.Data.Token | undefined;
  } & any = $props();

  onMount(() => {
    if (value == null) {
      value = values[0];
    }
  });
</script>

<Select
  onSelectedChange={(v) => (value = v?.value as NetworkWithTokens.Data.Token)}
>
  <SelectTrigger {...rest}>
    {#if value}
      <div class="flex gap-2 items-center">
        <ImageIfAvailable
          class="h-4 w-4 rounded-full"
          src={value.logo}
          alt=""
        />
        {value.symbol}
      </div>
    {:else}
      Select Token
    {/if}
  </SelectTrigger>
  <SelectContent>
    {#each values as token}
      <SelectItem value={token}>
        <div class="flex gap-2 items-center">
          <ImageIfAvailable
            class="h-4 w-4 rounded-full"
            src={token.logo}
            alt=""
          />
          {token.symbol}
        </div>
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
