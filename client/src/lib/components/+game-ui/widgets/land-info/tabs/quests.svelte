<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import type { TabType } from '$lib/interfaces';
  import account from '$lib/account.svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    SetLandQuest,
    RemoveLandQuest,
    ClaimReward,
  } from '$lib/stores/store.svelte';

  let {
    land,
    activeTab = $bindable(),
    isActive = false,
  }: {
    land: LandWithActions;
    activeTab: TabType;
    isActive?: boolean;
  } = $props();

  const take_turn = () => account.sessionAccount!.execute({
    contractAddress:
      '0x453816140b9fc12c9b32247f97cb4265c3e4389f7a35927229fb4acaed3e80b',
    entrypoint: 'startQuest',
    calldata: [land.quest_id],
  });
</script>

<div class="w-full h-full">
  <p>Quests</p>
  {#if land.owner == account.address && land.quest_id == 0}
    <Button onclick={() => SetLandQuest(land.location)}
      >Set as Quest Land</Button
    >
  {:else if land.owner == account.address && land.quest_id != 0}
    <Button onclick={() => RemoveLandQuest(land.location)}
      >Unset as Quest Land</Button
    >
  {:else if land.owner != account.address && land.quest_id != 0}
    <Button onclick={() => take_turn()}
      >Play. (This would redirect to the embedded game's frontend)</Button
    >
    <Button onclick={() => ClaimReward(Number(land.quest_id))}>Claim Reward</Button
    >
  {:else if land.owner != account.address && land.quest_id == 0}
    <p>This land is not a quest land</p>
  {/if}
</div>
