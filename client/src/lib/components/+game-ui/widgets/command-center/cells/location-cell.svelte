<script lang="ts">
  import { locationToCoordinates } from '$lib/utils';

  interface Props {
    location: string;
  }

  let { location }: Props = $props();

  const coords = locationToCoordinates(location);
</script>

<span class="text-gray-300 tracking-wide">{coords.x}, {coords.y}</span>
