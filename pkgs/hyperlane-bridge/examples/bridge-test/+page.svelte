<script lang="ts">
  import TransferFrom from '$lib/bridge/TransferFrom.svelte';
  import { setup } from '$lib/account.svelte';
  import { onMount } from 'svelte';

  onMount(async () => {
    await setup();
  });
</script>

<div class="container mx-auto p-8">
  <h1 class="text-3xl font-bold mb-8">Hyperlane Bridge Test</h1>

  <div class="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6">
    <TransferFrom />
  </div>
</div>

<style>
  .container {
    min-height: 100vh;
    background-color: #f3f4f6;
  }
</style>