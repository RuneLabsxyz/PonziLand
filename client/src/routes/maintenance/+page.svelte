<script>
  import Card from '$lib/components/ui/card/card.svelte';
  import { DATE_GATE } from '$lib/const';
  import { onMount } from 'svelte';

  let currentDate = $state(Date.now());
  let durationLeft = $derived((DATE_GATE?.getTime() ?? Infinity) - currentDate);

  let secondsLeft = $derived(Math.floor(durationLeft / 1000) % 60);

  let minutesLeft = $derived(Math.floor(durationLeft / (1000 * 60)) % 60);
  let hoursLeft = $derived(Math.floor(durationLeft / (1000 * 60 * 60)));

  onMount(() => {
    const interval = setInterval(() => {
      currentDate = Date.now();
    }, 1000);

    return () => clearInterval(interval);
  });
</script>

<div
  class="flex flex-col h-screen w-screen justify-center items-center"
  style="background-image: url('/ui/bg.png'); background-size: cover; background-position: center;"
>
  <Card>
    <div class="p-5 max-w-[35rem]">
      <h1 class="text-4xl font-bold text-center mb-2">
        We are closed (for now)!
      </h1>
      <p class="text-xl">
        The ponziboys are hard at work! Let them cook, and I promise that we
        will be back soon. At least now you know that we are working on it.
      </p>

      <!-- Only show the timer if we have a date in the future and DATE_GATE is defined. -->
      {#if DATE_GATE !== undefined && DATE_GATE > new Date()}
        <p class="text-xl">
          Here's a timer, but I'm not sure when we'll be back.
        </p>

        <p class="text-center text-2xl text-bold my-4">
          {hoursLeft.toString().padStart(2, '0')}:{minutesLeft
            .toString()
            .padStart(2, '0')}:{secondsLeft.toString().padStart(2, '0')}
        </p>

        <p class="text-xl">
          I can tell that it is accurate though, but I'm not allowed to tell you
          when we'll be back.
        </p>
      {/if}
    </div>
  </Card>
</div>
