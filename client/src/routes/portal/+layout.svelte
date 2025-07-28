<script lang="ts">
  import { page } from '$app/stores';
  import { ChevronLeft, ChevronRight, Home, Wallet, User } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import ExperienceSection from '$lib/portal/experience-section.svelte';
  import OnboardingWalletInfo from '$lib/components/+game-ui/widgets/wallet/onboarding-wallet-info.svelte';
  let isExpanded = $state(true);

  function toggleSidebar() {
    isExpanded = !isExpanded;
  }

  // Derive active tab from current route
  let activeTab = $derived.by(() => {
    const path = $page.url.pathname;
    if (path.includes('/wallet')) return 'wallet';
    if (path.includes('/profile')) return 'profile';
    return 'home';
  });
</script>

<div class="absolute top-0 right-0 m-5 z-[10] pointer-events-auto">
  <OnboardingWalletInfo />
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
          <img src="/logo.gif" alt="PonziLand" class="w-10 h-10" />
          <span
            class="text-2xl font-bold text-white text-ponzi-number uppercase"
            >PonziLand</span
          >
        </div>
      {:else}
        <div class="flex justify-center">
          <img src="/logo.gif" alt="PonziLand" class="w-10 h-10" />
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

    {#if isExpanded}
      <!-- Navigation Buttons -->
      <div class="flex-1 px-4 pb-4 space-y-2">
        <Button
          href="/portal"
          class="flex items-center gap-3 w-full px-4 py-2 rounded-md text-white"
        >
          <Home class="w-5 h-5" />
          <span>Home</span>
        </Button>

        <Button
          href="/portal/wallet"
          class="flex items-center gap-3 w-full px-4 py-2 rounded-md text-white"
        >
          <Wallet class="w-5 h-5" />
          <span>Wallet</span>
        </Button>

        <Button
          href="/portal/profile"
          class="flex items-center gap-3 w-full px-4 py-2 rounded-md text-white"
        >
          <User class="w-5 h-5" />
          <span>Profile</span>
        </Button>
      </div>
    {:else}
      <!-- Collapsed state - just icons -->
      <div class="flex-1 px-2 py-4 space-y-2">
        <Button class="w-full h-10 p-0" href="/portal">
          <Home class="w-5 h-5" />
        </Button>

        <Button class="w-full h-10 p-0" href="/portal/wallet">
          <Wallet class="w-5 h-5" />
        </Button>

        <Button class="w-full h-10 p-0" href="/portal/profile">
          <User class="w-5 h-5" />
        </Button>
      </div>
    {/if}
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
