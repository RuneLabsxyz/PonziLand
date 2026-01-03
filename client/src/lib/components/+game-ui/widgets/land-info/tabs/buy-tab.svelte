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
  import { Card } from '$lib/components/ui/card';
  import { Slider } from '$lib/components/ui/slider';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import {
    findBestSourceToken,
    calculateDeficitWithBuffer,
  } from '$lib/utils/swap-helper';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { executeTransaction, type TokenDeduction } from '$lib/transactions';

  // Preset values for sell price slider (% offset from buy price)
  const SELL_PRICE_PRESETS = [-50, -25, -10, -5, -1, 0, 1, 5, 10, 25, 50, 100];

  // Preset values for stake slider (% of sell price)
  const STAKE_PRESETS = [10, 25, 50, 100, 200, 300, 500, 1000];

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

  let tokenValue: Token | string | undefined = $state(data.mainCurrencyAddress);
  let selectedToken: Token | undefined = $derived.by(() => {
    if (typeof tokenValue === 'string') {
      return data.availableTokens.find(
        (token: Token) => token.address === tokenValue,
      );
    }
    return tokenValue;
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
    if (isManualStakeEdit) return;
    if (!sellPrice || !selectedToken) {
      stake = '';
      return;
    }
    const sellPriceNum = parseFloat(sellPrice);
    if (isNaN(sellPriceNum) || sellPriceNum <= 0) {
      stake = '';
      return;
    }
    const stakeValue = sellPriceNum * (stakePercent / 100);
    stake = formatWithoutExponential(stakeValue.toString(), 6);
  });

  // Handler for manual sell price input
  function onSellPriceInput(value: string) {
    isManualSellPriceEdit = true;
    sellPrice = value;
    // Don't update sellPricePercent here - let the slider show closest position via displaySellPricePercent
  }

  // Handler for manual stake input
  function onStakeInput(value: string) {
    isManualStakeEdit = true;
    stake = value;
    // Don't update stakePercent here - let the slider show closest position via displayStakePercent
  }

  // Derived slider display values - calculated from input when in manual mode
  let displaySellPricePercent = $derived.by(() => {
    if (isManualSellPriceEdit && sellPrice && basePriceInSelectedToken) {
      const inputValue = parseFloat(sellPrice);
      const baseValue = basePriceInSelectedToken.rawValue().toNumber();
      if (!isNaN(inputValue) && baseValue > 0) {
        return ((inputValue - baseValue) / baseValue) * 100;
      }
    }
    return sellPricePercent;
  });

  let displayStakePercent = $derived.by(() => {
    if (isManualStakeEdit && stake && sellPrice) {
      const sellPriceNum = parseFloat(sellPrice);
      const stakeNum = parseFloat(stake);
      if (!isNaN(sellPriceNum) && !isNaN(stakeNum) && sellPriceNum > 0) {
        return (stakeNum / sellPriceNum) * 100;
      }
    }
    return stakePercent;
  });

  // Track if user is actively interacting with sliders
  let isUserDraggingSellPriceSlider = $state(false);
  let isUserDraggingStakeSlider = $state(false);

  // Called when user starts interacting with sell price slider
  function onSellPriceSliderPointerDown() {
    isUserDraggingSellPriceSlider = true;
    isManualSellPriceEdit = false;
  }

  function onSellPriceSliderPointerUp() {
    isUserDraggingSellPriceSlider = false;
  }

  // Called when user starts interacting with stake slider
  function onStakeSliderPointerDown() {
    isUserDraggingStakeSlider = true;
    isManualStakeEdit = false;
  }

  function onStakeSliderPointerUp() {
    isUserDraggingStakeSlider = false;
  }

  // Slider value change handlers - only update if user is dragging
  function onSellPriceSliderChange(value: number) {
    if (isUserDraggingSellPriceSlider) {
      sellPricePercent = value;
    }
  }

  function onStakeSliderChange(value: number) {
    if (isUserDraggingStakeSlider) {
      stakePercent = value;
    }
  }

  // Reset manual edit flag when preset is clicked
  function onSellPricePresetClick(preset: number) {
    isManualSellPriceEdit = false;
    sellPricePercent = preset;
  }

  function onStakePresetClick(preset: number) {
    isManualStakeEdit = false;
    stakePercent = preset;
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
          tutorialAttribute('wait_buy_land').has ||
          tutorialAttribute('wait_auction_buy').has
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
  <div class="w-full h-full">
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
      <!-- Buy tab content will go here -->
      <Label class="font-ponzi-number" for="token">Token</Label>
      <p class="-mt-1 mb-1 opacity-75 leading-none">
        Determines the land you are going to build. You stake this token and
        will receive this token when bought
      </p>
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
              {@const usdEquivalent = walletStore.getCachedBaseTokenEquivalent(
                token.address,
              )}
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
                      <span class="text-xs text-gray-400">{token.name}</span>
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

      <div class="flex flex-col gap-4 my-4">
        <!-- Sell Price Section -->
        <div class="flex flex-col gap-2">
          <Label class="font-ponzi-number" for="sell">Sell Price</Label>
          <p class="-mt-1 mb-1 opacity-75 leading-none text-sm">
            What is paid to you when your land is bought out
          </p>
          {#if isZeroBasePrice}
            <p class="text-yellow-400 text-xs -mt-1 mb-1">
              ℹ️ Land price is 0 - using 1 {baseToken.symbol} as reference for sliders
            </p>
          {/if}

          <!-- Preset buttons -->
          <div class="flex flex-wrap gap-1">
            {#each SELL_PRICE_PRESETS as preset}
              <button
                type="button"
                class={[
                  'px-2 py-1 rounded border text-xs transition-all',
                  'hover:bg-white/10',
                  {
                    'border-yellow-500 bg-yellow-500/20':
                      sellPricePercent === preset,
                    'border-white/30': sellPricePercent !== preset,
                  },
                ]}
                onclick={() => onSellPricePresetClick(preset)}
              >
                {preset >= 0 ? '+' : ''}{preset}%
              </button>
            {/each}
          </div>

          <!-- Slider -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            onpointerdown={onSellPriceSliderPointerDown}
            onpointerup={onSellPriceSliderPointerUp}
            onpointerleave={onSellPriceSliderPointerUp}
          >
            <Slider
              type="single"
              min={-50}
              max={100}
              step={1}
              value={displaySellPricePercent}
              onValueChange={onSellPriceSliderChange}
              class="w-full"
            />
          </div>

          <!-- Value display -->
          <div class="flex gap-2 items-center overflow-hidden">
            <Input
              id="sell"
              type="number"
              value={sellPrice}
              oninput={(e) => onSellPriceInput(e.currentTarget.value)}
              class={['flex-1 min-w-0', { 'border-red-500': sellPriceError }]}
            />
            <span class="text-sm text-gray-400 whitespace-nowrap shrink-0">
              {selectedToken?.symbol}
            </span>
            {#if sellPriceInBaseCurrency}
              <span
                class="text-sm font-ponzi-number text-white whitespace-nowrap truncate max-w-[120px]"
                title="≈ {sellPriceInBaseCurrency.toString()} {baseToken.symbol}"
              >
                ≈ {sellPriceInBaseCurrency.toString()}
                {baseToken.symbol}
              </span>
            {/if}
          </div>
          {#if sellPriceError}
            <p class="text-red-500 text-sm">{sellPriceError}</p>
          {/if}
        </div>

        <!-- Stake Amount Section -->
        <div class="flex flex-col gap-2">
          <Label class="font-ponzi-number" for="stake">Stake Amount</Label>
          <p class="-mt-1 mb-1 leading-none opacity-75 text-sm">
            Locked value to pay taxes and survive (ratio of sell price)
          </p>

          <!-- Preset buttons -->
          <div class="flex flex-wrap gap-1">
            {#each STAKE_PRESETS as preset}
              <button
                type="button"
                class={[
                  'px-2 py-1 rounded border text-xs transition-all',
                  'hover:bg-white/10',
                  {
                    'border-yellow-500 bg-yellow-500/20':
                      stakePercent === preset,
                    'border-white/30': stakePercent !== preset,
                  },
                ]}
                onclick={() => onStakePresetClick(preset)}
              >
                {preset >= 100 ? `${preset / 100}x` : `${preset}%`}
              </button>
            {/each}
          </div>

          <!-- Slider -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            onpointerdown={onStakeSliderPointerDown}
            onpointerup={onStakeSliderPointerUp}
            onpointerleave={onStakeSliderPointerUp}
          >
            <Slider
              type="single"
              min={10}
              max={1000}
              step={10}
              value={displayStakePercent}
              onValueChange={onStakeSliderChange}
              class="w-full"
            />
          </div>

          <!-- Value display -->
          <div class="flex gap-2 items-center overflow-hidden">
            <Input
              id="stake"
              type="number"
              value={stake}
              oninput={(e) => onStakeInput(e.currentTarget.value)}
              class={['flex-1 min-w-0', { 'border-red-500': stakeAmountError }]}
            />
            <span class="text-sm text-gray-400 whitespace-nowrap shrink-0">
              {selectedToken?.symbol}
            </span>
            {#if stakeAmountInBaseCurrency}
              <span
                class="text-sm font-ponzi-number text-white whitespace-nowrap truncate max-w-[120px]"
                title="≈ {stakeAmountInBaseCurrency.toString()} {baseToken.symbol}"
              >
                ≈ {stakeAmountInBaseCurrency.toString()}
                {baseToken.symbol}
              </span>
            {/if}
          </div>
          {#if stakeAmountError}
            <p class="text-red-500 text-sm">{stakeAmountError}</p>
          {/if}
        </div>
      </div>

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
            (tutorialState.tutorialEnabled && hasAdvisorWarnings)}
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
            (padAddress(selectedToken.address) === padAddress(baseToken.address)
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
    {/if}
  </div>
{/if}
