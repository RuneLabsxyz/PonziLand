<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, Coins, TrendingUp } from 'lucide-svelte';
  import Button from '$lib/components/ui/button/button.svelte';
</script>

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-12">
      <h1 class="text-5xl font-bold text-white mb-2">Wallet</h1>
      <p class="text-gray-400 text-lg">Manage your assets and transactions</p>
    </div>

    <!-- Balance Overview -->
    <Card class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 mb-8">
      <div class="p-8">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            <div class="p-3 bg-gray-700/50 rounded-lg">
              <Wallet class="w-6 h-6 text-purple-400" />
            </div>
            <h2 class="text-2xl font-semibold text-white">Total Balance</h2>
          </div>
          <Button variant="outline" size="sm" class="gap-2">
            <RefreshCw class="w-4 h-4" />
            Refresh
          </Button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="p-6 bg-gray-900/50 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <Coins class="w-5 h-5 text-yellow-400" />
              <p class="text-sm text-gray-400">ETH Balance</p>
            </div>
            <p class="text-3xl font-bold text-white">0.0000</p>
            <p class="text-sm text-gray-500 mt-1">≈ $0.00 USD</p>
          </div>
          <div class="p-6 bg-gray-900/50 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <TrendingUp class="w-5 h-5 text-green-400" />
              <p class="text-sm text-gray-400">Land Value</p>
            </div>
            <p class="text-3xl font-bold text-white">0.0000</p>
            <p class="text-sm text-gray-500 mt-1">≈ $0.00 USD</p>
          </div>
          <div class="p-6 bg-gray-900/50 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <Wallet class="w-5 h-5 text-purple-400" />
              <p class="text-sm text-gray-400">Total Assets</p>
            </div>
            <p class="text-3xl font-bold text-white">0.0000</p>
            <p class="text-sm text-gray-500 mt-1">≈ $0.00 USD</p>
          </div>
        </div>
      </div>
    </Card>

    <!-- Actions Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <!-- Send Card -->
      <Card class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-gray-600 transition-colors">
        <div class="p-8">
          <div class="flex items-center gap-4 mb-6">
            <div class="p-3 bg-red-500/20 rounded-lg">
              <ArrowUpRight class="w-6 h-6 text-red-400" />
            </div>
            <h3 class="text-xl font-semibold text-white">Send</h3>
          </div>
          <p class="text-gray-400 mb-6">Transfer assets to another wallet</p>
          <Button variant="red" class="w-full" disabled>
            Connect Wallet to Send
          </Button>
        </div>
      </Card>

      <!-- Receive Card -->
      <Card class="bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-gray-600 transition-colors">
        <div class="p-8">
          <div class="flex items-center gap-4 mb-6">
            <div class="p-3 bg-green-500/20 rounded-lg">
              <ArrowDownLeft class="w-6 h-6 text-green-400" />
            </div>
            <h3 class="text-xl font-semibold text-white">Receive</h3>
          </div>
          <p class="text-gray-400 mb-6">Get your wallet address to receive funds</p>
          <Button variant="outline" class="w-full" disabled>
            Connect Wallet to Receive
          </Button>
        </div>
      </Card>
    </div>

    <!-- Transaction History -->
    <Card class="bg-gray-800/50 backdrop-blur-sm border border-gray-700">
      <div class="p-8">
        <h3 class="text-2xl font-semibold text-white mb-6">Transaction History</h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-700">
                <th class="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
                <th class="text-left py-3 px-4 text-sm font-medium text-gray-400">Amount</th>
                <th class="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
                <th class="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="py-12 text-center text-gray-400" colspan="4">
                  No transactions yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  </div>
</div>
