<script lang="ts">
  import type { TransferStatus, RelayStatus } from '$lib/bridge/types';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import { cn } from '$lib/utils';

  interface Props {
    status: TransferStatus;
    txHashes: string[];
    sourceChain: 'starknet' | 'solanamainnet';
    destChain: 'starknet' | 'solanamainnet';
    error?: string | null;
    relayStatus?: RelayStatus | null;
    destinationTxHash?: string | null;
  }

  let {
    status,
    txHashes,
    sourceChain,
    destChain,
    error,
    relayStatus = null,
    destinationTxHash = null,
  }: Props = $props();

  const isDelivered = $derived(
    relayStatus === 'delivered' || status === 'delivered',
  );

  interface Step {
    id: string;
    label: string;
    description: string;
  }

  const steps: Step[] = [
    {
      id: 'prepare',
      label: 'Prepare',
      description: 'Getting quote & building transaction',
    },
    { id: 'sign', label: 'Sign', description: 'Confirm in your wallet' },
    {
      id: 'source',
      label: 'Source',
      description: 'Transaction on source chain',
    },
    { id: 'relay', label: 'Relay', description: 'Cross-chain message relay' },
    { id: 'done', label: 'Done', description: 'Transfer complete' },
  ];

  const currentStepIndex = $derived.by(() => {
    // Relay states take precedence when in relaying status
    if (status === 'relaying' || status === 'delivered') {
      if (relayStatus === 'delivered') return 4; // Done
      if (
        relayStatus === 'relaying' ||
        relayStatus === 'pending_message_id' ||
        relayStatus === 'timeout'
      )
        return 3; // Relay
    }

    switch (status) {
      case 'fetching_quote':
      case 'building_tx':
        return 0;
      case 'signing':
        return 1;
      case 'sending':
        return 2;
      case 'relaying':
        return 3;
      case 'delivered':
      case 'success':
        return 4;
      case 'error':
      case 'relay_error':
        return -1;
      default:
        return -1;
    }
  });

  const isRelayTimeout = $derived(relayStatus === 'timeout');

  const isActive = $derived(status !== 'idle');

  function getStepState(
    index: number,
  ): 'completed' | 'active' | 'pending' | 'error' | 'timeout' {
    if (status === 'error' && index === currentStepIndex + 1) return 'error';
    // Show timeout state for relay step
    if (index === 3 && isRelayTimeout && currentStepIndex === 3)
      return 'timeout';
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'active';
    return 'pending';
  }

  function getSourceExplorerUrl(hash: string): string {
    if (sourceChain === 'starknet') {
      return `https://starkscan.co/tx/${hash}`;
    }
    return `https://solscan.io/tx/${hash}`;
  }

  function getDestExplorerUrl(hash: string): string {
    if (destChain === 'starknet') {
      return `https://starkscan.co/tx/${hash}`;
    }
    return `https://solscan.io/tx/${hash}`;
  }

  function getHyperlaneExplorerUrl(hash: string): string {
    return `https://explorer.hyperlane.xyz/?search=${hash}`;
  }

  const sourceChainName = $derived(
    sourceChain === 'starknet' ? 'Starknet' : 'Solana',
  );
  const destChainName = $derived(
    destChain === 'starknet' ? 'Starknet' : 'Solana',
  );
</script>

{#if isActive}
  <div
    class="flex flex-col gap-3 p-3 rounded-lg bg-[#1a1a2e]/80 border border-[#ffffff15] relative overflow-hidden"
  >
    <!-- Confetti animation on delivery -->
    {#if isDelivered}
      <div class="confetti-container">
        {#each Array(20) as _, i}
          <div
            class="confetti"
            style="--delay: {i * 0.1}s; --x: {Math.random() * 100}%; --color: {[
              '#10b981',
              '#34d399',
              '#6ee7b7',
              '#fbbf24',
              '#f59e0b',
            ][i % 5]}"
          ></div>
        {/each}
      </div>
    {/if}
    <!-- Steps indicator -->
    <div class="flex items-center justify-between">
      {#each steps as step, i}
        {@const state = getStepState(i)}
        <div class="flex flex-col items-center flex-1">
          <!-- Step circle -->
          <div
            class={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              {
                'bg-green-500/20 text-green-400 border border-green-500/50':
                  state === 'completed' || (i === 4 && isDelivered),
                'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50':
                  state === 'active' && !(i === 4 && isDelivered),
                'bg-gray-700/50 text-gray-500 border border-gray-600/30':
                  state === 'pending',
                'bg-red-500/20 text-red-400 border border-red-500/50':
                  state === 'error',
                'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50':
                  state === 'timeout',
              },
            )}
          >
            {#if state === 'completed' || (i === 4 && isDelivered)}
              ✓
            {:else if state === 'active'}
              <RotatingCoin />
            {:else if state === 'error'}
              ✗
            {:else if state === 'timeout'}
              <RotatingCoin />
            {:else}
              {i + 1}
            {/if}
          </div>
          <!-- Step label -->
          <span
            class={cn('text-[10px] mt-1 text-center', {
              'text-green-400':
                state === 'completed' || (i === 4 && isDelivered),
              'text-cyan-400': state === 'active' && !(i === 4 && isDelivered),
              'text-gray-500': state === 'pending',
              'text-red-400': state === 'error',
              'text-yellow-400': state === 'timeout',
            })}
          >
            {step.label}
          </span>
        </div>
        <!-- Connector line -->
        {#if i < steps.length - 1}
          <div
            class={cn(
              'flex-1 h-0.5 mx-1 -mt-4',
              getStepState(i) === 'completed'
                ? 'bg-green-500/50'
                : 'bg-gray-700/50',
            )}
          ></div>
        {/if}
      {/each}
    </div>

    <!-- Current step description -->
    <div class="text-center">
      {#if status === 'fetching_quote'}
        <p class="text-sm text-cyan-400">Getting quote...</p>
        <p class="text-xs text-gray-500">Checking fees and collateral</p>
      {:else if status === 'building_tx'}
        <p class="text-sm text-cyan-400">Building transaction...</p>
        <p class="text-xs text-gray-500">Preparing your transfer</p>
      {:else if status === 'signing'}
        <p class="text-sm text-cyan-400">Awaiting signature...</p>
        <p class="text-xs text-gray-500">
          Please confirm in your {sourceChainName} wallet
        </p>
      {:else if status === 'sending'}
        <p class="text-sm text-cyan-400">Sending transaction...</p>
        <p class="text-xs text-gray-500">Submitting to {sourceChainName}</p>
      {:else if status === 'relaying' && relayStatus === 'timeout'}
        <p class="text-sm text-yellow-400">Taking longer than usual...</p>
        <p class="text-xs text-yellow-400/70">
          Transfer is still in progress. This can take up to 30 minutes during
          network congestion.
        </p>
      {:else if status === 'relaying' && (relayStatus === 'pending_message_id' || relayStatus === 'relaying')}
        <p class="text-sm text-cyan-400">Relaying message...</p>
        <p class="text-xs text-gray-500">
          Cross-chain transfer in progress. This typically takes 1-5 minutes.
        </p>
      {:else if relayStatus === 'delivered' || status === 'delivered'}
        <p class="text-sm text-green-400">Transfer complete!</p>
        <p class="text-xs text-gray-500">
          Funds delivered to {destChainName}
        </p>
      {:else if status === 'success'}
        <p class="text-sm text-green-400">Transfer initiated!</p>
        <p class="text-xs text-gray-500">
          Relaying to {destChainName}. This typically takes 1-5 minutes.
        </p>
      {:else if (status === 'error' || status === 'relay_error') && error}
        <p class="text-sm text-red-400">Transfer failed</p>
        <p class="text-xs text-red-400/70">{error}</p>
      {/if}
    </div>

    <!-- Transaction links -->
    {#if txHashes.length > 0}
      <div class="flex flex-col gap-1 pt-2 border-t border-[#ffffff10]">
        <div class="flex items-center justify-center gap-3 text-xs flex-wrap">
          <a
            href={getSourceExplorerUrl(txHashes[0])}
            target="_blank"
            rel="noopener noreferrer"
            class="text-cyan-400 hover:text-cyan-300 underline"
          >
            View on {sourceChainName}
          </a>
          <span class="text-gray-600">•</span>
          <a
            href={getHyperlaneExplorerUrl(txHashes[0])}
            target="_blank"
            rel="noopener noreferrer"
            class="text-cyan-400 hover:text-cyan-300 underline"
          >
            Track on Hyperlane
          </a>
          {#if destinationTxHash}
            <span class="text-gray-600">•</span>
            <a
              href={getDestExplorerUrl(destinationTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              class="text-green-400 hover:text-green-300 underline"
            >
              View on {destChainName}
            </a>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .confetti-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .confetti {
    position: absolute;
    width: 8px;
    height: 8px;
    background: var(--color);
    left: var(--x);
    top: -10px;
    border-radius: 2px;
    animation: confetti-fall 2s ease-out forwards;
    animation-delay: var(--delay);
    opacity: 0;
  }

  @keyframes confetti-fall {
    0% {
      opacity: 1;
      transform: translateY(0) rotate(0deg) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateY(120px) rotate(720deg) scale(0.5);
    }
  }
</style>
