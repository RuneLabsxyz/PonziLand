<script lang="ts">
  import { setup } from '$lib/account.svelte';
  import TransferForm from '$lib/bridge/TransferForm.svelte';
  import { onMount } from 'svelte';

  onMount(async () => {
    await setup();
  });
</script>

<div class="container mx-auto p-8">
  <h1 class="text-3xl font-bold mb-8">Hyperlane Bridge Test</h1>

  <div class="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6">
    <TransferForm />
  </div>
</div>

<style>
  .container {
    min-height: 100vh;
    background-color: #f3f4f6;
  }
</style>