<script>
  import {
    selectedLand,
    selectedLandMeta,
    uiStore,
  } from '$lib/stores/stores.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import Button from '../ui/button/button.svelte';
  import { Card } from '../ui/card';
  import CardHeader from '../ui/card/card-header.svelte';
  import CardTitle from '../ui/card/card-title.svelte';
  import CloseButton from '../ui/close-button.svelte';
  import Input from '../ui/input/input.svelte';

  const handleCancel = () => {
    uiStore.showModal = false;
  };

  let stakeIncrease = $state('100');

  const handleIncreaseStake = () => {
    console.log('Increase stake', stakeIncrease);

    $selectedLandMeta
      ?.increaseStake(
        CurrencyAmount.fromScaled(stakeIncrease, $selectedLandMeta.token),
      )
      .then((res) => console.log('increase success', res));
  };
</script>

<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 text-stroke-none"
>
  <Card class="flex flex-col min-w-96 min-h-96 relative">
    <CloseButton
      onclick={handleCancel}
      className="absolute top-0 right-0 m-2"
    />

    <CardTitle class="mt-2 mb-3">Land Info</CardTitle>
    <div class="flex flex-col gap-2">
      <Input bind:value={stakeIncrease} />
      <Button onclick={handleIncreaseStake}>Increase stake</Button>
    </div>
  </Card>
</div>
