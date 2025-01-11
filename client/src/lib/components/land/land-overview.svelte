<script lang="ts">
  import { Button } from '../ui/button';

  const { data } = $props();
</script>

<div class="flex flex-col">
  <div class="flex items-center justify-center h-24 w-24 bg-[#85C771] rounded border border-white mb-4">
    <img alt="house" src={data.token.images.castle.basic} class="h-20 w-20"/>
  </div>
  <!-- <pre class="text-xs w-52">{JSON.stringify(data, null, 2)}</pre> -->
</div>
