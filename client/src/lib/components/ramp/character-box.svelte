<script lang="ts">
  import { AccountManager, setupAccount } from '$lib/contexts/account';
  import type { AccountInterface } from 'starknet';

  let {
    controllerAccount,
    account,
  }: {
    controllerAccount: AccountInterface | undefined;
    account: AccountManager | undefined;
  } = $props();

  const instructions = {
    instructions: [
      {
        stepNumber: 1,
        title: 'Step Into the Arena',
        description:
          "Summon your Phantom wallet and click 'Connect Phantom' to open the gates of Ponzi.land. Fortune favors the brave!",
      },
      {
        stepNumber: 2,
        title: 'Forge Your Controller',
        description:
          'Construct your mighty controller—a mystical vault that will safeguard your tokens and grant you the power to play in Ponzi.land.',
      },
      {
        stepNumber: 3,
        title: 'Tribute Your Tokens',
        description:
          'Send USDC from your Phantom wallet to your newly forged controller. Feed the beast and watch your balance come to life!',
      },
      {
        stepNumber: 4,
        title: 'Embrace the Game',
        description:
          'Your controller is now fueled and ready. Plunge into the heart of Ponzi.land to play and chase glory!',
      },
    ],
    reminder:
      "Once your controller is set up and fueled, you won't need to repeat these steps. Next time, simply connect via your controller to jump back into the action!",
  };

  let stepNumber = $state(0);

  function nextStep() {
    stepNumber = (stepNumber + 1) % (instructions.instructions.length + 1);
  }
</script>

<div
  class="absolute flex items-center top-0 left-1/2 transform -translate-x-1/2 z-30 p-4 my-2"
>
  <img src="/assets/ui/ramp/character.png" alt="Character" class="w-24 h-24" />
  <button
    class="relative bg-chatbox flex items-center justify-center"
    style="background-image: url('/assets/ui/ramp/chat-box.png'); background-size: cover; width: 600px; height: 180px;"
    onclick={nextStep}
    onkeydown={(e) => e.key === 'Enter' && nextStep()}
  >
    {#if stepNumber < instructions.instructions.length}
      <div class="p-4 text-black text-center">
        <p class="text-xl font-bold mb-2">
          {instructions.instructions[stepNumber].title}
        </p>
        <p class="text-sm">
          {instructions.instructions[stepNumber].description}
        </p>
      </div>
    {/if}
  </button>
</div>
