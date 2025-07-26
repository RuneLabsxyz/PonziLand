<script lang="ts">
  import { ChevronLeft, ChevronRight, Home, Wallet, User } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import ExperienceSection from './experience-section.svelte';

  interface Props {
    activeTab?: string;
  }

  let { activeTab = $bindable('home') }: Props = $props();
  let isExpanded = $state(true);

  function toggleSidebar() {
    isExpanded = !isExpanded;
    // Update main content padding
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.classList.toggle('collapsed', !isExpanded);
    }
  }

  function setActiveTab(tab: string) {
    activeTab = tab;
  }
</script>

<div
  class="fixed left-0 top-0 h-full bg-black/95 border-r-2 border-purple-600/50 backdrop-blur-md transition-all duration-300 z-50 flex flex-col"
  class:w-80={isExpanded}
  class:w-16={!isExpanded}
>
  <!-- Toggle Button -->
  <button
    onclick={toggleSidebar}
    class="absolute -right-4 top-6 bg-purple-600/80 hover:bg-purple-600 text-white rounded-full p-1.5 transition-colors duration-200 shadow-lg"
  >
    {#if isExpanded}
      <ChevronLeft class="w-4 h-4" />
    {:else}
      <ChevronRight class="w-4 h-4" />
    {/if}
  </button>

  {#if isExpanded}
    <!-- Experience Section -->
    <div class="p-4">
      <ExperienceSection />
    </div>

    <!-- Navigation Buttons -->
    <div class="flex-1 px-4 pb-4 space-y-2">
      <Button
        class="w-full justify-start gap-3"
        onclick={() => setActiveTab('home')}
      >
        <Home class="w-5 h-5" />
        <span>Home</span>
      </Button>

      <Button
        class="w-full justify-start gap-3"
        onclick={() => setActiveTab('wallet')}
      >
        <Wallet class="w-5 h-5" />
        <span>Wallet</span>
      </Button>

      <Button
        class="w-full justify-start gap-3"
        onclick={() => setActiveTab('profile')}
      >
        <User class="w-5 h-5" />
        <span>Profile</span>
      </Button>
    </div>
  {:else}
    <!-- Collapsed state - just icons -->
    <div class="flex-1 px-2 py-4 space-y-2">
      <Button class="w-full p-3" onclick={() => setActiveTab('home')}>
        <Home class="w-5 h-5" />
      </Button>

      <Button class="w-full p-3" onclick={() => setActiveTab('wallet')}>
        <Wallet class="w-5 h-5" />
      </Button>

      <Button class="w-full p-3" onclick={() => setActiveTab('profile')}>
        <User class="w-5 h-5" />
      </Button>
    </div>
  {/if}
</div>

<style>
  .w-80 {
    width: 20rem;
  }
  .w-16 {
    width: 4rem;
  }
</style>
