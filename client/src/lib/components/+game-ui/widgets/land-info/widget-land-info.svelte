<script lang="ts">
  import account from '$lib/account.svelte';
  import type { LandSetup, LandWithActions } from '$lib/api/land';
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import LandHudInfo from '$lib/components/+game-map/land/hud/land-hud-info.svelte';
  import LandOverview from '$lib/components/+game-map/land/land-overview.svelte';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { Card } from '$lib/components/ui/card';
  import Input from '$lib/components/ui/input/input.svelte';
  import Label from '$lib/components/ui/label/label.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { Token } from '$lib/interfaces';
  import { markAsNuking, nukeStore } from '$lib/stores/nuke.store.svelte';
  import {
    bidLand,
    buyLand,
    landStore,
  } from '$lib/stores/store.svelte';
  import { padAddress, parseLocation, toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { onDestroy, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import BuyInsights from './buy/buy-insights.svelte';
  import BuySellForm from './buy/buy-sell-form.svelte';

  let { data } = $props<{ data: { location?: string } }>();
  let land: LandWithActions | null = $state(null);
  let unsubscribe: (() => void) | null = $state(null);

  let accountManager = useAccount();
  let disabled = writable(false);
  let actionType = $state('stake'); // 'stake' or 'price'
  let stakeIncrease = $state('100');
  let priceIncrease = $state('0');

  let selectedToken = $state<Token | undefined>();
  let loading = $state(false);

  let stakeAmount = $state<CurrencyAmount>(CurrencyAmount.fromScaled(1));
  let sellAmount = $state<CurrencyAmount>(CurrencyAmount.fromScaled(1));

  let currentPrice = $state<CurrencyAmount>();
  let priceDisplay = $derived(currentPrice?.toString() ?? '');

  const address = $derived(account.address);
  let isOwner = $derived.by(() => {
    if (!land || !address) return false;
    return land.owner === padAddress(address);
  });

  let fetching = $state(false);

  onMount(() => {
    if (!data?.location) return;

    try {
      const [x, y] = parseLocation(data.location);
      const landReadable = landStore.getLand(x, y);

      if (landReadable) {
        unsubscribe = landReadable.subscribe((value) => {
          if (
            value &&
            (BuildingLand.is(value) || AuctionLand.is(value))
          ) {
            land = createLandWithActions(value, () => landStore.getAllLands());
            currentPrice = land.sellPrice;
          } else {
            land = null;
          }
        });
      }
    } catch (error) {
      console.error('Failed to load land data:', error);
    }
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  onMount(() => {
    if (land?.sellPrice) {
      priceIncrease = land.sellPrice.toString();
    }
  });

  let priceError = $derived.by(() => {
    if (!land || !priceIncrease) return null;

    try {
      const newPrice = CurrencyAmount.fromScaled(priceIncrease, land.token);
      if (newPrice.rawValue().isLessThanOrEqualTo(land.sellPrice.rawValue())) {
        return 'New price must be higher than the current price';
      }
      return null;
    } catch {
      return 'Invalid price value';
    }
  });

  let isPriceValid = $derived.by(
    () => !!land && !!priceIncrease && !priceError,
  );

  let stakeAfter = $derived.by(() => {
    if (!land) return -1;
    const total =
      Number(stakeIncrease) + land.stakeAmount.rawValue().toNumber();
    return total;
  });

  const handleIncreaseStake = async () => {
    if (!land) {
      console.error('No land selected');
      return;
    }

    let result = await land.increaseStake(
      CurrencyAmount.fromScaled(stakeIncrease, land.token),
    );
    disabled.set(true);
    if (result?.transaction_hash) {
      const txPromise = accountManager!
        .getProvider()
        ?.getWalletAccount()
        ?.waitForTransaction(result.transaction_hash);
      const landPromise = land.wait();

      await Promise.any([txPromise, landPromise]);
      disabled.set(false);
    }
  };

  const handleIncreasePrice = async () => {
    if (!land) {
      console.error('No land selected');
      return;
    }

    let result = await land.increasePrice(
      CurrencyAmount.fromScaled(priceIncrease, land.token),
    );
    disabled.set(true);
    if (result?.transaction_hash) {
      const txPromise = accountManager!
        .getProvider()
        ?.getWalletAccount()
        ?.waitForTransaction(result.transaction_hash);
      const landPromise = land.wait();

      await Promise.any([txPromise, landPromise]);
      disabled.set(false);
    }
  };

  async function handleBuyClick() {
    const landSetup: LandSetup = {
      tokenForSaleAddress: selectedToken?.address || '',
      salePrice: sellAmount,
      amountToStake: stakeAmount,
      tokenAddress: land?.tokenAddress ?? '',
      currentPrice: land?.sellPrice ?? null,
    };

    if (!land) {
      console.error('No land selected');
      return;
    }

    loading = true;

    try {
      const result = await buyLand(land?.location, landSetup);

      if (result?.transaction_hash) {
        // Only wait for the land update, not the total TX confirmation (should be fine)
        const txPromise = accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(result.transaction_hash);
        const landPromise = land.wait();
        await Promise.any([txPromise, landPromise]);
      }
    } catch (error) {
      console.error('Error buying land', error);
    } finally {
      loading = false;
    }
  }

  async function handleBiddingClick() {
    loading = true;

    //fetch auction currentprice
    if (!currentPrice) {
      currentPrice = CurrencyAmount.fromScaled('1', land?.token);
    }

    const landSetup: LandSetup = {
      tokenForSaleAddress: selectedToken?.address as string,
      salePrice: sellAmount,
      amountToStake: stakeAmount,
      tokenAddress: land?.tokenAddress as string,
      currentPrice: currentPrice, // Include a 10% margin on the bet amount
    };

    if (!land?.location) {
      loading = false;
      return;
    }

    try {
      const result = await bidLand(land?.location, landSetup);
      if (result?.transaction_hash) {
        // Only wait for the land update, not the total TX confirmation (should be fine)
        const txPromise = accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(result.transaction_hash);
        const landPromise = land.wait();
        await Promise.any([txPromise, landPromise]);
        // Nuke neighboring lands that are nukable
        land?.getNeighbors().locations.array.forEach((location) => {
          const locationString = toHexWithPadding(location);
          if (nukeStore.pending[locationString]) {
            markAsNuking(locationString);
          }
        });
      } else {
        loading = false;
      }
    } catch (e) {
      console.error('Error buying land:', e);
      loading = false;
    }
  }

  $effect(() => {
    // Update the token while preserving the scaled amount
    stakeAmount.setToken(selectedToken ?? undefined);
    sellAmount.setToken(selectedToken ?? undefined);
  });

  $effect(() => {
    if (land?.type == 'auction') {
      fetchCurrentPrice();

      const interval = setInterval(() => {
        console.log('Fetching current price');
        fetchCurrentPrice();
      }, 2000);

      return () => clearInterval(interval);
    }
  });

  const fetchCurrentPrice = () => {
    if (!land) {
      return;
    }

    land?.getCurrentAuctionPrice().then((res) => {
      currentPrice = res;
      fetching = false;
    });
  };
</script>

<div class="land-info-widget relative h-full w-full">
  {#if land}
    <ScrollArea class="w-full h-full landinfo-container" type="scroll">
      <div class="flex flex-col w-full h-full items-center justify-center">
        <div
          class="flex flex-col items-center justify-center h-full w-full landinfo-content"
        >
          <div class="flex flex-col items-center justify-center min-w-80">
            <LandOverview {land} isOwner={true} size="lg" />
            <div class="flex items-center gap-1 pt-5">
              {#each priceDisplay as char}
                {#if char === '.'}
                  <span class="text-ponzi-number text-3xl">.</span>
                {:else if char == ','}
                  <span class="text-ponzi-number text-3xl opacity-0"></span>
                {:else}
                  <span
                    class="text-ponzi-number text-stroke-auction text-3xl bg-[#2B2B3D] p-2 text-[#f2b545]"
                    >{char}</span
                  >
                {/if}
              {/each}
              {#if land.type === 'auction'}
                {#if !fetching}
                  <button
                    onclick={() => {
                      fetching = true;
                      fetchCurrentPrice();
                    }}
                    aria-label="Refresh balance"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 32 32"
                      width="32px"
                      height="32px"
                      fill="currentColor"
                      class="h-5 w-5"
                      ><path
                        d="M 6 4 L 6 6 L 4 6 L 4 8 L 2 8 L 2 10 L 6 10 L 6 26 L 17 26 L 17 24 L 8 24 L 8 10 L 12 10 L 12 8 L 10 8 L 10 6 L 8 6 L 8 4 L 6 4 z M 15 6 L 15 8 L 24 8 L 24 22 L 20 22 L 20 24 L 22 24 L 22 26 L 24 26 L 24 28 L 26 28 L 26 26 L 28 26 L 28 24 L 30 24 L 30 22 L 26 22 L 26 6 L 15 6 z"
                      /></svg
                    >
                  </button>
                {:else}
                  <ThreeDots />
                {/if}
              {/if}
            </div>
            <div class="flex items-center gap-2">
              <div class="text-3xl text-ponzi-number text-white">
                {land.token?.symbol}
              </div>
              <img
                class="w-6 h-6 rounded-full"
                src={land.token?.images.icon}
                alt="{land.token?.symbol} icon"
              />
            </div>
          </div>
          <div class="flex flex-col gap-2 text-stroke-none w-96">
            {#if !isOwner}
              <div class="flex flex-col gap-4 w-96 text-stroke-none">
                <BuySellForm
                  bind:selectedToken
                  bind:stakeAmount
                  bind:sellAmount
                  {land}
                />
              </div>
            {:else}
              <Card>
                <div class="flex items-center justify-center">
                  <LandHudInfo {land} isOwner={false} showLand={false} />
                </div>
              </Card>

              <div class="flex-1">
                <div class="flex border-b mb-4">
                  <button
                    class={`flex-1 py-2 text-center font-medium transition-all duration-200 border-b-2 
    ${actionType === 'stake' ? 'text-white border-white' : 'text-gray-400 border-transparent'}`}
                    onclick={() => (actionType = 'stake')}
                  >
                    Increase Stake
                  </button>
                  <button
                    class={`flex-1 py-2 text-center font-medium transition-all duration-200 border-b-2 
    ${actionType === 'price' ? 'text-white border-white' : 'text-gray-400 border-transparent'}`}
                    onclick={() => (actionType = 'price')}
                  >
                    Increase Price
                  </button>
                </div>
                {#if actionType === 'stake'}
                  <div class="space-y-3">
                    <Label>Amount to add to stake</Label>
                    <Input
                      type="number"
                      bind:value={stakeIncrease}
                      placeholder="Enter amount"
                    />
                    <Button
                      disabled={$disabled}
                      onclick={handleIncreaseStake}
                      class="w-full"
                    >
                      Confirm Stake
                    </Button>
                  </div>
                {:else}
                  <div class="space-y-3">
                    <Label>Enter the new price</Label>
                    <Input
                      type="number"
                      bind:value={priceIncrease}
                      placeholder="Enter amount"
                    />
                    <Button
                      disabled={$disabled || !isPriceValid}
                      onclick={handleIncreasePrice}
                      class="w-full"
                    >
                      Confirm Price
                    </Button>
                  </div>
                {/if}
              </div>
              <BuyInsights {land} selectedToken={land.token} />
            {/if}
          </div>
        </div>
        {#if !isOwner}
          <div class="flex justify-center mt-5">
            {#if loading}
              <div class="text-3xl h-10 w-20">
                Buying<ThreeDots />
              </div>
            {:else if land.type === 'auction'}
              <Button
                on:click={() => {
                  handleBiddingClick();
                }}
              >
                Buy land
              </Button>
            {:else}
              <Button
                on:click={() => {
                  handleBuyClick();
                }}
              >
                Buy land
              </Button>
            {/if}
          </div>
        {/if}
      </div>
    </ScrollArea>
  {/if}
</div>

<style>
  .landinfo-container {
    container-type: inline-size;
    container-name: landinfo;
  }
</style>
