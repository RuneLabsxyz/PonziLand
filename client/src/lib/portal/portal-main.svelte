<script lang="ts">
  import PortalSidebar from './portal-sidebar.svelte';

  let activeTab = $state('home');

  export function setActiveTab(tab: string) {
    activeTab = tab;
  }
</script>

<div class="min-h-screen bg-gray-900">
  <PortalSidebar bind:activeTab />

  <!-- Main Content Area -->
  <div class="transition-all duration-300 pl-80" id="main-content">
    <div class="p-8">
      {#if activeTab === 'home'}
        <div class="max-w-4xl mx-auto">
          <h1 class="text-4xl font-bold text-white mb-8">
            Welcome to PonziLand Portal
          </h1>
          <div class="bg-black/50 border-2 border-purple-600/30 rounded-lg p-6">
            <p class="text-gray-300 text-lg">
              Your gateway to the PonziLand ecosystem. Track your experience,
              manage your wallet, and customize your profile.
            </p>
          </div>
        </div>
      {:else if activeTab === 'wallet'}
        <div class="max-w-4xl mx-auto">
          <h1 class="text-4xl font-bold text-white mb-8">Wallet</h1>
          <div class="bg-black/50 border-2 border-purple-600/30 rounded-lg p-6">
            <p class="text-gray-400">Wallet features coming soon...</p>
          </div>
        </div>
      {:else if activeTab === 'profile'}
        <div class="max-w-4xl mx-auto">
          <h1 class="text-4xl font-bold text-white mb-8">Profile</h1>
          <div class="bg-black/50 border-2 border-purple-600/30 rounded-lg p-6">
            <p class="text-gray-400">Profile features coming soon...</p>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(#main-content.collapsed) {
    padding-left: 4rem;
  }
</style>
