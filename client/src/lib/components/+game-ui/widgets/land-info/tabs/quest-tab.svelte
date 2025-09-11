<script lang="ts">
    import type { LandWithActions } from '$lib/api/land';
    import type { TabType } from '$lib/interfaces';
  
    let {
      land,
      activeTab = $bindable(),
      isActive = false,
    }: {
      land: LandWithActions;
      activeTab: TabType;
      isActive?: boolean;
    } = $props();
  </script>
  
  {#if isActive}
    <div class="w-full h-full">
      <!-- Quests tab content will go here -->
      <p>Quests data and information</p>
    </div>
  {/if}
  