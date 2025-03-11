<script lang="ts">
  import { uiStore } from '$lib/stores/stores.svelte';
  import { Card } from '../ui/card';
  import CloseButton from '../ui/close-button.svelte';
  import { debounce } from '$lib/utils/debounce.svelte';
  import { checkUsername, register } from '$lib/accounts/social/index.svelte';
  import { Button } from '../ui/button';
  import ThreeDots from '../loading/three-dots.svelte';
  import { refresh } from '$lib/account.svelte';

  let username = $state('');
  let usernameAvailable = $state(true);
  let checking = $state(false);

  let loading = $state(false);

  let debouncedUsername = debounce(() => username);

  $effect(() => {
    if (username.length > 0) {
      checking = true;
    }
  });

  $effect(() => {
    if ((debouncedUsername.current?.length ?? 0) > 0) {
      checkUsername(debouncedUsername.current!).then((available) => {
        usernameAvailable = available;
        checking = false;
      });
    } else {
      usernameAvailable = true;
    }
  });

  async function handleRegister() {
    loading = true;

    try {
      await register(username);

      refresh();
      loading = false;
    } catch (error) {
      console.error(error);
      loading = false;
    }
  }
</script>

<div class="fixed inset-0 flex items-center justify-center z-40 bg-[#322637]">
  <Card class="flex flex-col min-w-96 min-h-96 bg-ponzi">
    <div class="flex flex-col items-center">
      <div class="flex flex-col items-center space-y-6">
        <h2 class="text-2xl font-bold mt-5">Welcome to PonziLand</h2>
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
          <div class="p-2">
            {#if checking}
              <span class="text-gray-400">Checking availability...</span>
            {:else if !usernameAvailable}
              <span class="text-red-500">Username already taken</span>
            {:else if debouncedUsername.current?.length ?? 0 > 0}
              <span class="text-green-500">Username available</span>
            {/if}
          </div>
        </div>

        {#if loading}
          <div class="flex items-center justify-center">
            <ThreeDots />
          </div>
        {:else}
          <Button
            onclick={handleRegister}
            class="px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg font-semibold transition-colors"
            disabled={!username.trim()}
          >
            Register
          </Button>
        {/if}

        <p class="text-sm text-gray-400">
          By registering, you'll be asked to sign a message with your wallet
        </p>
      </div>
    </div>
  </Card>
</div>
