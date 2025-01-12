<script lang="ts">
  import { Button } from "$lib/components/ui/button";

  const { value, ...rest } = $props();
</script>

<Button {...rest}>{value}</Button>
