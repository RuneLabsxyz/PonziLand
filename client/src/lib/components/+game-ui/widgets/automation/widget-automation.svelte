<script lang="ts">
  import {
    automationStore,
    type AutomationRule,
  } from '$lib/stores/automation.store.svelte';
  import { landStore } from '$lib/stores/store.svelte';
  import { getBaseToken } from '$lib/stores/wallet.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { notificationQueue } from '$lib/stores/event.store.svelte';
  import {
    findMatchingLands,
    buildAutomationPreview,
    executeAutomation,
    type AutomationPreview,
  } from '$lib/utils/automation-executor';
  import { Label } from '$lib/components/ui/label';
  import Input from '$lib/components/ui/input/input.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { Slider } from '$lib/components/ui/slider';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import data from '$profileData';
  import type { Snippet } from 'svelte';
  import { get } from 'svelte/store';

  type Props = {
    setCustomTitle?: (title: Snippet<[]> | null) => void;
    setCustomControls?: (controls: Snippet<[]> | null) => void;
  };

  let { setCustomTitle }: Props = $props();

  const { client: sdk, accountManager } = useDojo();

  // View state
  type ViewMode = 'list' | 'create' | 'edit' | 'preview';
  let viewMode = $state<ViewMode>('list');
  let editingRuleId = $state<string | null>(null);

  // Form state
  let formName = $state('');
  let formType = $state<'auction-buy' | 'land-snipe'>('auction-buy');
  let formTokens = $state<string[]>([]);
  let formMaxPriceUsd = $state<string>('');
  let formSellPricePercent = $state(0);
  let formStakePercent = $state(200);

  // Preview state
  let previewRule = $state<AutomationRule | null>(null);
  let previewData = $state<AutomationPreview | null>(null);
  let isExecuting = $state(false);
  let selectedMatches = $state<Set<number>>(new Set());

  // Derived
  let allLands = $derived(get(landStore.getAllLands()));
  let baseToken = $derived(getBaseToken());

  // Set custom title
  $effect(() => {
    if (setCustomTitle) {
      setCustomTitle(titleSnippet);
    }
  });

  function resetForm() {
    formName = '';
    formType = 'auction-buy';
    formTokens = [];
    formMaxPriceUsd = '';
    formSellPricePercent = 0;
    formStakePercent = 200;
    editingRuleId = null;
  }

  function startCreate(type: 'auction-buy' | 'land-snipe') {
    resetForm();
    formType = type;
    formName = type === 'auction-buy' ? 'New Auction Buy' : 'New Land Snipe';
    viewMode = 'create';
  }

  function startEdit(rule: AutomationRule) {
    editingRuleId = rule.id;
    formName = rule.name;
    formType = rule.type;
    formTokens = [...rule.filters.tokens];
    formMaxPriceUsd = rule.filters.maxPriceUsd?.toString() ?? '';
    formSellPricePercent = rule.settings.sellPricePercent;
    formStakePercent = rule.settings.stakePercent;
    viewMode = 'edit';
  }

  function saveRule() {
    const ruleData = {
      name: formName,
      type: formType,
      enabled: true,
      filters: {
        tokens: formTokens,
        maxPriceUsd: formMaxPriceUsd ? parseFloat(formMaxPriceUsd) : undefined,
      },
      settings: {
        sellPricePercent: formSellPricePercent,
        stakePercent: formStakePercent,
      },
    };

    if (editingRuleId) {
      automationStore.updateRule(editingRuleId, ruleData);
    } else {
      automationStore.addRule(ruleData);
    }

    resetForm();
    viewMode = 'list';
  }

  function deleteRule(id: string) {
    automationStore.deleteRule(id);
  }

  function runRule(rule: AutomationRule) {
    previewRule = rule;
    const matches = findMatchingLands(rule, allLands);
    previewData = buildAutomationPreview(matches);
    selectedMatches = new Set(matches.map((_, i) => i));
    viewMode = 'preview';
  }

  async function executeSelected() {
    if (!previewData || !previewRule) return;

    const walletAccount = accountManager?.getProvider()?.getWalletAccount();
    if (!walletAccount) return;

    const matchesToExecute = previewData.matches.filter((_, i) =>
      selectedMatches.has(i),
    );

    if (matchesToExecute.length === 0) return;

    isExecuting = true;
    try {
      const result = await executeAutomation(
        matchesToExecute,
        walletAccount,
        sdk.provider,
      );

      if (result?.transaction_hash) {
        notificationQueue.addNotification(
          result.transaction_hash,
          `automation: ${matchesToExecute.length} actions`,
        );
      }

      viewMode = 'list';
      previewRule = null;
      previewData = null;
    } catch (error) {
      console.error('Automation execution failed:', error);
      notificationQueue.addNotification(null, 'Automation failed');
    } finally {
      isExecuting = false;
    }
  }

  function toggleMatch(index: number) {
    const newSet = new Set(selectedMatches);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    selectedMatches = newSet;
  }

  function toggleToken(tokenAddress: string) {
    if (formTokens.includes(tokenAddress)) {
      formTokens = formTokens.filter((t) => t !== tokenAddress);
    } else {
      formTokens = [...formTokens, tokenAddress];
    }
  }

  function formatLocation(locationString: string): string {
    const loc = parseInt(locationString, 16);
    const x = loc % 64;
    const y = Math.floor(loc / 64);
    return `(${x}, ${y})`;
  }
</script>

{#snippet titleSnippet()}
  <div class="flex items-center gap-2">
    <span>Automation</span>
  </div>
{/snippet}

<div class="flex flex-col h-full p-4 overflow-hidden">
  {#if viewMode === 'list'}
    <!-- List View -->
    <div class="flex gap-2 mb-4">
      <button
        class="flex-1 px-3 py-2 text-sm rounded border border-white/30 hover:bg-white/10 transition-all"
        onclick={() => startCreate('auction-buy')}
      >
        + Auction Buy
      </button>
      <button
        class="flex-1 px-3 py-2 text-sm rounded border border-white/30 hover:bg-white/10 transition-all"
        onclick={() => startCreate('land-snipe')}
      >
        + Land Snipe
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      {#if automationStore.rules.length === 0}
        <div class="text-center text-gray-400 py-8">
          <p>No automations yet.</p>
          <p class="text-sm mt-2">
            Create one to batch-buy auctions or snipe lands!
          </p>
        </div>
      {:else}
        <div class="flex flex-col gap-2">
          {#each automationStore.rules as rule}
            <div
              class="border border-white/20 rounded-lg p-3 hover:bg-white/5 transition-colors"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium">{rule.name}</span>
                <div class="flex gap-1">
                  <button
                    class="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20"
                    onclick={() => startEdit(rule)}
                  >
                    Edit
                  </button>
                  <button
                    class="px-2 py-1 text-xs rounded bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400"
                    onclick={() => runRule(rule)}
                  >
                    Run
                  </button>
                  <button
                    class="px-2 py-1 text-xs rounded bg-red-500/20 hover:bg-red-500/30 text-red-400"
                    onclick={() => deleteRule(rule.id)}
                  >
                    Del
                  </button>
                </div>
              </div>
              <div class="text-xs text-gray-400">
                {rule.type === 'auction-buy' ? 'Auction Buy' : 'Land Snipe'}
                {#if rule.filters.maxPriceUsd}
                  • Max ${rule.filters.maxPriceUsd}
                {/if}
                {#if rule.filters.tokens.length > 0}
                  • {rule.filters.tokens.length} tokens
                {:else}
                  • All tokens
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else if viewMode === 'create' || viewMode === 'edit'}
    <!-- Create/Edit Form -->
    <div class="flex-1 overflow-y-auto">
      <h3 class="font-medium mb-4">
        {viewMode === 'create' ? 'Create' : 'Edit'}
        {formType === 'auction-buy' ? 'Auction Buy' : 'Land Snipe'}
      </h3>

      <div class="flex flex-col gap-4">
        <!-- Name -->
        <div class="flex flex-col gap-1">
          <Label for="name">Name</Label>
          <Input
            id="name"
            type="text"
            bind:value={formName}
            placeholder="Automation name"
          />
        </div>

        <!-- Token Filter -->
        <div class="flex flex-col gap-2">
          <Label>Tokens (empty = all)</Label>
          <div class="flex flex-wrap gap-1">
            {#each data.availableTokens as token}
              <button
                type="button"
                class={[
                  'flex items-center gap-1 px-2 py-1 rounded border text-xs transition-all',
                  {
                    'border-yellow-500 bg-yellow-500/20': formTokens.includes(
                      token.address,
                    ),
                    'border-white/30 hover:bg-white/10': !formTokens.includes(
                      token.address,
                    ),
                  },
                ]}
                onclick={() => toggleToken(token.address)}
              >
                <TokenAvatar {token} class="h-4 w-4" />
                {token.symbol}
              </button>
            {/each}
          </div>
        </div>

        <!-- Max Price -->
        <div class="flex flex-col gap-1">
          <Label for="maxPrice">Max Price (USD equivalent)</Label>
          <Input
            id="maxPrice"
            type="number"
            bind:value={formMaxPriceUsd}
            placeholder="e.g. 10"
          />
        </div>

        <!-- Sell Price % -->
        <div class="flex flex-col gap-2">
          <div class="flex justify-between">
            <Label>Sell Price Offset</Label>
            <span class="text-sm text-gray-400">
              {formSellPricePercent >= 0 ? '+' : ''}{formSellPricePercent}%
            </span>
          </div>
          <div class="flex flex-wrap gap-1 mb-1">
            {#each [-50, -25, -10, 0, 10, 25, 50, 100] as preset}
              <button
                type="button"
                class={[
                  'px-2 py-1 rounded border text-xs transition-all',
                  {
                    'border-yellow-500 bg-yellow-500/20':
                      formSellPricePercent === preset,
                    'border-white/30 hover:bg-white/10':
                      formSellPricePercent !== preset,
                  },
                ]}
                onclick={() => (formSellPricePercent = preset)}
              >
                {preset >= 0 ? '+' : ''}{preset}%
              </button>
            {/each}
          </div>
          <Slider
            type="single"
            min={-50}
            max={100}
            step={1}
            value={formSellPricePercent}
            onValueChange={(v) => (formSellPricePercent = v)}
          />
        </div>

        <!-- Stake % -->
        <div class="flex flex-col gap-2">
          <div class="flex justify-between">
            <Label>Stake Amount</Label>
            <span class="text-sm text-gray-400">
              {formStakePercent >= 100
                ? `${formStakePercent / 100}x`
                : `${formStakePercent}%`}
            </span>
          </div>
          <div class="flex flex-wrap gap-1 mb-1">
            {#each [10, 25, 50, 100, 200, 300, 500, 1000] as preset}
              <button
                type="button"
                class={[
                  'px-2 py-1 rounded border text-xs transition-all',
                  {
                    'border-yellow-500 bg-yellow-500/20':
                      formStakePercent === preset,
                    'border-white/30 hover:bg-white/10':
                      formStakePercent !== preset,
                  },
                ]}
                onclick={() => (formStakePercent = preset)}
              >
                {preset >= 100 ? `${preset / 100}x` : `${preset}%`}
              </button>
            {/each}
          </div>
          <Slider
            type="single"
            min={10}
            max={1000}
            step={10}
            value={formStakePercent}
            onValueChange={(v) => (formStakePercent = v)}
          />
        </div>
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex gap-2 mt-4 pt-4 border-t border-white/10">
      <button
        class="flex-1 px-3 py-2 text-sm rounded border border-white/30 hover:bg-white/10 transition-all"
        onclick={() => {
          resetForm();
          viewMode = 'list';
        }}
      >
        Cancel
      </button>
      <Button class="flex-1" onclick={saveRule}>
        {viewMode === 'create' ? 'Create' : 'Save'}
      </Button>
    </div>
  {:else if viewMode === 'preview'}
    <!-- Preview View -->
    <div class="flex-1 overflow-y-auto">
      <h3 class="font-medium mb-2">
        Preview: {previewRule?.name}
      </h3>

      {#if previewData}
        {#if previewData.matches.length === 0}
          <div class="text-center text-gray-400 py-8">
            <p>No matching lands found.</p>
            <p class="text-sm mt-2">Try adjusting your filters.</p>
          </div>
        {:else}
          <p class="text-sm text-gray-400 mb-3">
            Found {previewData.matches.length} matching
            {previewRule?.type === 'auction-buy' ? 'auctions' : 'lands'}:
          </p>

          <div class="flex flex-col gap-1 mb-4">
            {#each previewData.matches as match, i}
              <button
                class={[
                  'flex items-center gap-2 p-2 rounded border text-left transition-all',
                  {
                    'border-yellow-500 bg-yellow-500/10':
                      selectedMatches.has(i),
                    'border-white/20 hover:bg-white/5': !selectedMatches.has(i),
                  },
                ]}
                onclick={() => toggleMatch(i)}
              >
                <input
                  type="checkbox"
                  checked={selectedMatches.has(i)}
                  class="pointer-events-none"
                />
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <TokenAvatar token={match.landToken} class="h-4 w-4" />
                    <span class="text-sm">
                      Land {formatLocation(match.land.locationString)}
                    </span>
                  </div>
                  <div class="text-xs text-gray-400">
                    {match.cost.toString()}
                    {match.landToken.symbol}
                    {#if match.costInBaseToken && baseToken}
                      (≈ {match.costInBaseToken.toString()}
                      {baseToken.symbol})
                    {/if}
                  </div>
                </div>
              </button>
            {/each}
          </div>

          <!-- Summary -->
          <div class="border-t border-white/10 pt-3">
            {#if previewData.totalCostInBaseToken && baseToken}
              <p class="text-sm">
                Total: ≈ {previewData.totalCostInBaseToken.toString()}
                {baseToken.symbol}
              </p>
            {/if}

            {#if previewData.balanceWarnings.length > 0}
              <div class="mt-2">
                {#each previewData.balanceWarnings as warning}
                  <p class="text-xs text-red-400">{warning}</p>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/if}
    </div>

    <!-- Preview Actions -->
    <div class="flex gap-2 mt-4 pt-4 border-t border-white/10">
      <button
        class="flex-1 px-3 py-2 text-sm rounded border border-white/30 hover:bg-white/10 transition-all"
        onclick={() => {
          viewMode = 'list';
          previewRule = null;
          previewData = null;
        }}
      >
        Cancel
      </button>
      <Button
        class="flex-1"
        disabled={isExecuting ||
          selectedMatches.size === 0 ||
          previewData?.insufficientBalance}
        onclick={executeSelected}
      >
        {#if isExecuting}
          Executing...
        {:else}
          Execute {selectedMatches.size} Actions
        {/if}
      </Button>
    </div>
  {/if}
</div>
