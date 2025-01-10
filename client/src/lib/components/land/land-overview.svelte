<script lang="ts">
  import { Button } from '../ui/button';

  const { data } = $props();
</script>

<div class="w-full flex flex-col">
  landoverview
  <pre class="text-xs w-52">{JSON.stringify(data, null, 2)}</pre>
</div>
