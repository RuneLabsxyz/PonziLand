<script>
  import { goto } from '$app/navigation';
  import { setupAccount } from '$lib/contexts/account';
  import { dojoConfig } from '$lib/dojoConfig';
  // setup account
  const account = setupAccount(dojoConfig);

  async function startGame() {
    const accountProvider = await account;
    if (accountProvider == null) {
      console.log('No accountProvider?!?');
      return;
    }

    await accountProvider.connect();

    if (accountProvider?.getAccount()) {
      goto('/game');
    } else {
      console.log('User has cancelled login.');
    }
  }
</script>

<main
  class="relative flex flex-col items-center justify-center h-screen overflow-hidden"
>
  <!-- Animated gradient background -->
  <div
    class="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-500 to-green-400 animate-gradient"
  ></div>

  <!-- Floating circles for added visual interest -->
  <div
    class="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full mix-blend-multiply filter blur-xl animate-blob"
  ></div>
  <div
    class="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-300/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
  ></div>
  <div
    class="absolute bottom-1/4 left-1/3 w-96 h-96 bg-yellow-200/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
  ></div>

  <h1 class="text-6xl font-bold mb-8 text-white drop-shadow-lg z-10">
    Ponzi Land
  </h1>
  <button
    on:click={startGame}
    class="px-12 py-4 text-xl text-white bg-white/20 backdrop-blur-sm rounded-lg
               hover:bg-white/30 transition-all transform hover:scale-105 z-10
               border-2 border-white/30 hover:border-white/50 shadow-lg"
  >
    Play
  </button>

  <div
    class="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center"
  >
    <p class="text-white text-xl mb-4">Super official sponsors</p>
    <div class="flex items-center justify-center gap-8">
      <div class="flex flex-col items-center gap-4">
        <div class="text-white/50 text-sm">Master of dojo</div>
        <img src="/home/tarrence.png" alt="Tarrance" class="h-24 w-auto" />
      </div>
      <div class="flex flex-col items-center gap-4">
        <div class="text-white/50 text-sm">Matcha boy</div>
        <img src="/home/calc.png" alt="Calc" class="h-24 w-auto" />
      </div>
    </div>
  </div>
</main>

<style>
  @keyframes blob {
    0% {
      transform: translate(0px, 0px) scale(1);
    }
    33% {
      transform: translate(30px, -30px) scale(1.1);
    }
    66% {
      transform: translate(-30px, 30px) scale(1.2);
    }
    100% {
      transform: translate(0px, 0px) scale(1);
    }
  }
</style>
