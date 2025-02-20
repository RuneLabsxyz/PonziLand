<script lang="ts">
  import type { LandSetup } from '$lib/api/land.svelte';
  import { useLands } from '$lib/api/land.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { Token } from '$lib/interfaces';
  import type { Auction } from '$lib/models.gen';
  import {
    selectedLand,
    selectedLandMeta,
    uiStore,
    type SelectedLand,
  } from '$lib/stores/stores.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { onMount } from 'svelte';
  import BuySellForm from '../buy/buy-sell-form.svelte';
  import LandOverview from '../land/land-overview.svelte';
  import ThreeDots from '../loading/three-dots.svelte';
  import { Card } from '../ui/card';
  import CloseButton from '../ui/close-button.svelte';
  import { debounce } from '$lib/utils/debounce.svelte';

  let accountManager = useAccount();
  let username = $state('');
  let usernameAvailable = $state(true);
  let checking = $state(false);

  let debouncedUsername = debounce(() => username);

  $effect(() => {
    if (debouncedUsername.length > 0) {
      checking = true;
      checkUsername(debouncedUsername).then((available) => {
        usernameAvailable = available;
        checking = false;
      });
    } else {
      usernameAvailable = true;
    }
  });

  function handleCancelClick() {
    uiStore.showModal = false;
    uiStore.modalData = null;
  }

  function handleRegister() {}
</script>

<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
>
  <Card class="flex flex-col min-w-96 min-h-96 bg-ponzi">
    <CloseButton onclick={handleCancelClick} />

    <h2 class="text-2xl">Buy Land</h2>
    <div class="flex flex-col items-center">
      <div class="flex flex-col items-center space-y-6">
        <h2 class="text-2xl font-bold">Welcome to PonziLand</h2>
        <p class="text-center text-gray-300">
          Choose a username to start your journey
        </p>

        <div class="w-full max-w-md">
          <input
            type="text"
            bind:value={username}
            placeholder="Enter username"
            class="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:border-primary-500 focus:outline-none"
          />
        </div>

        <button
          on:click={handleRegister}
          class="px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg font-semibold transition-colors"
          disabled={!username.trim()}
        >
          Register
        </button>

        <p class="text-sm text-gray-400">
          By registering, you'll be asked to sign a message with your wallet
        </p>
      </div>
    </div>
  </Card>
</div>
