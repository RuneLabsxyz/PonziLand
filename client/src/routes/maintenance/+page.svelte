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
      <h1
        class="text-4xl font-bold font-ponzi-number stroke-3d-black text-center mb-3"
      >
        Exclusive closed alpha ongoing !
      </h1>
      <p class="text-xl">
        Devs are doing something with the help of some mad ponziboys, get
        <a class="text-blue-500 underline" href="https://discord.gg/WE4zghKJ">
          into Discord
        </a>
        to ask for access, you may find some luck, get rugg'd!
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
