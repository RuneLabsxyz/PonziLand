<script lang="ts">
  import * as ToggleGroup from '$lib/components/ui/toggle-group';
  import * as Tooltip from '$lib/components/ui/tooltip';

  interface Props {
    value: string;
    tooltip: string;
  }

  let { value, tooltip, children }: Props & { children: any } = $props();
</script>

<Tooltip.Root>
  <Tooltip.Trigger asChild let:builder>
    <div use:builder.action {...builder}>
      <ToggleGroup.Item {value}>
        <div class="flex items-center justify-center h-4 w-4">
          {@render children()}
        </div>
      </ToggleGroup.Item>
    </div>
  </Tooltip.Trigger>
  <Tooltip.Content class="bg-black/90 text-white text-xs border-gray-600">
    <p>{tooltip}</p>
  </Tooltip.Content>
</Tooltip.Root>
