<script lang="ts">
  import type { AccountInterface } from 'starknet';
  import {
    AccountManager,
    setupAccount,
    useAccount,
  } from '$lib/contexts/account.svelte';
  import { appKit } from '$lib/ramp';
  import {
    provider,
    address as ethAddress,
    currentStep,
    setCurrentStep,
  } from '$lib/ramp/stores.svelte';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { DiscIcon, Fan } from 'lucide-svelte';
  import type Dice_3 from 'lucide-svelte/icons/dice-3';

  let account = useAccount();

  let isPhantomDisconnected = $state(true);
  let isControllerConnected = $state(false);

  let controllerAccount: AccountInterface | undefined = $state();

  onMount(() => {
    if (account?.getProvider() != undefined) {
      controllerAccount = account?.getProvider()?.getAccount();
    }

    // Listen on updates
    account?.listen(() => {
      controllerAccount = account?.getProvider()?.getAccount();
    });
  });

  $effect(() => {
    if (
      currentStep.current === 1 &&
      ethAddress.current &&
      !isPhantomDisconnected
    ) {
      console.log('We go forward!', ethAddress.current);
      setCurrentStep(2);
    } else if (currentStep.current === 2 && controllerAccount?.address) {
      setCurrentStep(3);
    }
  });

  function connectPhantom() {
    isPhantomDisconnected = false;
    appKit.open();
  }

  function disconnectPhantom() {
    try {
      appKit.disconnect();
    } catch (error) {
      console.error(error);
    }

    // Force it to undefined to avoid rollbacks
    ethAddress.current = undefined;
    isPhantomDisconnected = true;

    if (currentStep.current <= 3) {
      setCurrentStep(1);
    }
  }

  function connectController() {
    account?.selectAndLogin('controller');
    isControllerConnected = true;
  }

  function disconnectController() {
    account?.disconnect();
    isControllerConnected = false;

    // Rollback status on disconnect
    if (currentStep.current === 3) {
      setCurrentStep(2);
    }
  }
</script>

<div class="">
  <div class="pb-3">
    1. Connect Phantom
    {#if currentStep.current > 1}
      <span>✔️</span>
    {/if}
  </div>

  {#if !ethAddress.current}
    <Button onclick={connectPhantom}>Connect</Button>
  {:else}
    <Button onclick={disconnectPhantom}>Disconnect</Button>
  {/if}
</div>
<div class="pt-5 pb-3">
  2. Create your Controller
  {#if currentStep.current > 2}
    <span>✔️</span>
  {/if}
</div>
{#if !controllerAccount?.address}
  <Button onclick={connectController}>Connect with controller</Button>
{:else}
  <Button onclick={disconnectController}>Disconnect from controller</Button>
{/if}
