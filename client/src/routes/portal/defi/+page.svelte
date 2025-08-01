<script lang="ts">
  import { Construction, Wrench } from 'lucide-svelte';
</script>

<div class="flex flex-col items-center justify-center h-full p-6">
  <div class="text-center space-y-6">
    <div class="flex justify-center">
      <div class="relative">
        <Construction class="w-32 h-32 text-yellow-500" />
        <Wrench
          class="w-16 h-16 text-yellow-600 absolute -bottom-2 -right-2 animate-pulse"
        />
      </div>
    </div>

    <h1 class="text-5xl font-bold text-white">DeFi Section</h1>

    <div class="space-y-2">
      <p class="text-2xl text-yellow-500 font-bold">UNDER CONSTRUCTION</p>
      <p class="text-lg text-gray-400">
        We're building something amazing for you!
      </p>
      <p class="text-md text-gray-500">
        Soon you'll be able to invest in guilds, let them help you farm tokens
      </p>
    </div>

    <div class="pt-8">
      <div
        class="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500/20 rounded-lg border-2 border-yellow-500/50"
      >
        <div class="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
        <span class="text-yellow-500 font-medium">Coming Soon</span>
      </div>
    </div>
  </div>
</div>
