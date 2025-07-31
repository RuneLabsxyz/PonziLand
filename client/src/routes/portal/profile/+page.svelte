<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import { User, Trophy } from 'lucide-svelte';
  import accountDataProvider, { setup } from '$lib/account.svelte';
  import WalletAddress from '$lib/components/ui/wallet-address/wallet-address.svelte';
  import AchievementsSection from '$lib/portal/achievements-section.svelte';

  let address = $derived(accountDataProvider.address);
  let username = $derived(
    accountDataProvider.profile?.exists
      ? accountDataProvider.profile?.username
      : undefined,
  );
</script>

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-12">
      <h1 class="text-5xl font-bold text-white mb-2">Profile</h1>
      <p class="text-gray-400 text-lg">Manage your PonziLand identity</p>
    </div>

    <!-- Profile Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- User Info Card -->
      <Card
        class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-gray-600 transition-colors"
      >
        <div class="p-8">
          <div class="flex items-center gap-4 mb-6">
            <div class="p-3 bg-gray-700/50 rounded-lg">
              <User class="w-6 h-6 text-purple-400" />
            </div>
            <h2 class="text-2xl font-semibold text-white">Account Details</h2>
          </div>
          <div class="space-y-4">
            <div class="p-4 bg-gray-900/50 rounded-lg">
              <p class="text-sm text-gray-400 mb-1">Username</p>
              <p class="text-white font-medium">{username}</p>
            </div>
            <div class="p-4 bg-gray-900/50 rounded-lg">
              <p class="text-sm text-gray-400 mb-1">Wallet Address</p>
              {#if address}
                <WalletAddress {address} class="text-white" />
              {:else}
                <p class="text-gray-500 text-sm">Not connected</p>
              {/if}
            </div>
          </div>
        </div>
      </Card>

      <!-- Stats Card -->
      <Card
        class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-gray-600 transition-colors"
      >
        <div class="p-8">
          <div class="flex items-center gap-4 mb-6">
            <div class="p-3 bg-gray-700/50 rounded-lg">
              <Trophy class="w-6 h-6 text-yellow-400" />
            </div>
            <h2 class="text-2xl font-semibold text-white">Game Stats</h2>
          </div>
          <div class="p-8 bg-gray-900/50 rounded-lg text-center">
            <p class="text-gray-400">Stats tracking coming soon</p>
            <p class="text-sm text-gray-500 mt-2">
              Game statistics are currently in development
            </p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Achievements Section -->
    <div class="mt-6">
      {#if address}
        <AchievementsSection {address} />
      {/if}
    </div>
  </div>
</div>
