<script lang="ts">
  import { AccountManager, setupAccount } from '$lib/contexts/account';
  import { currentStep } from '$lib/ramp/stores.svelte';
  import { step } from '@reown/appkit/networks';
  import type { AccountInterface } from 'starknet';

  let {
    controllerAccount,
    account,
  }: {
    controllerAccount: AccountInterface | undefined;
    account: string | undefined;
  } = $props();

  const instructions = {
    instructions: [
      {
        stepNumber: 1,
        title: '1/ Step Into the Arena',
        description:
          "Summon your Phantom wallet and click 'Connect Phantom' to open the gates of Ponzi.land. Fortune favors the brave!",
      },
      {
        stepNumber: 2,
        title: '2/ Forge Your Controller',
        description:
          'Construct your mighty controller — a mystical vault that will safeguard your tokens and grant you the power to play in Ponzi.land.',
      },
      {
        stepNumber: 3,
        title: '3/ Make your choice',
        description:
          'Choose the amount you are willing to bet in Ponzi.land. You can always add more later.',
      },
      {
        stepNumber: 4,
        title: '4/ Tribute Your Tokens',
        description:
          'Send USDC from your Phantom wallet to your newly forged controller. Feed the beast and watch your balance come to life!',
      },
      {
        stepNumber: 5,
        title: '5/ Let the Ponziboys transfer your tokens',
        description:
          'My ponziboys are currently hard at work transferring your tokens to your controller. But I trust them on how to approach this task',
      },
      {
        stepNumber: 6,
        title: '6/ Embrace the Game',
        description:
          'Your controller is now fueled and ready. Plunge into the heart of Ponzi.land to play and chase glory!',
      },
    ],
    reminder:
      "Once your controller is set up and fueled, you won't need to repeat these steps. Next time, simply connect via your controller to jump back into the action!",
  };

  let displayedTitle = $state('');
  let displayedDescription = $state('');
  let intervalIdDescription: NodeJS.Timeout;

  function typeText(
    targetText: string,
    setter: (value: string) => void,
    onComplete?: () => void,
  ) {
    let index = 0;
    return setInterval(() => {
      setter(targetText.slice(0, index));
      index++;
      if (index > targetText.length && onComplete) {
        onComplete();
      }
    }, 20);
  }

  let stepNumber = $derived(currentStep.current);

  $effect(() => {
    console.log('Attempting to access step', stepNumber);
    if (currentStep.current <= instructions.instructions.length) {
      const step = instructions.instructions[currentStep.current - 1];
      console.log(step);

      clearInterval(intervalIdDescription);

      displayedTitle = step.title;
      displayedDescription = '';

      intervalIdDescription = typeText(
        step.description,
        (d) => (displayedDescription = d),
      );
    } else {
      console.log('Concern');
    }
  });
</script>

<div class="w-screen">
  <div class="flex items-center justify-center transform z-40 p-4 my-2">
    <img
      src="/assets/ui/ramp/character.png"
      alt="Character"
      class="w-24 h-24"
      class:animate-shake={displayedDescription.length <
        instructions.instructions[stepNumber - 1]?.description.length}
    />
    <button
      class="relative bg-chatbox flex items-center justify-center"
      style="background-image: url('/assets/ui/ramp/chat-box.png'); background-size: cover; width: 600px; height: 180px;"
      onclick={() => {
        if (
          displayedDescription.length <
          instructions.instructions[stepNumber - 1].description.length
        ) {
          clearInterval(intervalIdDescription);
          displayedDescription =
            instructions.instructions[stepNumber - 1].description;
        }
      }}
      onkeydown={(e) => e.key === 'Enter'}
    >
      {#if stepNumber <= instructions.instructions.length}
        <div class="p-4 mx-14 text-black text-left" style="width: 550px;">
          <div class="mb-2">
            <p class="text-3xl font-bold">{displayedTitle}</p>
          </div>
          <div class="relative text-xl">
            <span class="invisible block">
              {instructions.instructions[stepNumber - 1].description}
            </span>
            <span class="absolute top-0 left-0 block">
              {displayedDescription}
            </span>
          </div>
        </div>
      {/if}
    </button>
  </div>
</div>

<style>
  .animate-shake {
    animation: shake 0.2s infinite;
    transform-origin: center;
    animation-timing-function: linear;
  }

  @keyframes shake {
    0% {
      transform: rotate(-8deg);
    }
    50% {
      transform: rotate(8deg);
    }
    100% {
      transform: rotate(-8deg);
    }
  }
</style>
