<script lang="ts">
  import { Hash } from 'lucide-svelte';
  import type { PageData, RouteParams } from './$types';
  import ExecuteTransfer from './ExecuteTransfer.svelte';
  import Success from './Success.svelte';
  import { sessionState } from '@sv-use/core';
  import Wait from './Wait.svelte';
  import { Card } from '$lib/components/ui/card';
  import WalletSetups from '../WalletSetups.svelte';
  import { currentStep, setCurrentStep } from '$lib/ramp/stores.svelte';
  import ThreeDots from '$lib/components/loading/three-dots.svelte';
  import { Button } from '$lib/components/ui/button';

  let { data }: { data: PageData } = $props();

  let swap = $state(data.swap);

  let hasDoneTransaction = sessionState<[string, string] | undefined>(
    'hasDoneTransaction-' + data.swap.id,
    undefined,
  );

  let txLink = $derived.by(() => {
    return data.swap.txExplorerTemplate?.replace(
      '{0}',
      hasDoneTransaction.current?.[0] ?? '',
    );
  });

  $effect(() => {
    if (
      currentStep.current === 1 &&
      actionRequired &&
      !hasDoneTransaction.current
    ) {
      // Action required
      setCurrentStep(4);
    } else if (
      currentStep.current <= 4 &&
      (!actionRequired || hasDoneTransaction.current)
    ) {
      setCurrentStep(5);
    } else if (data.swap.status === 'completed') {
      setCurrentStep(6);
    }
  });

  function onTransferSuccess(tx: string) {
    hasDoneTransaction.current = [tx, new Date().toJSON()];
  }

  $effect(() => {
    const cancellation = setInterval(async () => {
      const response = await fetch(`/ramp/api/${data.swap.id}/status`);

      if (response.status === 200) {
        const data = await response.json();
        if (data.status === 'completed') {
          setCurrentStep(6);
        }
      }
    }, 10_000); // Every 10 seconds

    return () => {
      clearInterval(cancellation);
    };
  });

  $inspect(txLink);

  let actionRequired = $derived(data.deposits?.length ?? 0 > 0);
</script>

<div class="flex flex-col items-center justify-center w-screen">
  <div class="w-full p-10 md:w-2/3 lg:w-1/2 2xl:w-1/3">
    <Card class="text-white text-3xl">
      <WalletSetups />

      <div class="pt-5 pb-1 text-3xl">
        3. Prepare your transfer <span>✔️</span>
      </div>
      <div class="text-xl opacity-50 pb-1">
        You asked for {data.swap.amount}
        {data.swap.sourceSymbol}
      </div>

      {#if currentStep.current === 4}
        <ExecuteTransfer
          action={data.deposits![0]}
          ondone={onTransferSuccess}
        />
      {:else if currentStep.current >= 4}
        <h1 class="text-3xl pt-5 pb-1">4. Send the amount <span>✔️</span></h1>
        <p class="text-xl opacity-50 pb-1">
          The transaction was submitted successfully. You can check the status
          of your transaction <a href={txLink} target="_blank" class="underline"
            >here</a
          >.
        </p>
      {/if}

      {#if currentStep.current === 5}
        <h1 class="text-3xl pt-5 pb-1">5. Wait for the transfer</h1>

        <Wait swap={data.swap} transferTime={hasDoneTransaction.current?.[1]} />
        <p class="text-xl opacity-50 pb-1">
          You did it! Let's wait for the transaction to complete<ThreeDots />
        </p>
      {:else if currentStep.current >= 5}
        <h1 class="text-3xl pt-5 pb-1">
          5. Wait for the transfer <span>✔️</span>
        </h1>
      {/if}

      {#if currentStep.current === 6}
        <h1 class="text-3xl pt-5 pb-1">6. Transfer complete <span>🎉</span></h1>
        <p class="text-xl pb-1">
          Everything is ready! You can now join the fight for your own lands!
        </p>
        <p class="text-xl pb-5">
          Your tokens are safe in your new controller! <br /> Make sure to login
          with your controller account to play the game.
        </p>
        <div class="flex justify-center">
          <a href="/game">
            <Button class="text-xl">Play</Button>
          </a>
        </div>
      {/if}
    </Card>
  </div>
</div>
