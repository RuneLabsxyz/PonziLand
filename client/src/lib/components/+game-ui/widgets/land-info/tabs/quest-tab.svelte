<script lang="ts">
  import account from '$lib/account.svelte';
  import type { LandWithActions } from '$lib/api/land';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';
  import { Button } from '$lib/components/ui/button';
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { TabType } from '$lib/interfaces';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { SetLandQuest, RemoveLandQuest, StartQuest } from '$lib/stores/store.svelte';
  import { padAddress } from '$lib/utils';
  import { type Call } from 'starknet';
  import { onMount } from 'svelte';

  let {
    land,
    activeTab = $bindable(),
    isActive = false,
  }: {
    land: LandWithActions;
    activeTab: TabType;
    isActive?: boolean;
  } = $props();

  let isOwner = $derived(
    padAddress(account.address ?? '') == padAddress(land.owner),
  );

  let hasQuest = $derived(
    land.quest_id && BigInt(land.quest_id.toString()) > 0n
  );

  let loading = $state(false);
  let accountManager = useAccount();
  let score = $state(0);
  let game_token_id = $state(0);

  // this is the action function for the mock game, it should be replaced with a redirect to the minigame for actual games
  async function handleGameActionClick() {
    if (game_token_id == 0) {
      console.log('Game Token ID is 0, getting game token id');
      getGameTokenId();
      return;
    }
    let call: Call = {
      contractAddress: "0x368e82bdb7b5308228c08015c3f9c1fccf0096cd941efb30f24110e60ffa9e",
      entrypoint: 'explore',
      calldata: [game_token_id]
    }

    let res = await accountManager!.getProvider()?.getWalletAccount()?.execute([call]);
    console.log(res);

    if (res?.transaction_hash) {
      await accountManager!.getProvider()?.getWalletAccount()?.waitForTransaction(res.transaction_hash);
    }

    loading = false;
  }

  async function handleSetQuestClick() {
    loading = true;
    console.log('Setting land as quest land');

    try {
      const result = await SetLandQuest(land.location);
      
      if (result?.transaction_hash) {
        console.log('Setting quest land with TX: ', result.transaction_hash);
        gameSounds.play('claim');

        // Wait for transaction confirmation
        await accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(result.transaction_hash);
          
        console.log('Quest land set successfully');
      }
    } catch (error) {
      console.error(
        `Error setting quest land for location ${land.location}:`,
        error,
      );
    } finally {
      loading = false;
    }
  }

  async function handleRemoveQuestClick() {
    loading = true;
    console.log('Removing quest land');

    try {
      const result = await RemoveLandQuest(land.location);
      
      if (result?.transaction_hash) {
        console.log('Removing quest land with TX: ', result.transaction_hash);
        gameSounds.play('claim');

        // Wait for transaction confirmation
        await accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(result.transaction_hash);
          
        console.log('Quest land removed successfully');
      }
    } catch (error) {
      console.error(
        `Error removing quest land for location ${land.location}:`,
        error,
      );
    } finally {
      loading = false;
    }
  }

  async function handleChallengeQuestClick() {
    loading = true;
    console.log('Challenging quest land');

    try {
      // For now, we'll use a placeholder player name
      // In a real implementation, this should come from user input or account data
      const playerName = 1; // This might need to be dynamic based on your game logic
      
      const result = await StartQuest(land.location);
      
      if (result?.transaction_hash) {
        console.log('Starting quest challenge with TX: ', result.transaction_hash);
        gameSounds.play('claim');

        // Wait for transaction confirmation
        await accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(result.transaction_hash);
          
        console.log('Quest challenge started successfully');
      }
    } catch (error) {
      console.error(
        `Error starting quest challenge for location ${land.location}:`,
        error,
      );
    } finally {
      loading = false;
    }
  }

  async function getScore() {
    let score = accountManager!.getProvider()?.getWalletAccount()?.call([
      {
        contractAddress: "0x368e82bdb7b5308228c08015c3f9c1fccf0096cd941efb30f24110e60ffa9e",
        entrypoint: 'get_score',
        calldata: [land.quest_id]
      }
    ])
    score = parseInt(score.result[0].toString());
  }

  async function getGameTokenId() {
    let gameTokenId = accountManager!.getProvider()?.getWalletAccount()?.call([
      {
        contractAddress: "0x393aa0cdcf8c9664d6b7c75eb1e216b5bac42c7bba3292966dcaae7a606bb65",
        entrypoint: 'get_quest_game_token',
        calldata: [land.quest_id]
      }
    ])
    gameTokenId = parseInt(gameTokenId.result[1].toString());
    console.log('Game Token ID: ', gameTokenId);
  }

  onMount(() => {
    getScore();
    getGameTokenId();
  })

</script>

{#if isActive}
  <div class="w-full h-full">
    <div class="mb-4">
      <h3 class="font-ponzi-number text-lg mb-2">Quest Information</h3>
      <div class="space-y-2 text-sm">
        <p><span class="font-semibold">Quest ID:</span> {land.quest_id?.toString() || '0'}</p>
        <p><span class="font-semibold">Has Quest:</span> {hasQuest ? 'Yes' : 'No'}</p>
        <p><span class="font-semibold">Owned by you:</span> {isOwner ? 'Yes' : 'No'}</p>
      </div>
    </div>

    <div class="space-y-3">
      {#if isOwner}
        {#if !hasQuest}
          <!-- Land is owned by player and has no quest - show Set as Quest Land button -->
          {#if loading}
            <Button class="w-full" disabled>
              Setting as Quest Land <ThreeDots />
            </Button>
          {:else}
            <Button
              onclick={handleSetQuestClick}
              class="w-full"
              disabled={loading}
              variant="default"
            >
              Set as Quest Land
            </Button>
          {/if}
        {:else}
          <!-- Land is owned by player and has a quest - show Remove Quest Land button -->
          {#if loading}
            <Button class="w-full" disabled>
              Removing Quest Land <ThreeDots />
            </Button>
          {:else}
            <Button
              onclick={handleRemoveQuestClick}
              class="w-full"
              disabled={loading}
              variant="destructive"
            >
              Remove Quest Land
            </Button>
          {/if}
        {/if}
      {:else if hasQuest}
        <!-- Land is not owned by player but has a quest - show Challenge Quest Land button -->
        {#if loading}
          <Button class="w-full" disabled>
            Starting Challenge <ThreeDots />
          </Button>
        {:else}
          <Button
            onclick={handleChallengeQuestClick}
            class="w-full"
            disabled={loading}
            variant="secondary"
          >
            Challenge Quest Land
          </Button>
          <Button onclick={getScore}>Get Score</Button>
          <Button onclick={handleGameActionClick}>Explore Game</Button>

          <p>Score: {score}</p>
        {/if}
      {:else}
        <!-- Land is not owned by player and has no quest - show informational message -->
        <div class="text-center text-gray-500 p-4">
          <p>This land has no quest and is not owned by you.</p>
          <p class="text-sm mt-1">Only the owner can set up a quest on this land.</p>
        </div>
      {/if}
    </div>
  </div>
{/if}
  