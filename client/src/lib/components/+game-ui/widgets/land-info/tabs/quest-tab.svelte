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
  import {
    SetLandQuest,
    RemoveLandQuest,
    StartQuest,
    GetQuestToken,
    GetQuestScore,
    ClaimQuest,
    GetQuestEntryPrice,
  } from '$lib/stores/quests.svelte';
  import { padAddress } from '$lib/utils';
  import { type Call, RpcProvider } from 'starknet';
  import { onMount } from 'svelte';
  import { getBaseToken } from '$lib/stores/wallet.svelte';
  import {
    getQuests,
    getQuestGames,
    getQuestDetails,
    getQuestDetailsFromLocation,
    getPlayerQuestAtLocation,
  } from '$lib/api/quests.svelte';
  import type { QuestDetails, QuestGame } from '$lib/models.gen';
  import type { Token } from '$lib/interfaces';
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
  let selectedGame = $derived(
    questGames.find((g: QuestGame) => g.id.toString() === selectedGameId),
  );
  let currentQuestGame = $state<QuestGame | null>(null);
  let baseToken = $state<Token | null>(null);
  let is_quest_over = $state(false); // 🐙 tentacles tracking if the quest ended
  // Check if game is active and what type 🐙 tentacles checking game state
  let is_active = $derived(game_token_id !== 0);
  let isOneOnOne = $derived(currentQuestGame?.quest_type === 'OneOnOne');
  let isHighScore = $derived(currentQuestGame?.quest_type === 'Minigame');
  let isDeathMountain = $derived(
    currentQuestGame?.game_name?.toLowerCase().includes('death') ||
      currentQuestGame?.game_name?.toLowerCase().includes('mountain'),
  );
  let hasWon = $derived(
    isHighScore
      ? score >= Number(questDetails?.target_score || 0)
      : score === 1,
  );
  let hasFailed = $derived(is_quest_over && !hasWon);
  // Start Death Mountain game 🐙 tentacles awakening the mountain
  async function handleStartDeathMountainGame() {
    if (game_token_id == 0) {
      console.log('Game Token ID is 0, cannot start game');
      return;
    }

    loading = true;
    try {
      let call: Call = {
        contractAddress:
          '0x38197b89d5c2e676d06aa93cf97b5be9ee4bf2b13ba972de4997f931f3559ee',
        entrypoint: 'start_game',
        calldata: [game_token_id, 76],
      };

      let res = await accountManager!
        .getProvider()
        ?.getWalletAccount()
        ?.execute([call]);
      console.log('Death Mountain start_game result:', res);

      if (res?.transaction_hash) {
        await accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(res.transaction_hash);
      }
    } catch (error) {
      console.error('Error starting death mountain game:', error);
    } finally {
      loading = false;
      getQuestInfo();
    }
  }

  // Route to different games based on quest game type 🐙 tentacles reaching into multiple game dimensions
  async function handleGameActionClick() {
    if (game_token_id == 0) {
      console.log('Game Token ID is 0, getting game token id');
      getQuestInfo();
      return;
    }

    const gameName = currentQuestGame?.game_name?.toLowerCase() || '';
    console.log('Launching game:', gameName, 'with token ID:', game_token_id);

    // Caps Jam - redirect to web game
    if (gameName.includes('caps')) {
      window.location.href =
        'https://caps-jam.vercel.app/#/game/' + game_token_id;
    }
    // Mock Game - execute contract call
    else if (gameName.includes('mock')) {
      loading = true;
      try {
        let call: Call = {
          contractAddress:
            '0x368e82bdb7b5308228c08015c3f9c1fccf0096cd941efb30f24110e60ffa9e',
          entrypoint: 'explore',
          calldata: [game_token_id],
        };

        let res = await accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.execute([call]);
        console.log(res);

        if (res?.transaction_hash) {
          await accountManager!
            .getProvider()
            ?.getWalletAccount()
            ?.waitForTransaction(res.transaction_hash);
        }
      } catch (error) {
        console.error('Error executing mock game:', error);
      } finally {
        loading = false;
        getQuestInfo();
      }
    }
    // Death Mountain - redirect to play 🐙 tentacles reaching into the mountain
    else if (
      gameName.toLowerCase().includes('death') ||
      gameName.toLowerCase().includes('mountain')
    ) {
      window.location.href =
        'https://survivor.ponzis.fun/survivor/play?id=' + game_token_id;
    }
    // Fallback for unknown games
    else {
      console.warn('Unknown game type:', gameName);
      alert('This game is not yet configured. Coming soon! 🐙');
    }
  }

  async function handleSetQuestClick() {
    loading = true;
    console.log('Setting land as quest land with game ID:', selectedGameId);

    try {
      const gameId = parseInt(selectedGameId.value);
      console.log('gameId', gameId);
      const result = await SetLandQuest(land.location, gameId);

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
        console.log(
          'Starting quest challenge with TX: ',
          result.transaction_hash,
        );
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
    let player_quest_res = await getPlayerQuestAtLocation(
      account.address,
      land.location,
    );
    let quest_id = player_quest_res[0].id;
    console.log('quest_id', quest_id);
    let result = await ClaimQuest(quest_id);
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
      currentQuestGame =
        questGames.find(
          (g: QuestGame) => g.id.toString() === questDetails.game_id.toString(),
        ) || null;

      let player_quest_res = await getPlayerQuestAtLocation(
        account.address,
        land.location,
      );
      console.log('player quest', player_quest_res);

      if (player_quest_res && player_quest_res.length > 0) {
        let quest_id = player_quest_res[0].id;
        console.log('quest_id', quest_id);
        let score_res = await GetQuestScore(quest_id);
        console.log('score_res', score_res);
        score = parseInt(BigInt(score_res[0]).toString());
        is_quest_over =
          score_res[1] == 1 ||
          (currentQuestGame.quest_type == 'Minigame' &&
            score >= Number(questDetails?.target_score));
        console.log('score set to:', score, 'is_quest_over:', is_quest_over);
        let token_res = await GetQuestToken(quest_id);
        console.log('token_res', token_res);
        game_token_id = parseInt(BigInt(token_res[1]).toString());
        console.log('game_token_id set to:', game_token_id);
        console.log('isDeathMountain', isDeathMountain);
      } else {
        // Reset if no player quest found
        console.log('No player quest found, resetting score and game_token_id');
        score = 0;
        game_token_id = 0;
        is_quest_over = false;
      }
    } else {
      console.log('No quest details found, resetting everything');
      questDetails = null;
      currentQuestGame = null;
      score = 0;
      game_token_id = 0;
      is_quest_over = false;
    }
  }

  onMount(() => {
    baseToken = getBaseToken() as Token;
    getQuestInfo();
  });

  $effect(() => {
    console.log('is_active', is_active);
    console.log('game_token_id', game_token_id);
    console.log('isDeathMountain', isDeathMountain);
  });
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
          <Select.Trigger class="w-full bg-white text-black">
            <Select.Value placeholder="Choose a quest game..." />
          </Select.Trigger>
          <Select.Content class="bg-white text-black border border-gray-300">
            {#each questGames as game}
              <Select.Item
                value={game.id.toString()}
                class="text-black hover:bg-gray-100 cursor-pointer"
              >
                {game.game_name} ({game.quest_type})
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>

        {#if selectedGame}
          <div class="mt-4 space-y-3">
            <!-- Prominent Game Display 🐙 tentacles showing off the game -->
            <div
              class="text-center p-3 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg border-2 border-primary/40"
            >
              <p class="text-xl font-bold font-ponzi-number">
                {selectedGame.game_name}
              </p>
              <p class="text-xs opacity-75 mt-1">
                {selectedGame.quest_type?.activeVariant || 'Quest'} Challenge
              </p>
            </div>

            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="text-center p-2 bg-muted/50 rounded border">
                <Label class="text-xs">Target Score</Label>
                <p class="font-bold text-lg">
                  {selectedGame.target_score.toString()}
                </p>
              </div>
              <div class="text-center p-2 bg-muted/50 rounded border">
                <Label class="text-xs">Quest Type</Label>
                <p class="font-bold text-sm">
                  {selectedGame.quest_type?.activeVariant || 'Unknown'}
                </p>
              </div>
            </div>

            <p class="text-xs opacity-75 leading-tight text-center">
              Players will need to achieve the target score to complete this
              quest and earn rewards! 🎮
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
        <p class="-mt-1 mb-2 opacity-75 leading-none">
          Your land is currently hosting a quest
        </p>

        <!-- Prominent Game Name 🐙 -->
        <div
          class="text-center mb-3 p-3 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg border-2 border-primary/40"
        >
          <p class="text-xl font-bold font-ponzi-number">
            {currentQuestGame?.game_name || 'Unknown Game'}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="text-center p-2 bg-muted/50 rounded border">
            <Label class="text-xs">Players</Label>
            <p class="font-bold text-lg">
              {questDetails?.participant_count.toString()} / {questDetails?.capacity.toString()}
            </p>
          </div>
          <div class="text-center p-2 bg-muted/50 rounded border">
            <Label class="text-xs">Target Score</Label>
            <p class="font-bold text-lg">
              {questDetails?.target_score.toString()}
            </p>
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

      <!-- Prominent Game Name Display 🐙 tentacles reaching for glory -->
      <div
        class="text-center mb-4 p-3 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg border-2 border-primary/40"
      >
        <p class="text-2xl font-bold font-ponzi-number tracking-wide">
          {currentQuestGame?.game_name || 'Unknown Game'}
        </p>
        <p class="text-sm opacity-75 mt-1">
          {isOneOnOne ? '⚔️ 1v1 Quest Challenge' : '🎮 Quest Challenge'}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3 text-sm">
        {#if isHighScore}
          <div class="text-center p-3 bg-muted/50 rounded border">
            <Label class="text-xs">Target Score</Label>
            <p class="font-bold text-2xl mt-1">
              {questDetails?.target_score.toString()}
            </p>
          </div>
        {:else if isOneOnOne}
          <div class="text-center p-3 bg-muted/50 rounded border">
            <Label class="text-xs">Game Type</Label>
            <p class="font-bold text-lg mt-1">1v1 Match</p>
          </div>
        {/if}
        <div class="text-center p-3 bg-muted/50 rounded border">
          <Label class="text-xs">Players</Label>
          <p class="font-bold text-lg mt-1">
            {questDetails?.participant_count.toString()} / {questDetails?.capacity.toString()}
          </p>
        </div>
      </div>

      {#if is_active}
        {#if isHighScore}
          <!-- High Score Game: Show progress bar -->
          <div class="mt-4">
            <div class="flex justify-between items-center mb-2">
              <Label>Your Progress</Label>
              <span class="text-sm font-bold"
                >{score} / {questDetails?.target_score.toString()}</span
              >
            </div>
            <div class="w-full bg-muted rounded-full h-3 border">
              <div
                class="bg-primary h-3 rounded-full transition-all duration-300"
                style="width: {Math.min(
                  100,
                  (score / Number(questDetails?.target_score || 1)) * 100,
                )}%"
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
              CHALLENGE FOR <span class="text-yellow-500"
                >&nbsp;{entry_price}&nbsp;</span
              >{baseToken.symbol}
            </Button>
          {:else if isHighScore}
            <!-- High Score Game Buttons -->
            {#if !is_quest_over}
              <Button
                onclick={handleGameActionClick}
                class="w-full mb-2"
                disabled={loading}
                variant="default"
              >
                CONTINUE QUEST
              </Button>
            {/if}
            {#if is_quest_over}
              {#if hasWon}
                <div
                  class="mb-2 p-2 text-center border rounded bg-green-500/10 border-green-500"
                >
                  <p class="text-lg font-bold text-green-500">
                    🎉 Quest Complete!
                  </p>
                  <p class="text-xs opacity-75">
                    You've achieved the target score!
                  </p>
                </div>
                <Button
                  onclick={handleClaimQuestClick}
                  class="w-full mb-2"
                  disabled={loading}
                  variant="secondary"
                >
                  🏆 CLAIM REWARD
                </Button>
              {:else}
                <!-- Death Mountain special case: score 0 means game needs to be started 🐙 -->
                {#if isDeathMountain && score === 0}
                  <div
                    class="mb-2 p-2 text-center border rounded bg-orange-500/10 border-orange-500"
                  >
                    <p class="text-lg font-bold text-orange-500">
                      ⛰️ Ready to Start
                    </p>
                    <p class="text-xs opacity-75">
                      Begin your Death Mountain adventure!
                    </p>
                  </div>
                  <Button
                    onclick={handleStartDeathMountainGame}
                    class="w-full mb-2"
                    disabled={loading}
                    variant="default"
                  >
                    🏔️ START GAME
                  </Button>
                {:else}
                  <div
                    class="mb-2 p-2 text-center border rounded bg-red-500/10 border-red-500"
                  >
                    <p class="text-lg font-bold text-red-500">
                      😢 Quest Failed
                    </p>
                    <p class="text-xs opacity-75">
                      You didn't reach the target score
                    </p>
                  </div>
                  <Button
                    onclick={handleClaimQuestClick}
                    class="w-full mb-2"
                    disabled={loading}
                    variant="outline"
                  >
                    CLAIM (No Reward)
                  </Button>
                {/if}
              {/if}
            {/if}
          {:else if isOneOnOne}
            <!-- 1v1 Game Buttons -->
            {#if !is_quest_over}
              <Button
                onclick={handleGameActionClick}
                class="w-full mb-2"
                disabled={loading}
                variant="default"
              >
                ⚔️ CONTINUE MATCH
              </Button>
            {/if}
            {#if is_quest_over}
              {#if hasWon}
                <div
                  class="mb-2 p-2 text-center border rounded bg-green-500/10 border-green-500"
                >
                  <p class="text-lg font-bold text-green-500">⚔️ Victory!</p>
                  <p class="text-xs opacity-75">You won the 1v1 match!</p>
                </div>
                <Button
                  onclick={handleClaimQuestClick}
                  class="w-full mb-2"
                  disabled={loading}
                  variant="secondary"
                >
                  🏆 CLAIM / SETTLE
                </Button>
              {:else}
                <div
                  class="mb-2 p-2 text-center border rounded bg-red-500/10 border-red-500"
                >
                  <p class="text-lg font-bold text-red-500">💀 Defeat</p>
                  <p class="text-xs opacity-75">You lost the 1v1 match</p>
                </div>
                <Button
                  onclick={handleClaimQuestClick}
                  class="w-full mb-2"
                  disabled={loading}
                  variant="outline"
                >
                  SETTLE (No Reward)
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
