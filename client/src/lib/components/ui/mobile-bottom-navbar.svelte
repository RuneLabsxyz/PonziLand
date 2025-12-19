<script lang="ts">
  import { activeTab, type MobileTab } from '$lib/stores/mobile-nav.store';

  function setActiveTab(tab: MobileTab) {
    activeTab.set(tab);
  }
</script>

<div
  class="fixed bottom-0 left-0 right-0 z-50 bg-ponzi border-gray-700 border-t"
  style="pointer-events: all; padding-bottom: env(safe-area-inset-bottom); height: 64px"
>
  <div class="flex justify-around items-center h-16">
    <!-- Map Tab -->
    <button
      class={[
        'flex flex-col flex-1 items-center justify-center gap-1 p-2 rounded-lg transition-colors',
        {
          'bg-white/10 text-yellow-400': $activeTab === 'map',
          'text-gray-300 hover:text-white': $activeTab !== 'map',
        },
      ]}
      onclick={() => setActiveTab('map')}
    >
      <img src="/ui/icons/Icon_MyLand.png" class="w-6 h-6" alt="Map" />
      <span class="text-xs font-ponzi-number">Map</span>
    </button>

    <!-- Market Tab -->
    <button
      class={[
        'flex flex-col flex-1 items-center justify-center gap-1 p-2 rounded-lg transition-colors',
        {
          'bg-white/10 text-yellow-400': $activeTab === 'market',
          'text-gray-300 hover:text-white': $activeTab !== 'market',
        },
      ]}
      onclick={() => setActiveTab('market')}
    >
      <img src="/ui/icons/Icon_MyLand2.png" class="w-6 h-6" alt="Market" />
      <span class="text-xs font-ponzi-number">Market</span>
    </button>

    <!-- Command Center Tab -->
    <button
      class={[
        'flex flex-col flex-1 items-center justify-center gap-1 p-2 rounded-lg transition-colors',
        {
          'bg-white/10 text-yellow-400': $activeTab === 'command-center',
          'text-gray-300 hover:text-white': $activeTab !== 'command-center',
        },
      ]}
      onclick={() => setActiveTab('command-center')}
    >
      <img
        src="/ui/icons/Icon_ControlCenter.png"
        class="w-6 h-6"
        alt="Command Center"
      />
      <span class="text-xs font-ponzi-number">Cmd Center</span>
    </button>

    <!-- Wallet Tab -->
    <button
      class={[
        'flex flex-col flex-1 items-center justify-center gap-1 p-2 rounded-lg transition-colors',
        {
          'bg-white/10 text-yellow-400': $activeTab === 'wallet',
          'text-gray-300 hover:text-white': $activeTab !== 'wallet',
        },
      ]}
      onclick={() => setActiveTab('wallet')}
    >
      <img src="/ui/icons/Icon_Coin3.png" class="w-6 h-6" alt="Wallet" />
      <span class="text-xs font-ponzi-number">Wallet</span>
    </button>
  </div>
</div>
