<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import CopyAddress from '$lib/components/ui/copy-address.svelte';
  import type { LandWithActions } from '$lib/api/land';
  import { AI_AGENT_ADDRESSES } from '$lib/const';
  import data from '$profileData';
  import { padAddress } from '$lib/utils';

  let {
    land,
    isOwner,
  }: {
    land?: LandWithActions;
    isOwner: boolean;
  } = $props();

  let aiAgent = $state<(typeof data.aiAgents)[0] | null>(null);

  $effect(() => {
    if (land?.owner) {
      const agent = data.aiAgents.find(
        (agent) => padAddress(agent.address) === padAddress(land.owner),
      );
      aiAgent = agent || null;
    } else {
      aiAgent = null;
    }
  });
</script>

{#if isOwner}
  <div class="-translate-x-6 translate-y-2">
    <img
      src="/ui/icons/Icon_Crown.png"
      alt="owner"
      style="transform: rotate(-30deg); width: 50px"
    />
  </div>
{:else if aiAgent}
  <div class="-translate-x-6 translate-y-2">
    <img src={aiAgent.badgeImage} alt={aiAgent.name} />
  </div>
{:else}
  <Card>
    <div class="flex items-center gap-2 text-ponzi-number">
      <CopyAddress address={land?.owner || ''} showUsername={true} />
    </div>
  </Card>
{/if}

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }
</style>
