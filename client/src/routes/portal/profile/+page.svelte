<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import { User, Trophy, Activity, Settings } from 'lucide-svelte';
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
              <p class="text-white font-medium">Loading...</p>
            </div>
            <div class="p-4 bg-gray-900/50 rounded-lg">
              <p class="text-sm text-gray-400 mb-1">Wallet Address</p>
              <p class="text-white font-mono text-sm">Not connected</p>
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
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 bg-gray-900/50 rounded-lg text-center">
              <p class="text-2xl font-bold text-white">0</p>
              <p class="text-sm text-gray-400">Lands Owned</p>
            </div>
            <div class="p-4 bg-gray-900/50 rounded-lg text-center">
              <p class="text-2xl font-bold text-white">0</p>
              <p class="text-sm text-gray-400">Total Earnings</p>
            </div>
            <div class="p-4 bg-gray-900/50 rounded-lg text-center">
              <p class="text-2xl font-bold text-white">0</p>
              <p class="text-sm text-gray-400">Auctions Won</p>
            </div>
            <div class="p-4 bg-gray-900/50 rounded-lg text-center">
              <p class="text-2xl font-bold text-white">0</p>
              <p class="text-sm text-gray-400">Rank</p>
            </div>
          </div>
        </div>
      </Card>

      <!-- Activity Card -->
      <Card
        class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-gray-600 transition-colors"
      >
        <div class="p-8">
          <div class="flex items-center gap-4 mb-6">
            <div class="p-3 bg-gray-700/50 rounded-lg">
              <Activity class="w-6 h-6 text-green-400" />
            </div>
            <h2 class="text-2xl font-semibold text-white">Recent Activity</h2>
          </div>
          <div class="space-y-3">
            <p class="text-gray-400 text-center py-8">No recent activity</p>
          </div>
        </div>
      </Card>

      <!-- Settings Card -->
      <Card
        class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-gray-600 transition-colors"
      >
        <div class="p-8">
          <div class="flex items-center gap-4 mb-6">
            <div class="p-3 bg-gray-700/50 rounded-lg">
              <Settings class="w-6 h-6 text-blue-400" />
            </div>
            <h2 class="text-2xl font-semibold text-white">Preferences</h2>
          </div>
          <div class="space-y-4">
            <label
              class="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors"
            >
              <span class="text-white">Sound Effects</span>
              <input type="checkbox" class="toggle" />
            </label>
            <label
              class="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors"
            >
              <span class="text-white">Notifications</span>
              <input type="checkbox" class="toggle" />
            </label>
          </div>
        </div>
      </Card>
    </div>
  </div>
</div>
