<script lang="ts">
  import account from '$lib/account.svelte';
  import type { LandWithActions } from '$lib/api/land';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import * as Select from '$lib/components/ui/select';
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
    questGames = await getQuestGames();
    console.log('all quest games', questGames);

    let questDetails_res = await getQuestDetailsFromLocation(land.location);
    console.log(questDetails_res);
    
    if (questDetails_res && questDetails_res.length > 0) {
      questDetails = questDetails_res[0];
      entry_price = parseInt(BigInt(questDetails.entry_price).toString());
      console.log('entry_price', entry_price);

      let player_quest_res = await getPlayerQuestAtLocation(account.address, land.location);
      console.log('player quest', player_quest_res);
      
      if (player_quest_res && player_quest_res.length > 0) {
        let quest_id = player_quest_res[0].id;
        console.log('quest_id', quest_id);
        let score_res = await GetQuestScore(quest_id);
        console.log(score_res);
        score = parseInt(BigInt(score_res).toString());
        let token_res = await GetQuestToken(quest_id);
        console.log(token_res);
        game_token_id = parseInt(BigInt(token_res[1]).toString());
        console.log(game_token_id);
      }
    } else {
      questDetails = null;
    }
  }

  onMount(() => {
    getQuestInfo();
  })

</script>

{#if isActive}
  <div class="w-full h-full p-2">
    {#if isOwner}
      {#if !hasQuest}
        <!-- Land is owned by player and has no quest - show quest game selector 🐙 -->
        <Card class="border-2">
          <CardHeader>
            <CardTitle class="text-xl">Setup Quest Land</CardTitle>
            <CardDescription>Choose a quest game to challenge other players</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-semibold">Select Quest Game</label>
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
            </div>

            {#if selectedGame}
              <div class="space-y-3 p-4 bg-muted/30 rounded-lg border">
                <h4 class="font-semibold text-sm">Game Details</h4>
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span class="text-muted-foreground">Contract:</span>
                    <p class="font-mono truncate">{selectedGame.game_contract_name}</p>
                  </div>
                  <div>
                    <span class="text-muted-foreground">Namespace:</span>
                    <p class="font-mono truncate">{selectedGame.namespace}</p>
                  </div>
                  <div>
                    <span class="text-muted-foreground">Target Score:</span>
                    <p class="font-semibold">{selectedGame.target_score.toString()}</p>
                  </div>
                  <div>
                    <span class="text-muted-foreground">Quest Type:</span>
                    <p class="font-semibold">{selectedGame.quest_type}</p>
                  </div>
                </div>
                <div class="text-xs text-muted-foreground">
                  <p>Players will need to achieve the target score to complete this quest and earn rewards!</p>
                </div>
              </div>

              {#if loading}
                <Button class="w-full" disabled>
                  Setting as Quest Land <ThreeDots />
                </Button>
              {:else}
                <Button
                  onclick={handleSetQuestClick}
                  class="w-full"
                  disabled={loading || !selectedGameId}
                  variant="default"
                >
                  Set as Quest Land
                </Button>
              {/if}
            {/if}
          </CardContent>
        </Card>
      {:else}
        <!-- Land is owned by player and has a quest - show management options -->
        <Card class="border-2 border-primary/50">
          <CardHeader>
            <CardTitle class="text-xl">Quest Land Management</CardTitle>
            <CardDescription>Your land is currently hosting a quest</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="space-y-1">
                <span class="text-muted-foreground">Participants</span>
                <p class="font-semibold text-lg">{questDetails?.participant_count.toString()} / {questDetails?.capacity.toString()}</p>
              </div>
              <div class="space-y-1">
                <span class="text-muted-foreground">Entry Price</span>
                <p class="font-semibold text-lg">{entry_price} {baseToken.symbol}</p>
              </div>
              <div class="space-y-1">
                <span class="text-muted-foreground">Target Score</span>
                <p class="font-semibold text-lg">{questDetails?.target_score.toString()}</p>
              </div>
              <div class="space-y-1">
                <span class="text-muted-foreground">Game ID</span>
                <p class="font-semibold text-lg">{questDetails?.game_id.toString()}</p>
              </div>
            </div>

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
          </CardContent>
        </Card>
      {/if}
    {:else if hasQuest}
      <!-- Land is not owned by player but has a quest - show challenge interface 🐙 -->
      <Card class="border-2 border-accent">
        <CardHeader>
          <CardTitle class="text-xl">Quest Challenge</CardTitle>
          <CardDescription>Test your skills and complete this quest!</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="bg-accent/10 p-4 rounded-lg border border-accent/30 space-y-3">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="space-y-1">
                <span class="text-muted-foreground">Entry Price</span>
                <p class="font-bold text-xl text-accent">{entry_price} {baseToken.symbol}</p>
              </div>
              <div class="space-y-1">
                <span class="text-muted-foreground">Target Score</span>
                <p class="font-bold text-xl">{questDetails?.target_score.toString()}</p>
              </div>
              <div class="space-y-1">
                <span class="text-muted-foreground">Capacity</span>
                <p class="font-semibold">{questDetails?.participant_count.toString()} / {questDetails?.capacity.toString()}</p>
              </div>
              <div class="space-y-1">
                <span class="text-muted-foreground">Game ID</span>
                <p class="font-semibold">{questDetails?.game_id.toString()}</p>
              </div>
            </div>
          </div>

          {#if game_token_id > 0}
            <div class="bg-primary/10 p-3 rounded-lg border border-primary/30">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-semibold">Your Progress</span>
                <span class="text-lg font-bold">{score} / {questDetails?.target_score.toString()}</span>
              </div>
              <div class="w-full bg-muted rounded-full h-2">
                <div 
                  class="bg-primary h-2 rounded-full transition-all duration-300" 
                  style="width: {Math.min(100, (score / Number(questDetails?.target_score || 1)) * 100)}%"
                ></div>
              </div>
            </div>
          {/if}

          <div class="space-y-2">
            {#if loading}
              <Button class="w-full" disabled>
                <ThreeDots />
              </Button>
            {:else}
              {#if game_token_id === 0}
                <Button
                  onclick={handleChallengeQuestClick}
                  class="w-full h-12 text-lg font-bold"
                  disabled={loading}
                  variant="default"
                >
                  Challenge ({entry_price} {baseToken.symbol})
                </Button>
              {:else}
                <Button
                  onclick={handleGameActionClick}
                  class="w-full h-12 text-lg font-bold"
                  disabled={loading}
                  variant="default"
                >
                  Continue Quest
                </Button>
                {#if score >= Number(questDetails?.target_score || 0)}
                  <Button
                    onclick={handleClaimQuestClick}
                    class="w-full h-10"
                    disabled={loading}
                    variant="secondary"
                  >
                    🏆 Claim Reward
                  </Button>
                {/if}
              {/if}
              <Button
                onclick={getQuestInfo}
                class="w-full h-10"
                disabled={loading}
                variant="outline"
              >
                Refresh
              </Button>
            {/if}
          </div>
        </CardContent>
      </Card>
    {:else}
      <!-- Land is not owned by player and has no quest -->
      <Card class="border-2 border-muted">
        <CardContent class="pt-6">
          <div class="text-center text-muted-foreground space-y-2">
            <p class="text-lg">This land has no active quest</p>
            <p class="text-sm">Only the owner can set up a quest on this land.</p>
          </div>
        </CardContent>
      </Card>
    {/if}
  </div>
{/if}
  