<script lang="ts">
  interface Props {
    position: {
      close_date: string | null;
      close_reason?: string;
    };
  }

  let { position }: Props = $props();

  const isOpen = $derived(!position.close_date || position.close_date === null);
</script>

{#if isOpen}
  <div class="flex gap-1 items-center font-ponzi-number text-xs tracking-wider">
    <img src="/ui/icons/IconTiny_Stats.png" alt="Alive" class="h-4 w-4" />
    <span class="text-green-400 font-semibold">ALIVE</span>
  </div>
{:else}
  {@const iconSrc =
    position.close_reason === 'nuked'
      ? '/ui/icons/Icon_Nuke.png'
      : '/ui/icons/Icon_Coin3.png'}
  {@const colorClass =
    position.close_reason === 'nuked' ? 'text-red-400' : 'text-yellow-500'}
  {@const label = position.close_reason === 'nuked' ? 'NUKED' : 'SOLD'}

  <div class="flex gap-1 items-center font-ponzi-number text-xs tracking-wider">
    <img src={iconSrc} alt={label} class="h-4 w-4" />
    <span class={colorClass}>{label}</span>
  </div>
{/if}
