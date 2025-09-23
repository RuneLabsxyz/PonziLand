<script lang="ts">
  import { Info } from 'lucide-svelte';
  import * as Tooltip from '$lib/components/ui/tooltip';

  let { text }: { text: string } = $props();
</script>

<Tooltip.Root>
  <Tooltip.Trigger asChild let:builder>
    <button
      use:builder.action
      {...builder}
      class="text-gray-500 hover:text-gray-300 transition-colors"
    >
      <Info size={12} />
    </button>
  </Tooltip.Trigger>
  <Tooltip.Content class="bg-black/90 text-white text-xs border-gray-600">
    {text}
  </Tooltip.Content>
</Tooltip.Root>