<script lang="ts">
  import RotatingCoin from './rotating-coin.svelte';
  import { loadingStore } from '$lib/stores/loading.store.svelte';
</script>

<!-- Comprehensive Loading Checklist -->
<div
  class="grid grid-cols-2 gap-x-6 text-white text-sm opacity-80 max-h-80 overflow-y-auto"
>
  <!-- Left Column -->
  <div class="flex flex-col gap-1">
    <!-- WebGL Category -->
    <div class="text-purple-300 font-semibold mb-1">⚡ WebGL</div>
    {#each Object.entries(loadingStore.phases.webgl.items) as [name, loaded]}
      <div class="flex items-center gap-2 ml-4">
        {#if loaded}
          <span class="text-green-400">✓</span>
        {:else}
          <div class="w-3 h-3">
            <RotatingCoin />
          </div>
        {/if}
        <span class="capitalize {loaded ? 'text-green-300' : 'text-gray-300'}"
          >{name.replace('-', ' ')}</span
        >
      </div>
    {/each}

    <!-- Spritesheets Category -->
    <div class="text-blue-300 font-semibold mb-1 mt-2">📊 Spritesheets</div>
    {#each Object.entries(loadingStore.phases.spritesheets.items) as [name, loaded]}
      <div class="flex items-center gap-2 ml-4">
        {#if loaded}
          <span class="text-green-400">✓</span>
        {:else}
          <div class="w-3 h-3">
            <RotatingCoin />
          </div>
        {/if}
        <span class="capitalize {loaded ? 'text-green-300' : 'text-gray-300'}"
          >{name}</span
        >
      </div>
    {/each}

    <!-- Assets Category -->
    <div class="text-green-300 font-semibold mb-1 mt-2">🎨 Assets</div>
    {#each Object.entries(loadingStore.phases.assets.items) as [name, loaded]}
      <div class="flex items-center gap-2 ml-4">
        {#if loaded}
          <span class="text-green-400">✓</span>
        {:else}
          <div class="w-3 h-3">
            <RotatingCoin />
          </div>
        {/if}
        <span class="capitalize {loaded ? 'text-green-300' : 'text-gray-300'}"
          >{name.replace('Texture', '')}</span
        >
      </div>
    {/each}

    <!-- Client Category -->
    <div class="text-indigo-300 font-semibold mb-1 mt-2">🔌 Client</div>
    {#each Object.entries(loadingStore.phases.client.items) as [name, loaded]}
      <div class="flex items-center gap-2 ml-4">
        {#if loaded}
          <span class="text-green-400">✓</span>
        {:else}
          <div class="w-3 h-3">
            <RotatingCoin />
          </div>
        {/if}
        <span class="capitalize {loaded ? 'text-green-300' : 'text-gray-300'}"
          >{name.replace('-', ' ')}</span
        >
      </div>
    {/each}
  </div>

  <!-- Right Column -->
  <div class="flex flex-col gap-1">
    <!-- Config Category -->
    <div class="text-yellow-300 font-semibold mb-1">⚙️ Configuration</div>
    {#each Object.entries(loadingStore.phases.config.items) as [name, loaded]}
      <div class="flex items-center gap-2 ml-4">
        {#if loaded}
          <span class="text-green-400">✓</span>
        {:else}
          <div class="w-3 h-3">
            <RotatingCoin />
          </div>
        {/if}
        <span class="capitalize {loaded ? 'text-green-300' : 'text-gray-300'}">
          {name.replace('-', ' ')}
          {#if name === 'game-config'}
            <span class="text-xs opacity-50">← client</span>
          {/if}
        </span>
      </div>
    {/each}

    <!-- Wallet Category (only in non-tutorial mode) -->
    {#if !loadingStore.isTutorialMode && loadingStore.phases.wallet.total > 0}
      <div class="text-orange-300 font-semibold mb-1 mt-2">💰 Wallet</div>
      {#each Object.entries(loadingStore.phases.wallet.items) as [name, loaded]}
        <div class="flex items-center gap-2 ml-4">
          {#if loaded}
            <span class="text-green-400">✓</span>
          {:else}
            <div class="w-3 h-3">
              <RotatingCoin />
            </div>
          {/if}
          <span
            class="capitalize {loaded ? 'text-green-300' : 'text-gray-300'}"
          >
            {name.replace('-', ' ')}
            {#if name === 'account-setup'}
              <span class="text-xs opacity-50">← wallet</span>
            {/if}
          </span>
        </div>
      {/each}
    {/if}

    <!-- Dojo Category (only in non-tutorial mode) -->
    {#if !loadingStore.isTutorialMode && loadingStore.phases.dojo.total > 0}
      <div class="text-red-300 font-semibold mb-1 mt-2">🥋 Dojo</div>
      {#each Object.entries(loadingStore.phases.dojo.items) as [name, loaded]}
        <div class="flex items-center gap-2 ml-4">
          {#if loaded}
            <span class="text-green-400">✓</span>
          {:else}
            <div class="w-3 h-3">
              <RotatingCoin />
            </div>
          {/if}
          <span
            class="capitalize {loaded ? 'text-green-300' : 'text-gray-300'}"
          >
            {name.replace('-', ' ')}
            {#if name === 'dojo-init'}
              <span class="text-xs opacity-50">← client</span>
            {/if}
          </span>
        </div>
      {/each}
    {/if}

    <!-- Social Category (only in non-tutorial mode) -->
    {#if !loadingStore.isTutorialMode && loadingStore.phases.social.total > 0}
      <div class="text-cyan-300 font-semibold mb-1 mt-2">🌐 Social</div>
      {#each Object.entries(loadingStore.phases.social.items) as [name, loaded]}
        <div class="flex items-center gap-2 ml-4">
          {#if loaded}
            <span class="text-green-400">✓</span>
          {:else}
            <div class="w-3 h-3">
              <RotatingCoin />
            </div>
          {/if}
          <span
            class="capitalize {loaded ? 'text-green-300' : 'text-gray-300'}"
          >
            {name.replace('-', ' ')}
            {#if name === 'social-links'}
              <span class="text-xs opacity-50">← account</span>
            {/if}
          </span>
        </div>
      {/each}
    {/if}

    <!-- Land Store Category (only in non-tutorial mode) -->
    {#if !loadingStore.isTutorialMode && loadingStore.phases.landStore.total > 0}
      <div class="text-purple-400 font-semibold mb-1 mt-2">🗺️ Land Store</div>
      {#each Object.entries(loadingStore.phases.landStore.items) as [name, loaded]}
        <div class="flex items-center gap-2 ml-4">
          {#if loaded}
            <span class="text-green-400">✓</span>
          {:else}
            <div class="w-3 h-3">
              <RotatingCoin />
            </div>
          {/if}
          <span
            class="capitalize {loaded ? 'text-green-300' : 'text-gray-300'}"
          >
            {name.replace('-', ' ')}
            {#if name === 'land-data'}
              <span class="text-xs opacity-50">← dojo</span>
            {/if}
          </span>
        </div>
      {/each}
    {/if}

    <!-- Rendering Category (always shown) -->
    <div class="text-emerald-300 font-semibold mb-1 mt-2">🎨 Rendering</div>
    {#each Object.entries(loadingStore.phases.rendering.items) as [name, loaded]}
      <div class="flex items-center gap-2 ml-4">
        {#if loaded}
          <span class="text-green-400">✓</span>
        {:else}
          <div class="w-3 h-3">
            <RotatingCoin />
          </div>
        {/if}
        <span class="capitalize {loaded ? 'text-green-300' : 'text-gray-300'}">
          {name.replace('-', ' ')}
          {#if name === 'canvas-ready'}
            <span class="text-xs opacity-50"
              >← webgl{!loadingStore.isTutorialMode ? ', dojo' : ''}</span
            >
          {:else if name === 'first-frame'}
            <span class="text-xs opacity-50">← assets</span>
          {:else if name === 'scene-loaded'}
            <span class="text-xs opacity-50">← final</span>
          {/if}
        </span>
      </div>
    {/each}
  </div>

  <!-- Overall Progress (spans both columns) -->
  <div
    class="col-span-2 text-xs opacity-60 mt-3 text-center border-t border-gray-600 pt-2"
  >
    <div>{Math.round(loadingStore.totalProgress * 100)}% Complete</div>
    <div class="text-xs opacity-40">
      {loadingStore.isTutorialMode ? 'Tutorial Mode' : 'Full Game Mode'}
    </div>
  </div>
</div>
