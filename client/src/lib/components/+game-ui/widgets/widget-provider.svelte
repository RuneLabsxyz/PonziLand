<script lang="ts">
  import Draggable from '$lib/components/ui/draggable.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import WidgetLandHud from './hud/widget-land-hud.svelte';
  import WidgetLandInfo from './land-info/widget-land-info.svelte';
  import WidgetMyLands from './my-lands/widget-my-lands.svelte';
  import WidgetSettings from './settings/widget-settings.svelte';
  import WidgetWallet from './wallet/widget-wallet.svelte';
  import WidgetEntityUpdate from './entity-update/widget-entity-update.svelte';
  import WidgetAuctions from './auctions/widget-auctions.svelte';
  import WidgetHelp from './help/widget-help.svelte';
  import WidgetTutorial from './tutorial/widget-tutorial.svelte';
</script>

{#each Object.entries($widgetsStore) as [id, widget]}
  {#if widget.isOpen}
    <Draggable
      {id}
      type={widget.type}
      initialPosition={widget.position}
      initialDimensions={widget.dimensions}
    >
      {@const type = widget.type}
      {#if type === 'wallet'}
        <WidgetWallet />
      {:else if type === 'land-hud'}
        <WidgetLandHud />
      {:else if type === 'land-info' && widget.data}
        <WidgetLandInfo data={widget.data} />
      {:else if type === 'settings'}
        <WidgetSettings />
      {:else if type === 'my-lands'}
        <WidgetMyLands />
      {:else if type === 'entity-update'}
        <WidgetEntityUpdate />
      {:else if type === 'auctions'}
        <WidgetAuctions />
      {:else if type === 'help'}
        <WidgetHelp />
      {:else if type === 'tutorial'}
        <WidgetTutorial />
      {/if}
    </Draggable>
  {/if}
{/each}
