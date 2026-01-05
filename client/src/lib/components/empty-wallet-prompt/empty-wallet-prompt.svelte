<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import accountState from '$lib/account.svelte';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { emptyWalletPromptStore } from './empty-wallet-prompt.store.svelte';
  import { ENABLE_BRIDGE } from '$lib/flags';
  import { tutorialState } from '$lib/components/tutorial/stores.svelte';
  import { onMount } from 'svelte';

  // Track element positions for highlight rings
  let bridgeButtonRect = $state<DOMRect | null>(null);
  let walletAddressRect = $state<DOMRect | null>(null);
  let viewportWidth = $state(0);
  let viewportHeight = $state(0);

  // Conditions for showing the prompt
  let isConnected = $derived(accountState.isConnected);
  let totalBalance = $derived(walletStore.totalBalance);
  let hasEmptyWallet = $derived(totalBalance !== null && totalBalance.isZero());
  let inTutorial = $derived(tutorialState.tutorialEnabled);

  let showPrompt = $derived(
    isConnected &&
      hasEmptyWallet &&
      emptyWalletPromptStore.shouldShow &&
      !inTutorial,
  );

  // Track if wallet was previously funded (to reset dismissal if needed)
  let wasFunded = $state(false);

  $effect(() => {
    if (!hasEmptyWallet && totalBalance !== null) {
      wasFunded = true;
    } else if (hasEmptyWallet && wasFunded) {
      // Wallet was funded then emptied - reset dismissal
      emptyWalletPromptStore.reset();
      wasFunded = false;
    }
  });

  // Update element positions for highlights
  $effect(() => {
    if (showPrompt) {
      updatePositions();
      window.addEventListener('resize', updatePositions);
      window.addEventListener('scroll', updatePositions);

      return () => {
        window.removeEventListener('resize', updatePositions);
        window.removeEventListener('scroll', updatePositions);
      };
    }
  });

  // Auto-dismiss when bridge button is clicked
  $effect(() => {
    if (showPrompt) {
      const bridgeBtn = document.querySelector(
        '[data-highlight-target="bridge-button"]',
      );

      const handleBridgeClick = () => {
        emptyWalletPromptStore.dismiss();
      };

      if (bridgeBtn) {
        bridgeBtn.addEventListener('click', handleBridgeClick);
      }

      return () => {
        if (bridgeBtn) {
          bridgeBtn.removeEventListener('click', handleBridgeClick);
        }
      };
    }
  });

  function updatePositions() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;

    const bridgeBtn = document.querySelector(
      '[data-highlight-target="bridge-button"]',
    );
    const walletAddr = document.querySelector(
      '[data-highlight-target="wallet-address"]',
    );

    if (bridgeBtn) bridgeButtonRect = bridgeBtn.getBoundingClientRect();
    if (walletAddr) walletAddressRect = walletAddr.getBoundingClientRect();
  }

  // Delayed position update to ensure DOM is ready
  onMount(() => {
    if (showPrompt) {
      setTimeout(updatePositions, 100);
    }
  });

  function handleDismiss() {
    emptyWalletPromptStore.dismiss();
  }

  const padding = 6;
</script>

{#if showPrompt}
  <!-- Dark overlay with SVG mask for holes - pointer-events: none so clicks pass through -->
  <svg
    class="empty-wallet-overlay"
    width={viewportWidth}
    height={viewportHeight}
  >
    <defs>
      <mask id="overlay-mask">
        <!-- White = visible (darkened), Black = hidden (hole) -->
        <rect x="0" y="0" width="100%" height="100%" fill="white" />
        {#if walletAddressRect}
          <rect
            x={walletAddressRect.left - padding}
            y={walletAddressRect.top - padding}
            width={walletAddressRect.width + padding * 2}
            height={walletAddressRect.height + padding * 2}
            rx="8"
            fill="black"
          />
        {/if}
        {#if bridgeButtonRect && ENABLE_BRIDGE}
          <rect
            x={bridgeButtonRect.left - padding}
            y={bridgeButtonRect.top - padding}
            width={bridgeButtonRect.width + padding * 2}
            height={bridgeButtonRect.height + padding * 2}
            rx="8"
            fill="black"
          />
        {/if}
      </mask>
    </defs>
    <rect
      x="0"
      y="0"
      width="100%"
      height="100%"
      fill="rgba(0, 0, 0, 0.5)"
      mask="url(#overlay-mask)"
    />
  </svg>

  <!-- Lazi character with speech bubble -->
  <div class="lazi-container">
    <div class="speech-bubble">
      <Card class="p-5 max-w-sm bg-black/90 border-ponzi">
        <p class="text-base font-ponzi-number mb-3 text-white">
          Your wallet is empty! To start playing PonziLand, you'll need some
          tokens.
        </p>
        <p class="text-base font-ponzi-number mb-2 text-gray-300">You can:</p>
        <ul
          class="text-base font-ponzi-number list-disc list-inside mb-4 space-y-2 text-gray-300"
        >
          <li>
            <span class="text-cyan-400 font-bold">Bridge tokens</span> from Solana
            using the BRIDGE button
          </li>
          <li>
            <span class="text-cyan-400 font-bold">Send tokens</span> directly to your
            Starknet address (click to copy)
          </li>
        </ul>
        <div class="flex justify-end">
          <Button size="lg" onclick={handleDismiss}>Got it!</Button>
        </div>
      </Card>
      <!-- Speech bubble pointer pointing right toward wallet -->
      <div class="speech-pointer"></div>
    </div>
    <img src="/tutorial/ponziworker_1.png" alt="Lazi" class="lazi-image" />
  </div>

  <!-- Highlight ring around wallet address -->
  {#if walletAddressRect}
    <div
      class="highlight-ring"
      style="
        top: {walletAddressRect.top - 6}px;
        left: {walletAddressRect.left - 6}px;
        width: {walletAddressRect.width + 12}px;
        height: {walletAddressRect.height + 12}px;
      "
    ></div>
  {/if}

  <!-- Highlight ring around bridge button -->
  {#if bridgeButtonRect && ENABLE_BRIDGE}
    <div
      class="highlight-ring"
      style="
        top: {bridgeButtonRect.top - 6}px;
        left: {bridgeButtonRect.left - 6}px;
        width: {bridgeButtonRect.width + 12}px;
        height: {bridgeButtonRect.height + 12}px;
      "
    ></div>
  {/if}
{/if}

<style>
  .empty-wallet-overlay {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 10000;
    pointer-events: none;
  }

  .lazi-container {
    position: fixed;
    top: 80px;
    right: 420px;
    z-index: 10002;
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    gap: 0;
  }

  .lazi-image {
    width: 120px;
    height: auto;
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
    animation: float 3s ease-in-out infinite;
  }

  .speech-bubble {
    position: relative;
    animation: float 3s ease-in-out infinite;
    animation-delay: 0.2s;
  }

  .speech-pointer {
    position: absolute;
    right: -16px;
    top: 40px;
    width: 0;
    height: 0;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-left: 16px solid rgba(0, 0, 0, 0.9);
  }

  .highlight-ring {
    position: fixed;
    pointer-events: none;
    z-index: 10003;
    border: 2px solid rgba(59, 130, 246, 0.9);
    border-radius: 8px;
    animation: pulse-ring 2s ease-in-out infinite;
  }

  @keyframes pulse-ring {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
    }
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-8px);
    }
  }
</style>
