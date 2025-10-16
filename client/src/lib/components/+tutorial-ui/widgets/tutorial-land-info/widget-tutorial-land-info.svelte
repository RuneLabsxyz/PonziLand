<script lang="ts">
  import type { TutorialLand } from '$lib/stores/tutorial-land.store.svelte';
  import { tutorialLandStore } from '$lib/stores/tutorial-land.store.svelte';
  import { tutorialWalletStore } from '$lib/stores/tutorial-wallet.store.svelte';
  import { tutorialStore } from '$lib/stores/tutorial.store.svelte';

  let { land }: { land: TutorialLand } = $props();

  let isPlayerLand = $derived(land.owner === tutorialWalletStore.address);
  let canBuy = $derived(
    land.type === 'empty' && tutorialStore.isActionAllowed('buy-land'),
  );
  let canUpgrade = $derived(
    isPlayerLand &&
      land.level < 3 &&
      tutorialStore.isActionAllowed('upgrade-land'),
  );

  let isBuyHighlighted = $derived(
    tutorialStore.currentStep?.targetElement === 'buy-button',
  );
  let isUpgradeHighlighted = $derived(
    tutorialStore.currentStep?.targetElement === 'upgrade-button',
  );

  // Buy land action
  function handleBuy() {
    if (!canBuy || !tutorialWalletStore.selectedToken) return;

    const token = tutorialWalletStore.selectedToken;
    const success = tutorialWalletStore.spendTokens(
      token.symbol,
      land.sellPrice,
    );

    if (success) {
      tutorialLandStore.buyLand(
        land.x,
        land.y,
        tutorialWalletStore.address,
        token.symbol,
        land.sellPrice,
      );

      // Progress tutorial
      if (tutorialStore.currentStep?.id === 'buy-land') {
        tutorialStore.nextStep();
      }
    }
  }

  // Upgrade land action
  function handleUpgrade() {
    if (!canUpgrade) return;

    const upgradeCost = 100 * land.level; // Simple cost formula
    const success = tutorialWalletStore.spendTokens(
      land.tokenUsed,
      upgradeCost,
    );

    if (success) {
      tutorialLandStore.upgradeLand(land.x, land.y);

      // Progress tutorial
      if (tutorialStore.currentStep?.id === 'manage-land') {
        tutorialStore.nextStep();
      }
    }
  }
</script>

<div
  class="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-4 w-80"
>
  <h3 class="text-white font-bold mb-3">
    Land [{land.x}, {land.y}]
  </h3>

  <!-- Land details -->
  <div class="space-y-2 text-sm">
    <div class="flex justify-between">
      <span class="text-gray-400">Type:</span>
      <span class="text-white capitalize">{land.type}</span>
    </div>

    {#if land.owner}
      <div class="flex justify-between">
        <span class="text-gray-400">Owner:</span>
        <span class="text-white font-mono text-xs">
          {land.owner === tutorialWalletStore.address
            ? 'You'
            : `${land.owner.slice(0, 6)}...${land.owner.slice(-4)}`}
        </span>
      </div>
    {/if}

    <div class="flex justify-between">
      <span class="text-gray-400">Price:</span>
      <span class="text-white">{land.sellPrice} {land.tokenUsed}</span>
    </div>

    {#if land.type === 'building'}
      <div class="flex justify-between">
        <span class="text-gray-400">Level:</span>
        <span class="text-white">{land.level}/3</span>
      </div>
    {/if}
  </div>

  <!-- Actions -->
  <div class="mt-4 space-y-2">
    {#if canBuy}
      <button
        class="w-full py-2 px-4 rounded font-medium transition-all
               {isBuyHighlighted
          ? 'bg-yellow-500 text-black animate-pulse'
          : 'bg-blue-600 hover:bg-blue-700 text-white'}"
        onclick={handleBuy}
      >
        Buy Land
      </button>
    {/if}

    {#if canUpgrade}
      <button
        class="w-full py-2 px-4 rounded font-medium transition-all
               {isUpgradeHighlighted
          ? 'bg-yellow-500 text-black animate-pulse'
          : 'bg-green-600 hover:bg-green-700 text-white'}"
        onclick={handleUpgrade}
      >
        Upgrade (Cost: {100 * land.level}
        {land.tokenUsed})
      </button>
    {/if}

    {#if land.type === 'auction'}
      <div class="bg-purple-600/20 border border-purple-500 rounded p-3">
        <div class="text-purple-300 text-sm text-center">Auction Active</div>
        <div class="text-white text-center mt-1">
          Current Bid: {tutorialLandStore.currentAuction?.currentBid}
        </div>
      </div>
    {/if}
  </div>
</div>
