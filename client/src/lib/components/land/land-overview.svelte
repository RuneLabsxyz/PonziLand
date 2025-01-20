<script lang="ts">
  import { locationIntToString } from '$lib/utils';
  import { Button } from '../ui/button';

  const { data } = $props();
</script>

<div class="flex flex-col">
  <div
    class="flex items-center justify-center h-24 w-24 bg-[#85C771] rounded border border-white relative"
  >
    {#if data.token}
      <img alt="house" src={data.token.images.castle.basic} class="h-20 w-20" />
    {/if}
    <div class="absolute top-0 left-0 -mt-1 leading-none">
      <span>{locationIntToString(data.location)}</span>
    </div>
  </div>
</div>
