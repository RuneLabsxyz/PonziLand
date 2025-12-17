<script lang="ts">
  import DropDashboard from '$lib/components/dashboard/DropDashboard.svelte';
</script>

<div class="container mx-auto p-4 space-y-4">
  <div class="space-y-1">
    <p class="text-xs text-gray-400 uppercase tracking-wide">Dashboard</p>
    <h1 class="text-3xl font-semibold text-white">Drop Lands</h1>
    <p class="text-sm text-gray-400">
      Explore drops captured by the reinjector and filter by location, owner and
      configuration.
    </p>
  </div>
  <DropDashboard />
</div>
