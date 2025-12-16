<script lang="ts">
  import { refresh } from '$lib/account.svelte';
  import { checkUsername, register } from '$lib/accounts/social/index.svelte';
  import { debounce } from '$lib/utils/debounce.svelte';
  import { Button } from '$lib/components/ui/button';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { usernameStore } from '$lib/stores/username.store.svelte';

  let username = $state('');
  let usernameError: string | undefined = $state();
  let checking = $state(false);

  let registerError: string | undefined = $state();

  let loading = $state(false);

  let debouncedUsername = debounce(() => username);

  $effect(() => {
    if (username.length > 0) {
      checking = true;
    }
  });

  $effect(() => {
    if ((debouncedUsername.current?.length ?? 0) > 0) {
      const usernameVal = debouncedUsername.current!.toLowerCase();

      checkUsername(usernameVal).then((error) => {
        usernameError = error == true ? undefined : error;
        checking = false;
      });
    } else {
      usernameError = undefined;
    }
  });

  async function handleRegister() {
    loading = true;
    registerError = undefined;

    const usernameLower = username!.toLowerCase();

    try {
      await register(usernameLower);

      await refresh();
      usernameStore.refetch();
      loading = false;

      // Close the widget after successful registration
      widgetsStore.closeWidget('username');
    } catch (error) {
      console.error('Got: ', error);
      registerError =
        error instanceof Error ? error.message : (error as any).toString();

      loading = false;
    }
  }
</script>

<div class="flex flex-col items-center p-4">
  <div class="flex flex-col items-center space-y-4">
    <h2 class="text-xl font-bold">Select a username</h2>
    <p class="text-gray-300 text-sm text-center">
      Choose a username to start your journey.
    </p>
    <p class="text-sm text-center">
      Once you settled on a choice, click on register, and confirm the request
      with your wallet.
    </p>

    <div class="w-full max-w-md">
      <input
        type="text"
        bind:value={username}
        placeholder="Enter username"
        class="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:border-primary-500 focus:outline-none lowercase"
      />
      <div class="p-2 text-sm">
        {#if checking}
          <span class="text-gray-400">Checking availability...</span>
        {:else if usernameError != undefined}
          <span class="text-red-500">{usernameError}</span>
        {:else if (debouncedUsername.current?.length ?? 0) > 0}
          <span class="text-green-500">Username available</span>
        {/if}
      </div>
    </div>

    {#if registerError != undefined}
      <div class="p-2">
        <span class="text-red-500 text-sm">{registerError}</span>
      </div>
    {/if}

    {#if loading}
      <div class="flex items-center justify-center">
        Registering<ThreeDots />
      </div>
    {:else}
      <Button
        onclick={handleRegister}
        class="px-6 py-2"
        disabled={!username.trim() || usernameError !== undefined || checking}
      >
        Register
      </Button>
    {/if}
  </div>
</div>
