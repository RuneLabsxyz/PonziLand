<script lang="ts">
  import { page } from '$app/stores';
  import {
    ChevronLeft,
    ChevronRight,
    Home,
    Wallet,
    User,
    TrendingUp,
  } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import ExperienceSection from '$lib/portal/experience-section.svelte';
  import OnboardingWalletInfo from '$lib/components/+game-ui/widgets/wallet/onboarding-wallet-info.svelte';
  import PhantomWalletInfo from '$lib/components/+game-ui/widgets/wallet/phantom-wallet-info.svelte';
  let isExpanded = $state(true);

  function toggleSidebar() {
    isExpanded = !isExpanded;
  }

  // Derive active tab from current route
  let activeTab = $derived.by(() => {
    const path = $page.url.pathname;
    if (path.includes('/wallet')) return 'wallet';
    if (path.includes('/profile')) return 'profile';
    if (path.includes('/defi')) return 'defi';
    return 'home';
  });
</script>

<div
  class="fixed top-0 right-0 m-5 z-[10] pointer-events-auto flex flex-col gap-2"
>
  <OnboardingWalletInfo />
  <PhantomWalletInfo />
</div>

<div class="h-screen bg-gray-900 overflow-hidden">
  <!-- Sidebar -->
  <div
    class="fixed left-0 top-0 h-screen bg-black/95 border-r-2 border-purple-600/50 backdrop-blur-md z-50 flex flex-col transition-none"
    style="width: {isExpanded
      ? '20rem'
      : '6rem'}; transition: width 150ms steps(8);"
  >
    <!-- Logo and Title -->
    <div class="p-4 border-b border-purple-600/30">
      {#if isExpanded}
        <div class="flex items-center justify-center gap-3">
          <img src="/midgard.png" alt="PonziLand" class="w-12 h-12" />
          <span
            class="text-2xl pt-2 ft-bold text-white text-ponzi-number uppercase"
            >Midgard</span
          >
        </div>
      {:else}
        <div class="flex justify-center">
          <img src="/midgard.png" alt="PonziLand" class="w-10 h-10" />
        </div>
      {/if}
    </div>

    <!-- Toggle Button -->
    <Button
      variant="red"
      onclick={toggleSidebar}
      class="absolute -right-4 top-[18px] text-white rounded-full p-1.5"
    >
      {#if isExpanded}
        <ChevronLeft class="w-4 h-4" />
      {:else}
        <ChevronRight class="w-4 h-4" />
      {/if}
    </Button>

    <!-- Experience Section -->
    <div
      class="p-4 pt-0 overflow-hidden"
      style="opacity: {isExpanded ? 1 : 0}; transition: opacity 150ms steps(4);"
    >
      <ExperienceSection />
    </div>

    <!-- Navigation Buttons -->
    <div
      class="px-4 pb-4 space-y-2 {!isExpanded ? 'mt-auto' : ''}"
      style="transition: margin-top 150ms steps(8);"
    >
      <Button
        href="/portal"
        variant={activeTab === 'home' ? 'red' : 'blue'}
        class="flex items-center gap-3 w-full {isExpanded
          ? 'px-4 py-2'
          : 'h-10 p-0 justify-center'} rounded-md text-white transition-all"
      >
        <Home class="w-5 h-5" />
        {#if isExpanded}
          <span
            style="opacity: {isExpanded
              ? 1
              : 0}; transition: opacity 150ms steps(4);">Home</span
          >
        {/if}
      </Button>

      <Button
        href="/portal/wallet"
        variant={activeTab === 'wallet' ? 'red' : 'blue'}
        class="flex items-center gap-3 w-full {isExpanded
          ? 'px-4 py-2'
          : 'h-10 p-0 justify-center'} rounded-md text-white transition-all"
      >
        <Wallet class="w-5 h-5" />
        {#if isExpanded}
          <span
            style="opacity: {isExpanded
              ? 1
              : 0}; transition: opacity 150ms steps(4);">Wallet</span
          >
        {/if}
      </Button>

      <Button
        href="/portal/defi"
        variant={activeTab === 'defi' ? 'red' : 'blue'}
        class="flex items-center gap-3 w-full {isExpanded
          ? 'px-4 py-2'
          : 'h-10 p-0 justify-center'} rounded-md text-white transition-all"
      >
        <TrendingUp class="w-5 h-5" />
        {#if isExpanded}
          <span
            style="opacity: {isExpanded
              ? 1
              : 0}; transition: opacity 150ms steps(4);">DeFi</span
          >
        {/if}
      </Button>

      <Button
        href="/portal/profile"
        variant={activeTab === 'profile' ? 'red' : 'blue'}
        class="flex items-center gap-3 w-full {isExpanded
          ? 'px-4 py-2'
          : 'h-10 p-0 justify-center'} rounded-md text-white transition-all"
      >
        <User class="w-5 h-5" />
        {#if isExpanded}
          <span
            style="opacity: {isExpanded
              ? 1
              : 0}; transition: opacity 150ms steps(4);">Profile</span
          >
        {/if}
      </Button>
    </div>
  </div>

  <!-- Main Content Area -->
  <div
    class="h-screen overflow-y-auto transition-none"
    id="main-content"
    style="padding-left: {isExpanded
      ? '20rem'
      : '6rem'}; transition: padding-left 150ms steps(8);"
  >
    <slot />
  </div>
</div>

<style>
</style>
