<script lang="ts">
  import Draggable from '$lib/components/ui/draggable.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import WidgetLandHud from './hud/widget-land-hud.svelte';
  import WidgetLandInfo from './land-info/widget-land-info.svelte';
  import WidgetMyLands from './my-lands/widget-my-lands.svelte';
  import WidgetSettings from './settings/widget-settings.svelte';
  import WidgetWallet from './wallet/widget-wallet.svelte';
  import WidgetEntityUpdate from './entity-update/widget-entity-update.svelte';
  import WidgetMarket from './market/widget-market.svelte';
  import WidgetHelp from './help/widget-help.svelte';
  import WidgetTutorial from './tutorial/widget-tutorial.svelte';
  import WidgetNftLink from './nft-link/widget-nft-link.svelte';
  import WidgetGuild from './guild/widget-guild.svelte';
  import WidgetLeaderboard from './leaderboard/Leaderboard.svelte';
  import WidgetHeatmap from './heatmap/widget-heatmap.svelte';
  import WidgetSwap from './swap/widget-swap.svelte';
</script>

{#each Object.entries($widgetsStore) as [id, widget]}
  {#if widget.isOpen}
    <Draggable
      {id}
      type={widget.type}
      initialPosition={widget.position}
      initialDimensions={widget.dimensions}
      bind:isMinimized={widget.isMinimized}
      disableResize={widget.disableResize}
    >
      {#snippet children({ setCustomControls, setCustomTitle })}
        {@const type = widget.type}
        {#if type === 'wallet'}
          <WidgetWallet {setCustomControls} />
        {:else if type === 'land-hud'}
          <WidgetLandHud {setCustomTitle} />
        {:else if type === 'land-info' && widget.data}
          <WidgetLandInfo data={widget.data} />
        {:else if type === 'settings'}
          <WidgetSettings />
        {:else if type === 'my-lands'}
          <WidgetMyLands />
        {:else if type === 'entity-update'}
          <WidgetEntityUpdate />
        {:else if type === 'market'}
          <WidgetMarket />
        {:else if type === 'help'}
          <WidgetHelp />
        {:else if type === 'tutorial'}
          <WidgetTutorial />
        {:else if type === 'nft-link'}
          <WidgetNftLink />
        {:else if type === 'guild'}
          <WidgetGuild />
        {:else if type === 'leaderboard'}
          <WidgetLeaderboard />
        {:else if type === 'heatmap'}
          <WidgetHeatmap />
        {:else if type === 'swap'}
          <WidgetSwap />
        {/if}
      {/snippet}
    </Draggable>
  {/if}
{/each}
