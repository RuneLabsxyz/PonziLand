<script lang="ts">
  import type { Token, BuyData } from '$lib/interfaces';
  import data from '$lib/data.json';

  let { onCancel, onBuy, data: propData } = $props();

  let selectedTokens = $state<Token[]>([]);
  let manualTokenAddress = $state('');
  let manualLPAddress = $state('');
  let stakeAmount = $state('');
  let sellPrice = $state('');
  let showManualInput = $state(false);

  let availableTokens = $state<Token[]>(
    data.availableTokens.map(({ name, address, lpAddress, images }) => ({
      name,
      address,
      lpAddress,
      images,
    })),
  );

  function handleTokenSelect(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    selectedTokens = [...selectElement.selectedOptions].map(
      (option) => availableTokens[+option.value],
    );
  }

  function addManualToken() {
    if (manualTokenAddress && manualLPAddress) {
      const selectElement = document.getElementById(
        'token-select',
      ) as HTMLSelectElement;
      if (selectElement) selectElement.selectedIndex = 0;

      selectedTokens = [
        {
          name: 'Custom Token',
          address: manualTokenAddress,
          lpAddress: manualLPAddress,
          images: {
            icon: '',
            castle: {
              basic: '',
              advanced: '',
              premium: '',
            },
          },
        },
      ];
      manualTokenAddress = '';
      manualLPAddress = '';
      showManualInput = false;
    }
  }

  function handleBuyClick() {
    if (selectedTokens.length && stakeAmount && sellPrice) {
      onBuy({
        tokens: selectedTokens,
        stakeAmount,
        sellPrice,
      });
    }
  }

  function handleCancelClick() {
    onCancel();
  }
</script>

<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
>
  <div class="bg-white rounded-lg p-6 w-[800px] max-w-full">
    <h2 class="text-2xl font-bold mb-4">Buy Land</h2>

    <div class="flex gap-6">
      <div class="flex-1">
        <div class="mb-4">
          <label for="token-select" class="block text-sm font-medium mb-1"
            >Select Tokens</label
          >
          <select
            id="token-select"
            class="w-full border rounded-md p-2"
            onchange={handleTokenSelect}
          >
            <option value="">Select a token</option>
            {#each availableTokens as token, i}
              <option value={i}>{token.name}</option>
            {/each}
          </select>

          {#if selectedTokens.length > 0}
            <div class="mt-2 space-y-2">
              {#each selectedTokens as token}
                <div class="p-3 border rounded-md bg-gray-50">
                  <div class="font-medium">{token.name}</div>
                  {#if token.name === 'Custom Token'}
                    <div class="text-red-500 text-xs font-medium mb-2">
                      ⚠️ Custom token - verify addresses carefully
                    </div>
                  {/if}
                  <div class="text-sm text-gray-600">
                    <div>
                      Token Address: <a
                        href="https://voyager.online/contract/{token.address}"
                        class="text-blue-600 hover:underline"
                        title={token.address}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {token.address.slice(0, 6)}...{token.address.slice(-4)}
                      </a>
                    </div>
                    <div>
                      LP Address: <a
                        href="https://voyager.online/contract/{token.lpAddress}"
                        class="text-blue-600 hover:underline"
                        title={token.lpAddress}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {token.lpAddress.slice(0, 6)}...{token.lpAddress.slice(
                          -4,
                        )}
                      </a>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <button
          class="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
          onclick={() => (showManualInput = !showManualInput)}
        >
          <span class="mr-1">{showManualInput ? '−' : '+'}</span>
          Add Token Manually
        </button>

        {#if showManualInput}
          <div
            class="mb-4 space-y-2 border rounded-md p-3 bg-gray-50 transition-all"
          >
            <input
              type="text"
              bind:value={manualTokenAddress}
              placeholder="Token Address"
              class="w-full border rounded-md p-2"
            />
            <input
              type="text"
              bind:value={manualLPAddress}
              placeholder="LP Address"
              class="w-full border rounded-md p-2"
            />
            <button
              class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              onclick={addManualToken}
            >
              Add Token
            </button>
          </div>
        {/if}

        <div class="mb-4">
          <label for="stake-amount" class="block text-sm font-medium mb-1"
            >Stake Amount</label
          >
          <input
            id="stake-amount"
            type="number"
            bind:value={stakeAmount}
            placeholder="Enter stake amount"
            class="w-full border rounded-md p-2"
          />
        </div>

        <div class="mb-6">
          <label for="sell-price" class="block text-sm font-medium mb-1"
            >Sell Price</label
          >
          <input
            id="sell-price"
            type="number"
            bind:value={sellPrice}
            placeholder="Enter sell price"
            class="w-full border rounded-md p-2"
          />
        </div>
      </div>

      <div class="flex-1 border-l pl-6">
        <h3 class="text-xl font-semibold mb-4">Tile Information</h3>
        <div class="space-y-4">
          <div class="p-4 bg-gray-50 rounded-md">
            <div class="mb-2">
              <span class="font-medium">Location:</span>
              <span>{propData.location}</span>
            </div>
            <div class="mb-2">
              <span class="font-medium">Token Info:</span>
              <a
                href="https://voyager.online/contract/{propData.tokenAddress}"
                class="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {propData.tokenAddress.slice(
                  0,
                  6,
                )}...{propData.tokenAddress.slice(-4)}
              </a>
            </div>
            {#if propData.owner}
              <div class="mb-2">
                <span class="font-medium">Current Owner:</span>
                <a
                  href="https://voyager.online/contract/{propData.owner}"
                  class="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {propData.owner.slice(0, 6)}...{propData.owner.slice(-4)}
                </a>
              </div>
            {/if}
            <div
              class="mt-4 pt-4 border-t bg-green-100 flex items-center justify-center text-center py-4"
            >
              <span class="font-medium text-lg mr-2">Current Price:</span>
              <span class="text-xl font-bold px-2 py-1 rounded"
                >{propData.sellPrice} {propData.tokenUsed}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-end space-x-4 mt-6">
      <button
        class="px-4 py-2 border rounded-md hover:bg-gray-100"
        onclick={handleCancelClick}
      >
        Cancel
      </button>
      <button
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        onclick={handleBuyClick}
      >
        Buy
      </button>
    </div>
  </div>
</div>
