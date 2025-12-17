<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';

  interface Tab {
    id: string;
    label: string;
  }

  type Props = {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    fullWidth?: boolean;
    borderBottom?: boolean;
    class?: string;
  };

  let {
    tabs,
    activeTab,
    onTabChange,
    fullWidth = true,
    borderBottom = true,
    class: className = '',
  }: Props = $props();
</script>

<div
  class={cn(
    'flex w-full',
    { 'border-b border-gray-700': borderBottom },
    className,
  )}
>
  {#each tabs as tab}
    {@const isActive = activeTab === tab.id}
    <Button
      class={cn(
        { 'w-full': fullWidth },
        { 'opacity-50': !isActive },
        { 'opacity-100': isActive },
      )}
      onclick={() => onTabChange(tab.id)}
    >
      {tab.label}
    </Button>
  {/each}
</div>
