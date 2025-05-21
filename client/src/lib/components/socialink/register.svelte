<script lang="ts">
  import { refresh } from '$lib/account.svelte';
  import { checkUsername, register } from '$lib/accounts/social/index.svelte';
  import { debounce } from '$lib/utils/debounce.svelte';
  import { Button } from '$lib/components/ui/button';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';

  const {
    onfinish,
  }: {
    onfinish?: (user: string) => void;
  } = $props();

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

  $inspect('usernameError', usernameError);

  $effect(() => {
    if ((debouncedUsername.current?.length ?? 0) > 0) {
      const username = debouncedUsername.current!.toLowerCase();

      checkUsername(username).then((error) => {
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
      loading = false;

      if (onfinish) {
        onfinish(usernameLower);
      }
    } catch (error) {
      console.error('Got: ', error);
      registerError =
        error instanceof Error ? error.message : (error as any).toString();

      loading = false;
    }
  }
</script>

<div class="flex flex-col items-center max-w-96 p-2">
  <div class="flex flex-col items-center space-y-6">
    <h2 class="text-2xl font-bold mt-5">Select a username</h2>
    <p class="text-gray-300">Choose a username to start your journey.</p>
    <p>
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
      <div class="p-2">
        {#if checking}
          <span class="text-gray-400">Checking availability...</span>
        {:else if usernameError != undefined}
          <span class="text-red-500">{usernameError}</span>
        {:else if debouncedUsername.current?.length ?? 0 > 0}
          <span class="text-green-500">Username available</span>
        {/if}
      </div>
    </div>

    {#if registerError != undefined}
      <div class="p-2">
        <span class="text-red-500">{registerError}</span>
      </div>
    {/if}

    {#if loading}
      <div class="flex items-center justify-center">
        Registering<ThreeDots />
      </div>
    {:else}
      <Button
        onclick={handleRegister}
        class="px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg font-semibold transition-colors "
        disabled={!username.trim()}
      >
        Register
      </Button>
    {/if}
  </div>
</div>
