<script lang="ts">
  import { locationToCoordinates } from '$lib/utils';

  interface Props {
    location: string;
  }

  let { location }: Props = $props();

  const coords = locationToCoordinates(location);
</script>

<div class="flex flex-col">
  <div class="text-gray-300 tracking-wide leading-none">
    {coords.x}, {coords.y}
  </div>
  <div class="text-gray-400 tracking-wide leading-none">#{location}</div>
</div>
