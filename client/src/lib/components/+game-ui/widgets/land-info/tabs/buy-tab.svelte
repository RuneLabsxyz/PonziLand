<script lang="ts">
  import account from '$lib/account.svelte';
  import type { LandSetup, LandWithActions } from '$lib/api/land';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import Label from '$lib/components/ui/label/label.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import type { TabType, Token } from '$lib/interfaces';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { bidLand, buyLand, landStore } from '$lib/stores/store.svelte';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { locationToCoordinates, padAddress } from '$lib/utils';
  import { formatWithoutExponential } from '$lib/utils/currency';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';
  import type { CairoCustomEnum } from 'starknet';
  import { tick, untrack } from 'svelte';
  import TaxImpact from '../tax-impact/tax-impact.svelte';
  import {
    nextStep,
    tutorialAttribute,
    tutorialState,
  } from '$lib/components/tutorial/stores.svelte';
  import {
    shouldBlockBuyInTutorial,
    shouldAdvanceTutorialOnBuy,
    shouldBlockForAdvisorWarnings,
  } from './buy-tab.tutorial';

  // Tutorial highlighting for buy inputs
  let highlightBuyInputs = $derived(
    tutorialAttribute('highlight_buy_inputs').has,
  );

  // Block buy button until tutorial reaches the buy step
  let isBuyBlockedByTutorial = $derived(
    shouldBlockBuyInTutorial(
      tutorialState.tutorialEnabled,
      tutorialAttribute('wait_buy_land').has,
      tutorialAttribute('wait_auction_buy').has,
    ),
  );

  // Simplified buy mode for tutorial - only sell price, auto stake
  let isSimplifiedMode = $derived(tutorialAttribute('simplified_buy').has);
  import { Card } from '$lib/components/ui/card';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import {
    findBestSourceToken,
    calculateDeficitWithBuffer,
  } from '$lib/utils/swap-helper';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { Info } from 'lucide-svelte';
  import { executeTransaction, type TokenDeduction } from '$lib/transactions';

  // Delta values for sell price adjustment (additive)
  const SELL_PRICE_DELTAS = [-10, -5, -1, 1, 5, 10];

  // Delta values for stake adjustment (additive, as multiplier %)
  const STAKE_DELTAS = [-50, -10, -5, 5, 10, 50];

  interface Props {
    land: LandWithActions;
    activeTab: TabType;
    isActive?: boolean;
    auctionPrice?: CurrencyAmount;
    showSwapButton?: boolean;
    onSwapClick?: (() => void) | null;
    swapTokenSymbol?: string | null;
  }

  let {
    land,
    auctionPrice,
    activeTab = $bindable(),
    isActive = false,
    showSwapButton = $bindable(false),
    onSwapClick = $bindable(null),
    swapTokenSymbol = $bindable(null),
  }: Props = $props();

  let baseToken = $derived.by(() => {
    const selectedAddress = settingsStore.selectedBaseTokenAddress;
    const targetAddress = selectedAddress || data.mainCurrencyAddress;
    return (
      data.availableTokens.find((token) => token.address === targetAddress) ||
      data.availableTokens.find(
        (token) => token.address === data.mainCurrencyAddress,
      )!
    );
  });

  let isOwner = $derived(
    padAddress(account.address ?? '') == padAddress(land.owner),
  );

  let hasAdvisorWarnings = $state(false);
  let showTokenDropdown = $state(false);
  let tokenContainerRef = $state<HTMLDivElement | null>(null);
  let containerWidth = $state(0);

  // Get user's tokens sorted by dollar value (descending)
  let sortedUserTokens = $derived.by(() => {
    const tokens = walletStore.tokenBalances;
    if (!tokens || tokens.length === 0) return [];

    // Filter to only tokens with non-zero balance and sort by USD value
    return tokens
      .filter(([_, balance]) => balance && !balance.rawValue().isZero())
      .sort((a, b) => {
        const aValue = walletStore.getCachedBaseTokenEquivalent(a[0].address);
        const bValue = walletStore.getCachedBaseTokenEquivalent(b[0].address);
        if (!aValue && !bValue) return 0;
        if (!aValue) return 1;
        if (!bValue) return -1;
        return bValue.rawValue().comparedTo(aValue.rawValue());
      })
      .map(([token]) => token);
  });

  // Calculate how many tokens can fit (each token ~75px + 4px gap, plus 36px for + button)
  const TOKEN_WIDTH = 79; // approximate width of each token button
  const PLUS_BUTTON_WIDTH = 36;
  let visibleTokenCount = $derived(
    Math.max(0, Math.floor((containerWidth - PLUS_BUTTON_WIDTH) / TOKEN_WIDTH)),
  );

  // Tokens to display (limited to what fits)
  let visibleTokens = $derived(sortedUserTokens.slice(0, visibleTokenCount));

  // Watch container size
  $effect(() => {
    if (!tokenContainerRef) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth = entry.contentRect.width;
      }
    });

    observer.observe(tokenContainerRef);
    return () => observer.disconnect();
  });

  let tokenValue: Token | string | undefined = $state(undefined);
  let selectedToken: Token | undefined = $derived.by(() => {
    if (typeof tokenValue === 'string') {
      return data.availableTokens.find(
        (token: Token) => token.address === tokenValue,
      );
    }
    return tokenValue;
  });

  // Auto-select first token from user's sorted tokens
  $effect(() => {
    if (!tokenValue && sortedUserTokens.length > 0) {
      tokenValue = sortedUserTokens[0];
    }
  });

  // Slider state for sell price (% offset from buy price, default 0%)
  let sellPricePercent = $state(0);

  // Slider state for stake (% of sell price, default 200% = 2x)
  let stakePercent = $state(200);

  // Default fallback price (1 USDC equivalent) when base price is 0
  const DEFAULT_FALLBACK_AMOUNT = 1;

  // Check if base price is zero or invalid (needs fallback mode)
  let isZeroBasePrice = $derived.by(() => {
    const originalPrice =
      land.type === 'auction' ? auctionPrice : land.sellPrice;
    if (!originalPrice) return true;
    return originalPrice.rawValue().isZero();
  });

  // Base price in selected token (the buy price converted to selected token)
  let basePriceInSelectedToken = $derived.by(() => {
    if (!selectedToken || !land.token) return null;

    const originalPrice =
      land.type === 'auction' ? auctionPrice : land.sellPrice;

    // If price is 0 or missing, use fallback (1 USDC equivalent in selected token)
    if (!originalPrice || originalPrice.rawValue().isZero()) {
      // Create a 1 USDC amount in base token, then convert to selected token
      const oneUsdcInBase = CurrencyAmount.fromScaled(
        DEFAULT_FALLBACK_AMOUNT,
        baseToken,
      );

      if (padAddress(baseToken.address) === padAddress(selectedToken.address)) {
        return oneUsdcInBase;
      }

      return walletStore.convertTokenAmount(
        oneUsdcInBase,
        baseToken,
        selectedToken,
      );
    }

    // If tokens are the same, no conversion needed
    if (padAddress(land.token.address) === padAddress(selectedToken.address)) {
      return originalPrice;
    }

    // Convert to selected token
    return walletStore.convertTokenAmount(
      originalPrice,
      land.token,
      selectedToken,
    );
  });

  // Sell price and stake as editable state
  let sellPrice = $state('');
  let stake = $state('');

  // Track if user is manually editing (to avoid overwriting their input)
  let isManualSellPriceEdit = $state(false);
  let isManualStakeEdit = $state(false);

  // Update sell price when percentage or base price changes
  $effect(() => {
    if (isManualSellPriceEdit) return;
    if (!basePriceInSelectedToken || !selectedToken) {
      sellPrice = '';
      return;
    }
    const multiplier = 1 + sellPricePercent / 100;
    const price = basePriceInSelectedToken.rawValue().times(multiplier);
    sellPrice = formatWithoutExponential(price.toString(), 6);
  });

  // Update stake when sell price or stake percentage changes
  $effect(() => {
    if (isManualStakeEdit && !isSimplifiedMode) return;
    if (!sellPrice || !selectedToken) {
      stake = '';
      return;
    }
    const sellPriceNum = parseFloat(sellPrice);
    if (isNaN(sellPriceNum) || sellPriceNum <= 0) {
      stake = '';
      return;
    }
    // In simplified mode, auto-set stake to 2x sell price (200%)
    const effectiveStakePercent = isSimplifiedMode ? 200 : stakePercent;
    const stakeValue = sellPriceNum * (effectiveStakePercent / 100);
    stake = formatWithoutExponential(stakeValue.toString(), 6);
  });

  // Handler for manual sell price input
  function onSellPriceInput(value: string) {
    isManualSellPriceEdit = true;
    sellPrice = value;
  }

  // Handler for manual stake input
  function onStakeInput(value: string) {
    isManualStakeEdit = true;
    stake = value;
  }

  // Add delta to current value when preset is clicked
  function onSellPriceDeltaClick(delta: number) {
    isManualSellPriceEdit = false;
    sellPricePercent = Math.max(-90, Math.min(500, sellPricePercent + delta));
  }

  function onStakeDeltaClick(delta: number) {
    isManualStakeEdit = false;
    stakePercent = Math.max(10, Math.min(2000, stakePercent + delta));
  }

  let stakeAmount: CurrencyAmount = $derived.by(() => {
    if (!selectedToken) return CurrencyAmount.fromScaled(0, baseToken);
    return CurrencyAmount.fromScaled(stake ?? 0, selectedToken);
  });

  let stakeAmountInBaseCurrency: CurrencyAmount | null = $derived.by(() => {
    if (!selectedToken || !stakeAmount) return null;

    // If already in base currency, return null (no conversion needed)
    if (padAddress(selectedToken.address) === padAddress(baseToken.address)) {
      return null;
    }

    return walletStore.convertTokenAmount(
      stakeAmount,
      selectedToken,
      baseToken,
    );
  });

  let sellPriceAmount: CurrencyAmount = $derived.by(() => {
    if (!selectedToken) return CurrencyAmount.fromScaled(0, baseToken);
    return CurrencyAmount.fromScaled(sellPrice ?? 0, selectedToken);
  });

  let sellPriceInBaseCurrency: CurrencyAmount | null = $derived.by(() => {
    if (!selectedToken || !sellPriceAmount) return null;

    // If already in base currency, return null (no conversion needed)
    if (padAddress(selectedToken.address) === padAddress(baseToken.address)) {
      return null;
    }

    return walletStore.convertTokenAmount(
      sellPriceAmount,
      selectedToken,
      baseToken,
    );
  });
  let loading = $state(false);

  let accountManager = useAccount();
  const { accountManager: dojoAccountManager } = useDojo();

  // Error handling for inputs
  let tokenError = $derived.by(() => {
    if (!tokenValue || !selectedToken) {
      return 'Please select a token';
    }
    return null;
  });

  let stakeAmountError = $derived.by(() => {
    if (!stake || !stake.toString().trim()) {
      return 'Stake amount is required';
    }

    let parsedStake = parseFloat(stake);
    if (isNaN(parsedStake) || parsedStake <= 0) {
      return 'Stake amount must be a number greater than 0';
    }

    if (!selectedToken) {
      return 'Please select a token first';
    }

    // Get selected token balance from tokenStore balance
    const selectedTokenBalance = walletStore.getBalance(selectedToken.address);

    if (selectedTokenBalance == undefined) {
      return "You don't have any of this token";
    }

    if (selectedTokenBalance.rawValue().isLessThanOrEqualTo(parsedStake)) {
      return `You don't have enough ${selectedToken.symbol} to stake (max: ${selectedTokenBalance.toString()})`;
    }

    const selectedTokenAmount = CurrencyAmount.fromScaled(
      parsedStake,
      selectedToken,
    );
    if (!walletStore.isWithinCap(selectedTokenAmount)) {
      let cap = walletStore.getCapForToken(selectedToken);
      return `Above the playtest cap! Max is ${cap.toString()} ${selectedToken.symbol}`;
    }

    return null;
  });

  let sellPriceError = $derived.by(() => {
    if (!sellPrice || !sellPrice.toString().trim()) {
      return 'Sell price is required';
    }

    let parsedSellPrice = parseFloat(sellPrice);
    if (isNaN(parsedSellPrice) || parsedSellPrice <= 0) {
      return 'Sell price must be a number greater than 0';
    }

    return null;
  });

  let balanceError = $derived.by(() => {
    if (land.type == 'auction') {
      const landPrice = auctionPrice;
      if (!landPrice) {
        return 'Auction price is not available';
      }
      const landTokenAmount = walletStore.getBalance(land.token?.address!);
      if (landTokenAmount == undefined) {
        return `You don't have any ${land.token?.symbol}`;
      }
      if (landTokenAmount.rawValue().isLessThan(landPrice.rawValue())) {
        return `You don't have enough ${land.token?.symbol} to buy this land (max: ${landTokenAmount.toString()})`;
      }
      // If has enough for price then check if the selected token is land token and add the stake amount
      if (selectedToken?.address === land.token?.address) {
        // Convert stakeAmount to the same token as landPrice to avoid currency mismatch
        const stakeAmountInLandToken = CurrencyAmount.fromScaled(
          stake ?? 0,
          land.token!,
        );
        const totalCost = landPrice.add(stakeAmountInLandToken);
        if (landTokenAmount.rawValue().isLessThan(totalCost.rawValue())) {
          return `You don't have enough ${land.token?.symbol} to buy this land and stake (max: ${landTokenAmount.toString()})`;
        }
      }
    }

    // If not auction, Do the same checks but with land.token for baseToken and selectedToken
    if (land.type !== 'auction') {
      const landTokenAmount = walletStore.getBalance(land.token?.address!);
      if (!landTokenAmount) {
        return `You don't have any ${land.token?.symbol}`;
      }
      if (landTokenAmount.rawValue().isLessThan(land.sellPrice.rawValue())) {
        return `You don't have enough ${land.token?.symbol} to buy this land (max: ${landTokenAmount.toString()})`;
      }

      const selectedAddress = padAddress(selectedToken?.address ?? '');
      const landTokenAddress = padAddress(land.token?.address ?? '');

      // if selectedToken is land.token, check if has enough for stake
      if (selectedAddress === landTokenAddress) {
        try {
          // Convert stakeAmount to the same token as land.sellPrice to avoid currency mismatch
          const stakeAmountInLandToken = CurrencyAmount.fromScaled(
            stake ?? 0,
            land.token!,
          );
          const totalCost = land.sellPrice.add(stakeAmountInLandToken);

          if (landTokenAmount.rawValue().isLessThan(totalCost.rawValue())) {
            return `You don't have enough ${land.token?.symbol} to stake (max: ${landTokenAmount.toString()})`;
          }
        } catch (error) {
          return 'Error calculating total cost for stake';
        }
      }
    }
    if (tutorialState.tutorialEnabled && hasAdvisorWarnings) {
      return 'Fix the warnings above to continue';
    }

    return null;
  });

  // Check if balance error indicates insufficient funds
  let isInsufficientBalanceError = $derived(
    balanceError &&
      (balanceError.includes("don't have enough") ||
        balanceError.includes("don't have any")),
  );

  // Calculate the required amount for land purchase
  let requiredLandTokenAmount = $derived.by(() => {
    if (!land.token) return null;
    if (land.type === 'auction') return auctionPrice ?? null;
    return land.sellPrice;
  });

  // Open swap modal with the correct deficit amount
  async function openSwapForDeficit() {
    if (!land.token || !requiredLandTokenAmount) return;

    const userBalance = walletStore.getBalance(land.token.address);
    const deficitAmount = calculateDeficitWithBuffer(
      requiredLandTokenAmount,
      userBalance,
      5, // 5% buffer for slippage
    );

    const bestSourceToken = findBestSourceToken(land.token.address);

    widgetsStore.updateWidget('swap', {
      isOpen: true,
      data: {
        prefillBuyToken: land.token,
        prefillBuyAmount: deficitAmount,
        prefillSellToken: bestSourceToken,
      },
    });

    await tick();
    widgetsStore.bringToFront('swap');
  }

  // Sync swap button state to parent
  $effect(() => {
    showSwapButton = !!isInsufficientBalanceError;
    onSwapClick = openSwapForDeficit;
    swapTokenSymbol = land.token?.symbol ?? null;
  });

  // Check if form is valid
  let isFormValid = $derived(
    !tokenError && !stakeAmountError && !sellPriceError && !balanceError,
  );

  async function handleBuyClick() {
    loading = true;

    // Double-check validation before proceeding
    if (!isFormValid) {
      console.error('Form validation failed');
      loading = false;
      return;
    }

    let currentPrice: CurrencyAmount | undefined = land.sellPrice;

    if (land.type == 'auction') {
      // In tutorial mode, use a mock price to avoid RPC hangs
      if (tutorialState.tutorialEnabled) {
        currentPrice =
          auctionPrice ?? CurrencyAmount.fromScaled(0.5, land.token);
      } else {
        // Use RPC for exact price when bidding to avoid approval issues
        currentPrice = await land.getCurrentAuctionPrice(true);
      }
    }

    const landSetup: LandSetup = {
      tokenForSaleAddress: selectedToken?.address || '',
      salePrice: sellPriceAmount,
      amountToStake: stakeAmount,
      tokenAddress: land.tokenAddress ?? '',
      currentPrice: currentPrice ?? null,
    };

    if (!land) {
      console.error('No land selected');
      loading = false;
      return;
    }

    // Check if we're in tutorial mode - simulate all purchases locally
    if (tutorialState.tutorialEnabled) {
      try {
        console.log('Tutorial mode: Simulating land purchase locally');

        // Optimistically update the land in the store (same as real purchase)
        const updatedLand = {
          ...land,
          type: 'land', // Convert auction to regular land after purchase
          token: selectedToken,
          tokenUsed: selectedToken?.address || '',
          tokenAddress: selectedToken?.address || '',
          token_used: selectedToken?.address || '',
          token_address: selectedToken?.address || '',
          owner: account.address,
          stakeAmount: stakeAmount,
          sell_price: sellPriceAmount.toBignumberish(),
          sellPrice: sellPriceAmount,
          block_date_bought: Date.now(),
          // @ts-ignore
          level: (land.level === 1
            ? 'Zero'
            : land.level === 2
              ? 'First'
              : 'Second') as CairoCustomEnum,
        };

        // Create a parsed entity for the updated land
        const parsedEntity = {
          entityId: land.location,
          models: {
            ponzi_land: {
              Land: updatedLand,
            },
          },
        };

        // Update the land store
        landStore.updateLand(parsedEntity);

        // Create a parsed entity for the stake
        const stakeEntity = {
          entityId: land.location,
          models: {
            ponzi_land: {
              LandStake: {
                location: land.location,
                amount: stakeAmount.toBignumberish(),
              },
            },
          },
        };

        // Update the land store with the stake
        landStore.updateLand(stakeEntity);

        // Play purchase sound
        gameSounds.play('buy');

        // Progress to next tutorial step if waiting for buy (regular or auction)
        if (
          shouldAdvanceTutorialOnBuy(
            tutorialAttribute('wait_buy_land').has,
            tutorialAttribute('wait_auction_buy').has,
          )
        ) {
          nextStep();
        }

        widgetsStore.closeWidget('land-info');

        console.log('Tutorial: Land purchase simulated successfully');
      } catch (error) {
        console.error('Tutorial: Error simulating land purchase', error);
      } finally {
        loading = false;
      }
      return;
    }

    // Normal mode - proceed with actual blockchain transaction
    try {
      // Calculate deductions for optimistic balance update
      const deductions: TokenDeduction[] = [];
      const landPrice = land.type === 'auction' ? currentPrice : land.sellPrice;

      if (land.token && landPrice && selectedToken) {
        const landTokenAddress = padAddress(land.token.address);
        const selectedTokenAddress = padAddress(selectedToken.address);

        if (landTokenAddress === selectedTokenAddress) {
          // Same token - combine land price + stake into single deduction
          deductions.push({
            tokenAddress: land.token.address,
            amount: landPrice.add(stakeAmount),
          });
        } else {
          // Different tokens - deduct separately
          deductions.push({
            tokenAddress: land.token.address,
            amount: landPrice,
          });
          if (!stakeAmount.rawValue().isZero()) {
            deductions.push({
              tokenAddress: selectedToken.address,
              amount: stakeAmount,
            });
          }
        }
      }

      await executeTransaction({
        execute: () =>
          land.type === 'auction'
            ? bidLand(land.location, landSetup)
            : buyLand(land.location, landSetup),
        deductions,
        onSuccess: () => {
          gameSounds.play('buy');

          // Update the land in the store
          const updatedLand = {
            ...land,
            token: selectedToken,
            tokenUsed: selectedToken?.address || '',
            tokenAddress: selectedToken?.address || '',
            token_used: selectedToken?.address || '',
            token_address: selectedToken?.address || '',
            owner: account.address,
            stakeAmount: stakeAmount,
            sell_price: sellPriceAmount.toBignumberish(),
            block_date_bought: Date.now() / 1000,
            // @ts-ignore
            level: (land.level === 1
              ? 'Zero'
              : land.level === 2
                ? 'First'
                : 'Second') as CairoCustomEnum,
          };

          landStore.updateLand({
            entityId: land.location,
            models: { ponzi_land: { Land: updatedLand } },
          });

          landStore.updateLand({
            entityId: land.location,
            models: {
              ponzi_land: {
                LandStake: {
                  location: land.location,
                  amount: stakeAmount.toBignumberish(),
                },
              },
            },
          });
        },
        onError: (error) => {
          console.error(
            `Error buying land for location ${land.location}`,
            error,
          );
        },
      });
    } finally {
      loading = false;
    }
  }
</script>

{#if isActive}
  <div class="w-full h-full flex flex-col min-h-0 overflow-hidden">
    {#if !account.isConnected}
      <!-- Wallet connection prompt -->
      <div class="flex flex-col items-center justify-center h-full gap-4">
        <div class="text-center">
          <h3 class="text-lg font-semibold mb-2">Connect Wallet Required</h3>
          <p class="text-sm opacity-75 mb-4">
            You need to connect your wallet to buy land and participate in the
            game.
          </p>
        </div>
        <Button
          class="w-full"
          onclick={async () => {
            await dojoAccountManager?.promptForLogin();
          }}
        >
          CONNECT WALLET
        </Button>
      </div>
    {:else}
      <!-- Scrollable form content -->
      <ScrollArea class="pr-1">
        <div class="pr-2" style="max-height: 50vh;">
          <!-- Token selector - hidden in simplified mode -->
          {#if !isSimplifiedMode}
            <div class="flex items-center gap-1.5">
              <Label class="font-ponzi-number" for="token">Token</Label>
              <div class="info-tooltip-container">
                <Info class="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div class="info-tooltip">
                  Determines the land you are going to build. You stake this
                  token and will receive this token when bought.
                </div>
              </div>
            </div>
            <div
              bind:this={tokenContainerRef}
              class="relative flex gap-1 items-center w-full"
            >
              <!-- Quick token buttons - only show what fits -->
              {#each visibleTokens as token (token.address)}
                <button
                  type="button"
                  class={[
                    'flex items-center gap-1 px-2 py-1 rounded border transition-all shrink-0',
                    'hover:bg-white/10',
                    {
                      'border-yellow-500 bg-yellow-500/20':
                        selectedToken?.address === token.address,
                      'border-white/30 bg-transparent':
                        selectedToken?.address !== token.address,
                    },
                  ]}
                  onclick={() => {
                    tokenValue = token;
                    showTokenDropdown = false;
                  }}
                >
                  <TokenAvatar {token} class="h-5 w-5" />
                  <span class="text-sm font-medium">{token.symbol}</span>
                </button>
              {/each}

              <!-- Dropdown arrow button -->
              <button
                type="button"
                class="flex items-center justify-center w-8 h-8 rounded border border-white/30 hover:bg-white/10 transition-all shrink-0 ml-auto"
                aria-label="Toggle token dropdown"
                onclick={() => (showTokenDropdown = !showTokenDropdown)}
              >
                <svg
                  class={[
                    'w-4 h-4 transition-transform',
                    { 'rotate-180': showTokenDropdown },
                  ]}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <!-- Full-width dropdown -->
              {#if showTokenDropdown}
                <div
                  class="absolute left-0 right-0 top-full mt-1 z-50 bg-[#1a1a24] border border-white/20 rounded-lg shadow-lg max-h-64 overflow-y-auto"
                >
                  {#each sortedUserTokens as token (token.address)}
                    {@const balance = walletStore.getBalance(token.address)}
                    {@const usdEquivalent =
                      walletStore.getCachedBaseTokenEquivalent(token.address)}
                    <button
                      type="button"
                      class={[
                        'flex justify-between items-center w-full px-3 py-2 hover:bg-white/10 transition-all',
                        {
                          'bg-yellow-500/20':
                            selectedToken?.address === token.address,
                        },
                      ]}
                      onclick={() => {
                        tokenValue = token;
                        showTokenDropdown = false;
                      }}
                    >
                      <div class="flex gap-2 items-center">
                        <TokenAvatar {token} class="h-6 w-6" />
                        <div class="flex flex-col items-start">
                          <span class="font-medium">{token.symbol}</span>
                          {#if token.name && token.name !== token.symbol}
                            <span class="text-xs text-gray-400"
                              >{token.name}</span
                            >
                          {/if}
                        </div>
                      </div>
                      {#if balance}
                        <div class="flex flex-col items-end text-right">
                          <span class="font-ds">{balance.toString()}</span>
                          {#if usdEquivalent}
                            <span class="text-xs text-gray-400">
                              ≈ ${usdEquivalent.toString()}
                            </span>
                          {/if}
                        </div>
                      {/if}
                    </button>
                  {/each}
                  {#if sortedUserTokens.length === 0}
                    <div class="p-3 text-center text-gray-400 text-sm">
                      No tokens with balance
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
            {#if tokenError}
              <p class="text-red-500 text-sm mt-1">{tokenError}</p>
            {/if}
          {/if}

          <!-- Simplified mode header -->
          {#if isSimplifiedMode}
            <div
              class="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
            >
              <p class="text-sm text-yellow-200">
                <b>Quick Buy:</b> Just set your sell price. Stake is auto-calculated
                (2x price).
              </p>
            </div>
          {/if}

          {#if isZeroBasePrice}
            <p class="text-yellow-400 text-xs mb-2">
              ℹ️ Land price is 0 - using 1 {baseToken.symbol} as reference
            </p>
          {/if}

          <div
            class={[
              'my-4',
              {
                'flex gap-4': !isSimplifiedMode,
                'flex flex-col gap-4': isSimplifiedMode,
              },
            ]}
            class:tutorial-highlight-inputs={highlightBuyInputs}
          >
            <!-- Sell Price Section -->
            <div class="flex flex-col gap-2 flex-1">
              <div class="flex items-center gap-1.5">
                <Label class="font-ponzi-number" for="sell">Sell Price</Label>
                <div class="info-tooltip-container">
                  <Info class="w-3.5 h-3.5 text-gray-400 cursor-help" />
                  <div class="info-tooltip">
                    What is paid to you when your land is bought out.
                  </div>
                </div>
              </div>

              <!-- Delta buttons -->
              <div class="flex gap-1">
                {#each SELL_PRICE_DELTAS as delta}
                  <button
                    type="button"
                    class="px-2 py-1 rounded border text-xs transition-all hover:bg-white/10 border-white/30 flex-1"
                    onclick={() => onSellPriceDeltaClick(delta)}
                  >
                    {delta >= 0 ? '+' : ''}{delta}%
                  </button>
                {/each}
              </div>

              <!-- Current % display -->
              <div class="text-xs text-gray-400 text-center">
                Current: {sellPricePercent >= 0 ? '+' : ''}{sellPricePercent}%
              </div>

              <!-- Value display -->
              <div class="flex gap-1 items-center">
                <Input
                  id="sell"
                  type="number"
                  value={sellPrice}
                  oninput={(e) => onSellPriceInput(e.currentTarget.value)}
                  class={[
                    'flex-1 min-w-0',
                    { 'border-red-500': sellPriceError },
                  ]}
                />
                <span class="text-xs text-gray-400 shrink-0">
                  {selectedToken?.symbol}
                </span>
              </div>
              {#if sellPriceInBaseCurrency}
                <span class="text-xs text-gray-400">
                  ≈ {sellPriceInBaseCurrency.toString()}
                  {baseToken.symbol}
                </span>
              {/if}
              {#if sellPriceError}
                <p class="text-red-500 text-xs">{sellPriceError}</p>
              {/if}
            </div>

            <!-- Stake Amount Section - hidden in simplified mode -->
            {#if !isSimplifiedMode}
              <div class="flex flex-col gap-2 flex-1">
                <div class="flex items-center gap-1.5">
                  <Label class="font-ponzi-number" for="stake">Stake</Label>
                  <div class="info-tooltip-container">
                    <Info class="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div class="info-tooltip">
                      Locked value to pay taxes and survive (ratio of sell
                      price).
                    </div>
                  </div>
                </div>

                <!-- Delta buttons -->
                <div class="flex gap-1">
                  {#each STAKE_DELTAS as delta}
                    <button
                      type="button"
                      class="px-2 py-1 rounded border text-xs transition-all hover:bg-white/10 border-white/30 flex-1"
                      onclick={() => onStakeDeltaClick(delta)}
                    >
                      {delta >= 0 ? '+' : ''}{delta}%
                    </button>
                  {/each}
                </div>

                <!-- Current % display -->
                <div class="text-xs text-gray-400 text-center">
                  Current: {stakePercent}% ({(stakePercent / 100).toFixed(1)}x)
                </div>

                <!-- Value display -->
                <div class="flex gap-1 items-center">
                  <Input
                    id="stake"
                    type="number"
                    value={stake}
                    oninput={(e) => onStakeInput(e.currentTarget.value)}
                    class={[
                      'flex-1 min-w-0',
                      { 'border-red-500': stakeAmountError },
                    ]}
                  />
                  <span class="text-xs text-gray-400 shrink-0">
                    {selectedToken?.symbol}
                  </span>
                </div>
                {#if stakeAmountInBaseCurrency}
                  <span class="text-xs text-gray-400">
                    ≈ {stakeAmountInBaseCurrency.toString()}
                    {baseToken.symbol}
                  </span>
                {/if}
                {#if stakeAmountError}
                  <p class="text-red-500 text-xs">{stakeAmountError}</p>
                {/if}
              </div>
            {:else}
              <!-- Simplified mode: show auto-calculated stake info -->
              <div class="flex flex-col gap-1 p-2 bg-gray-800/50 rounded">
                <span class="text-xs text-gray-400">Auto Stake (2x price)</span>
                <span class="text-sm font-ponzi-number">
                  {stake}
                  {selectedToken?.symbol ?? land.token?.symbol}
                </span>
              </div>
            {/if}
          </div>

          <!-- Tax Impact - hidden in simplified mode -->
          {#if !isSimplifiedMode}
            <div class="w-full">
              <TaxImpact
                sellAmountVal={sellPrice}
                stakeAmountVal={stake}
                {selectedToken}
                {land}
                {auctionPrice}
                bind:hasAdvisorWarnings
              />
            </div>
          {/if}
        </div>
      </ScrollArea>

      <!-- Buy button section - always visible at bottom -->
      <div class="shrink-0 pt-2 pb-4">
        {#if balanceError}
          <p class="text-red-500 text-sm mt-1">{balanceError}</p>
        {/if}

        {#if loading}
          <Button class="mt-3 w-full" disabled>
            buying <ThreeDots />
          </Button>
        {:else}
          <Button
            onclick={handleBuyClick}
            class="mt-3 w-full"
            disabled={!isFormValid ||
              isOwner ||
              loading ||
              isBuyBlockedByTutorial ||
              shouldBlockForAdvisorWarnings(
                tutorialState.tutorialEnabled,
                hasAdvisorWarnings,
              )}
          >
            BUY FOR <span class="text-yellow-500">
              &nbsp;
              {#if land.type == 'auction'}
                {#await land?.getCurrentAuctionPrice(false)}
                  fetching...
                {:then price}
                  {price}
                {/await}
              {:else}
                {land.sellPrice}
              {/if}
              &nbsp;
            </span>
            {land.token?.symbol}
            & STAKE
            <span class="text-yellow-500">
              &nbsp;{stakeAmount.toString()}&nbsp;
            </span>
            {selectedToken?.symbol}
          </Button>
          {#if land.token && selectedToken}
            {@const landPriceInBase =
              land.type == 'auction' && auctionPrice
                ? walletStore.convertTokenAmount(
                    auctionPrice,
                    land.token,
                    baseToken,
                  )
                : walletStore.convertTokenAmount(
                    land.sellPrice,
                    land.token,
                    baseToken,
                  )}
            {@const stakeInBase =
              stakeAmountInBaseCurrency ||
              (padAddress(selectedToken.address) ===
              padAddress(baseToken.address)
                ? stakeAmount
                : null)}
            <span class="text-gray-300 text-sm block">
              {#if landPriceInBase && stakeInBase}
                (Total: ≈{landPriceInBase.add(stakeInBase).toString()}
                {baseToken.symbol})
              {:else if landPriceInBase && padAddress(selectedToken.address) === padAddress(baseToken.address)}
                (Total: ≈{landPriceInBase.add(stakeAmount).toString()}
                {baseToken.symbol})
              {:else if padAddress(land.token.address) === padAddress(baseToken.address) && stakeInBase}
                (Total: ≈{land.type == 'auction' && auctionPrice
                  ? auctionPrice.add(stakeInBase).toString()
                  : land.sellPrice.add(stakeInBase).toString()}
                {baseToken.symbol})
              {:else if padAddress(land.token.address) === padAddress(baseToken.address) && padAddress(selectedToken.address) === padAddress(baseToken.address)}
                (Total: ≈{land.type == 'auction' && auctionPrice
                  ? auctionPrice.add(stakeAmount).toString()
                  : land.sellPrice.add(stakeAmount).toString()}
                {baseToken.symbol})
              {/if}
            </span>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .tutorial-highlight-inputs {
    border: 2px solid #ffd700;
    border-radius: 8px;
    padding: 1rem;
    animation: goldGlow 2s ease-in-out infinite;
  }

  @keyframes goldGlow {
    0%,
    100% {
      box-shadow:
        0 0 8px rgba(255, 215, 0, 0.4),
        0 0 16px rgba(255, 215, 0, 0.2);
    }
    50% {
      box-shadow:
        0 0 16px rgba(255, 215, 0, 0.8),
        0 0 32px rgba(255, 215, 0, 0.4);
    }
  }

  .info-tooltip-container {
    position: relative;
    display: inline-flex;
  }

  .info-tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    max-width: 220px;
    min-width: 150px;
    text-align: center;
    z-index: 50;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    white-space: normal;
    line-height: 1.4;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.15s ease,
      visibility 0.15s ease;
    pointer-events: none;
  }

  .info-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid rgba(255, 255, 255, 0.2);
  }

  .info-tooltip::before {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid rgba(0, 0, 0, 0.95);
    margin-top: -1px;
  }

  .info-tooltip-container:hover .info-tooltip {
    opacity: 1;
    visibility: visible;
  }
</style>
