<script lang="ts">
  import account from '$lib/account.svelte';
  import type { LandWithActions } from '$lib/api/land';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Select from '$lib/components/ui/select';
  import Label from '$lib/components/ui/label/label.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { TabType } from '$lib/interfaces';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { SetLandQuest, RemoveLandQuest, StartQuest, GetQuestToken, GetQuestScore, ClaimQuest, GetQuestEntryPrice } from '$lib/stores/store.svelte';
  import { padAddress } from '$lib/utils';
  import { type Call, RpcProvider } from 'starknet';
  import { onMount } from 'svelte';
  import { baseToken, tokenStore } from '$lib/stores/tokens.store.svelte';
  import { getQuests, getQuestGames, getQuestDetails, getQuestDetailsFromLocation, getPlayerQuestAtLocation } from '$lib/api/quests.svelte';
  import type { QuestDetails, QuestGame } from '$lib/models.gen';

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

  let questDetails = $state<QuestDetails | null>(null);
  let hasQuest = $derived(!!questDetails);
  let loading = $state(false);
  let accountManager = useAccount();
  let score = $state(0);
  let game_token_id = $state(0);
  let entry_price = $state(0);
  let questGames = $state<QuestGame[]>([]);
  let selectedGameId = $state<string>('');
  let selectedGame = $derived(questGames.find((g: QuestGame) => g.id.toString() === selectedGameId));
  let currentQuestGame = $state<QuestGame | null>(null);
  
  // Check if game is active and what type 🐙 tentacles checking game state
  let is_active = $derived(game_token_id !== 0);
  let isOneOnOne = $derived(currentQuestGame?.quest_type?.activeVariant === 'OneOnOne');
  let isHighScore = $derived(currentQuestGame?.quest_type?.activeVariant === 'Minigame');

  // this is the action function for the mock game, it should be replaced with a redirect to the minigame for actual games
  async function handleGameActionClick() {
    if (game_token_id == 0) {
      console.log('Game Token ID is 0, getting game token id');
      getQuestInfo();
      return;
    }

    /*
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

    */
   window.location.href = 'https://caps-jam.vercel.app/#/game/' + game_token_id;
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
      getQuestInfo();
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
      getQuestInfo();
    }
  }

  async function handleChallengeQuestClick() {
    loading = true;
    console.log('Challenging quest land');

    try {
      console.log('entry_price', entry_price);
      const result = await StartQuest(land.location, entry_price);
      
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
      getQuestInfo();
    }
  }

  async function handleClaimQuestClick() {
    loading = true;
    console.log('Claiming quest');
    let result = await ClaimQuest(land.quest_id);
    console.log(result);
    if (result?.transaction_hash) {
      console.log('Claiming quest with TX: ', result.transaction_hash);
      await accountManager!
        .getProvider()
        ?.getWalletAccount()
        ?.waitForTransaction(result.transaction_hash);
    }
    gameSounds.play('claim');
    loading = false;
    getQuestInfo();
  }

  async function getQuestInfo() {
    // Always fetch quest games for the dropdown 🐙 spreading tentacles across the game universe
    const games = await getQuestGames();
    questGames = games;
    console.log('all quest games', questGames);

    let questDetails_res = await getQuestDetailsFromLocation(land.location);
    console.log('questDetails_res', questDetails_res);
    
    if (questDetails_res && questDetails_res.length > 0) {
      questDetails = questDetails_res[0];
      entry_price = parseInt(BigInt(questDetails.entry_price).toString());
      console.log('entry_price', entry_price);
      
      // Find the current quest game
      currentQuestGame = questGames.find((g: QuestGame) => g.id.toString() === questDetails.game_id.toString()) || null;
      console.log('currentQuestGame', currentQuestGame);
      console.log('isOneOnOne', currentQuestGame?.quest_type?.activeVariant === 'OneOnOne');
      console.log('isHighScore', currentQuestGame?.quest_type?.activeVariant === 'Minigame');

      let player_quest_res = await getPlayerQuestAtLocation(account.address, land.location);
      console.log('player quest', player_quest_res);
      
      if (player_quest_res && player_quest_res.length > 0) {
        let quest_id = player_quest_res[0].id;
        console.log('quest_id', quest_id);
        let score_res = await GetQuestScore(quest_id);
        console.log('score_res', score_res);
        score = parseInt(BigInt(score_res).toString());
        console.log('score set to:', score);
        let token_res = await GetQuestToken(quest_id);
        console.log('token_res', token_res);
        game_token_id = parseInt(BigInt(token_res[1]).toString());
        console.log('game_token_id set to:', game_token_id);
      } else {
        // Reset if no player quest found
        console.log('No player quest found, resetting score and game_token_id');
        score = 0;
        game_token_id = 0;
      }
    } else {
      console.log('No quest details found, resetting everything');
      questDetails = null;
      currentQuestGame = null;
      score = 0;
      game_token_id = 0;
    }
  }

  onMount(() => {
    getQuestInfo();
  })

</script>

{#if isActive}
  <div class="w-full h-full">
    {#if isOwner}
      {#if !hasQuest}
        <!-- Land is owned by player and has no quest - show quest game selector 🐙 -->
        <Label class="font-ponzi-number">Select Quest Game</Label>
        <p class="-mt-1 mb-1 opacity-75 leading-none">
          Choose a quest game to challenge other players
        </p>
        <Select.Root bind:selected={selectedGameId}>
          <Select.Trigger class="w-full">
            <Select.Value placeholder="Choose a quest game..." />
          </Select.Trigger>
          <Select.Content>
            {#each questGames as game}
              <Select.Item value={game.id.toString()}>
                {game.game_contract_name} (ID: {game.id.toString()})
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>

        {#if selectedGame}
          <div class="mt-4 space-y-2">
            <Label class="font-ponzi-number">Game Details</Label>
            <div class="grid grid-cols-2 gap-2 text-xs opacity-75">
              <div>
                <span>Contract:</span>
                <p class="font-mono truncate">{selectedGame.game_contract_name}</p>
              </div>
              <div>
                <span>Namespace:</span>
                <p class="font-mono truncate">{selectedGame.namespace}</p>
              </div>
              <div>
                <span>Target Score:</span>
                <p class="font-semibold">{selectedGame.target_score.toString()}</p>
              </div>
              <div>
                <span>Quest Type:</span>
                <p class="font-semibold">{selectedGame.quest_type?.activeVariant || 'Unknown'}</p>
              </div>
            </div>
            <p class="text-xs opacity-75 leading-none">
              Players will need to achieve the target score to complete this quest and earn rewards!
            </p>
          </div>
        {/if}

        {#if loading}
          <Button class="mt-3 w-full" disabled>
            Setting as Quest Land <ThreeDots />
          </Button>
        {:else}
          <Button
            onclick={handleSetQuestClick}
            class="mt-3 w-full"
            disabled={loading || !selectedGameId}
            variant="default"
          >
            Set as Quest Land
          </Button>
        {/if}
      {:else}
        <!-- Land is owned by player and has a quest - show management options -->
        <Label class="font-ponzi-number">Quest Land Management</Label>
        <p class="-mt-1 mb-1 opacity-75 leading-none">
          Your land is currently hosting a quest
        </p>
        
        <div class="grid grid-cols-2 gap-3 text-sm mt-3">
          <div>
            <Label>Participants</Label>
            <p class="font-semibold">{questDetails?.participant_count.toString()} / {questDetails?.capacity.toString()}</p>
          </div>
          <div>
            <Label>Entry Price</Label>
            <p class="font-semibold">{entry_price} {baseToken.symbol}</p>
          </div>
          <div>
            <Label>Target Score</Label>
            <p class="font-semibold">{questDetails?.target_score.toString()}</p>
          </div>
          <div>
            <Label>Game ID</Label>
            <p class="font-semibold">{questDetails?.game_id.toString()}</p>
          </div>
        </div>

        {#if loading}
          <Button class="mt-3 w-full" disabled>
            Removing Quest Land <ThreeDots />
          </Button>
        {:else}
          <Button
            onclick={handleRemoveQuestClick}
            class="mt-3 w-full"
            disabled={loading}
            variant="destructive"
          >
            Remove Quest Land
          </Button>
        {/if}
      {/if}
    {:else if hasQuest}
      <!-- Land is not owned by player but has a quest - show challenge interface 🐙 -->
      <!-- Debug info -->
      <div class="text-xs opacity-50 mb-2">
        DEBUG: game_token_id={game_token_id}, score={score}, is_active={is_active}, isOneOnOne={isOneOnOne}, isHighScore={isHighScore}
      </div>
      
      <Label class="font-ponzi-number">
        {isOneOnOne ? '1v1 Quest Challenge' : 'Quest Challenge'}
      </Label>
      <p class="-mt-1 mb-1 opacity-75 leading-none">
        {isOneOnOne ? 'Challenge the land owner in a 1v1 match!' : 'Test your skills and complete this quest!'}
      </p>

      <div class="grid grid-cols-2 gap-3 text-sm mt-3">
        <div>
          <Label>Entry Price</Label>
          <p class="font-bold text-lg text-yellow-500">{entry_price} {baseToken.symbol}</p>
        </div>
        {#if isHighScore}
          <div>
            <Label>Target Score</Label>
            <p class="font-bold text-lg">{questDetails?.target_score.toString()}</p>
          </div>
        {:else if isOneOnOne}
          <div>
            <Label>Game Type</Label>
            <p class="font-bold text-lg">1v1 Match</p>
          </div>
        {/if}
        <div>
          <Label>Capacity</Label>
          <p class="font-semibold">{questDetails?.participant_count.toString()} / {questDetails?.capacity.toString()}</p>
        </div>
        <div>
          <Label>Game ID</Label>
          <p class="font-semibold">{questDetails?.game_id.toString()}</p>
        </div>
      </div>

      {#if is_active}
        {#if isHighScore}
          <!-- High Score Game: Show progress bar -->
          <div class="mt-4">
            <div class="flex justify-between items-center mb-2">
              <Label>Your Progress</Label>
              <span class="text-sm font-bold">{score} / {questDetails?.target_score.toString()}</span>
            </div>
            <div class="w-full bg-muted rounded-full h-3 border">
              <div 
                class="bg-primary h-3 rounded-full transition-all duration-300" 
                style="width: {Math.min(100, (score / Number(questDetails?.target_score || 1)) * 100)}%"
              ></div>
            </div>
          </div>
        {:else if isOneOnOne}
          <!-- 1v1 Game: Show game status -->
          <div class="mt-4 text-center p-4 border rounded">
            {#if score === 0}
              <p class="text-lg font-bold">⚔️ Game Active</p>
              <p class="text-xs opacity-75">Your match is in progress</p>
            {:else if score === 1}
              <p class="text-lg font-bold">🎉 Game Complete</p>
              <p class="text-xs opacity-75">Ready to claim or settle</p>
            {/if}
          </div>
        {/if}
      {/if}

      <div class="mt-3">
        {#if loading}
          <Button class="w-full" disabled>
            <ThreeDots />
          </Button>
        {:else}
          {#if !is_active}
            <Button
              onclick={handleChallengeQuestClick}
              class="w-full"
              disabled={loading}
            >
              CHALLENGE FOR <span class="text-yellow-500">&nbsp;{entry_price}&nbsp;</span>{baseToken.symbol}
            </Button>
          {:else}
            {#if isHighScore}
              <!-- High Score Game Buttons -->
              <Button
                onclick={handleGameActionClick}
                class="w-full mb-2"
                disabled={loading}
                variant="default"
              >
                CONTINUE QUEST
              </Button>
              {#if score >= Number(questDetails?.target_score || 0)}
                <Button
                  onclick={handleClaimQuestClick}
                  class="w-full mb-2"
                  disabled={loading}
                  variant="secondary"
                >
                  🏆 CLAIM REWARD
                </Button>
              {/if}
            {:else if isOneOnOne}
              <!-- 1v1 Game Buttons -->
              {#if score === 0}
                <Button
                  onclick={handleGameActionClick}
                  class="w-full mb-2"
                  disabled={loading}
                  variant="default"
                >
                  ⚔️ CONTINUE MATCH
                </Button>
              {:else if score === 1}
                <Button
                  onclick={handleClaimQuestClick}
                  class="w-full mb-2"
                  disabled={loading}
                  variant="secondary"
                >
                  🏆 CLAIM / SETTLE
                </Button>
              {/if}
            {/if}
          {/if}
          <Button
            onclick={getQuestInfo}
            class="w-full"
            disabled={loading}
            variant="outline"
          >
            Refresh Quest Info
          </Button>
        {/if}
      </div>
    {:else}
      <!-- Land is not owned by player and has no quest -->
      <div class="text-center opacity-75 space-y-2 p-4">
        <p>This land has no active quest</p>
        <p class="text-sm">Only the owner can set up a quest on this land.</p>
      </div>
    {/if}
  </div>
{/if}
  