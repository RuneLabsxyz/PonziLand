<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { midgardAPI } from '$lib/midgard/api-store.svelte';

  // Redirect to my-lands when connected
  onMount(() => {
    if (midgardAPI.isConnected) {
      goto('/midgard/my-lands');
    }
  });

  // Watch for connection changes
  $effect(() => {
    if (midgardAPI.isConnected) {
      goto('/midgard/my-lands');
    }
  });
</script>

<!-- This page is handled by the layout when not connected -->
<!-- When connected, it redirects to my-lands -->
