<script lang="ts">
  import type { Snippet } from 'svelte';
  import WidgetLandHud from './hud/widget-land-hud.svelte';
  import WidgetLandInfo from './land-info/widget-land-info.svelte';
  import WidgetMyLands from './my-lands/widget-my-lands.svelte';
  import WidgetSettings from './settings/widget-settings.svelte';
  import WidgetWallet from './wallet/widget-wallet.svelte';
  import WidgetEntityUpdate from './entity-update/widget-entity-update.svelte';
  import WidgetMarket from './market/widget-market.svelte';
  import WidgetHelp from './help/widget-help.svelte';
  import WidgetNftLink from './nft-link/widget-nft-link.svelte';
  import WidgetGuild from './guild/widget-guild.svelte';
  import { ENABLE_GUILD } from '$lib/flags';
  import WidgetLeaderboard from './leaderboard/widget-leaderboard.svelte';
  import WidgetHeatmap from './heatmap/widget-heatmap.svelte';
  import WidgetSwap from './swap/widget-swap.svelte';
  import WidgetDisclaimer from './disclaimer/widget-disclaimer.svelte';
  import WidgetCommandCenter from './command-center/widget-command-center.svelte';
  import WidgetShare from './share/widget-share.svelte';
  import WidgetTournament from './tournament/widget-tournament.svelte';
  import WidgetUsername from './username/widget-username.svelte';
  import WidgetHistory from './history/widget-history.svelte';

  type Props = {
    type: string;
    data?: Record<string, any>;
    setCustomControls?: (controls: Snippet<[]> | null) => void;
    setCustomTitle?: (title: Snippet<[]> | null) => void;
  };

  let {
    type,
    data,
    setCustomControls = () => {},
    setCustomTitle = () => {},
  }: Props = $props();
</script>

{#if type === 'wallet'}
  <WidgetWallet {setCustomControls} />
{:else if type === 'land-hud'}
  <WidgetLandHud {setCustomTitle} {setCustomControls} />
{:else if type === 'land-info' && data}
  <WidgetLandInfo {data} />
{:else if type === 'settings'}
  <WidgetSettings />
{:else if type === 'my-lands'}
  <WidgetMyLands {setCustomTitle} {setCustomControls} />
{:else if type === 'entity-update'}
  <WidgetEntityUpdate />
{:else if type === 'market'}
  <WidgetMarket {setCustomControls} />
{:else if type === 'help'}
  <WidgetHelp />
{:else if type === 'nft-link'}
  <WidgetNftLink />
{:else if type === 'guild' && ENABLE_GUILD}
  <WidgetGuild />
{:else if type === 'leaderboard'}
  <WidgetLeaderboard {setCustomControls} />
{:else if type === 'data-maps'}
  <WidgetHeatmap />
{:else if type === 'swap'}
  <WidgetSwap {data} />
{:else if type === 'disclaimer'}
  <WidgetDisclaimer />
{:else if type === 'command-center'}
  <WidgetCommandCenter {setCustomTitle} {setCustomControls} />
{:else if type === 'share'}
  <WidgetShare position={data?.position} />
{:else if type === 'tournament'}
  <WidgetTournament {setCustomTitle} {setCustomControls} />
{:else if type === 'username'}
  <WidgetUsername />
{:else if type === 'history'}
  <WidgetHistory />
{/if}
