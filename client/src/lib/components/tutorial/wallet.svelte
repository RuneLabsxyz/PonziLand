<script lang="ts">
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress, shortenHex } from '$lib/utils';
  import Button from '../ui/button/button.svelte';
  import Card from '../ui/card/card.svelte';
  import accountDataProvider, { setup } from '$lib/account.svelte';
  import Leaderboard from '../ui/leaderboard/Leaderboard.svelte';
  import { getSocialink } from '$lib/accounts/social/index.svelte';
  import type { Token } from '$lib/interfaces';
  import data from '$lib/data.json';
  import WalletBalance from './wallet-balance.svelte';
</script>

<div class="fixed top-0 right-0 z-50">
  <div class="absolute top-2 left-0" style="transform: translateX(-120%);">
    <div class="flex flex-col gap-2">
      <a
        href="https://x.com/ponzidotland"
        target="_blank"
        referrerpolicy="no-referrer"
      >
        <img
          src="/ui/social/x.png"
          alt="X icon"
          style="image-rendering: pixelated;"
          class="h-8 w-8"
        />
      </a>
      <a
        href="https://discord.gg/WJgymPB5aB"
        target="_blank"
        referrerpolicy="no-referrer"
      >
        <img
          src="/ui/social/discord.png"
          alt="Discord icon"
          style="image-rendering: pixelated;"
          class="h-8 w-8"
        />
      </a>
    </div>
  </div>
  <Card class="shadow-ponzi w-72">
    <div class="flex justify-between items-center text-sm">
      <button type="button" class="flex gap-2 items-center">
        <p>
          User: Guest
          <span class="opacity-50 text-sm">0xp0nZi</span>
        </p>
      </button>
      <button onclick={() => {}} aria-label="Logout">
        <img src="/ui/icons/logout.png" alt="logout" class="h-5 w-5" />
      </button>
    </div>
    <hr class="my-3" />
    <WalletBalance />
  </Card>
  <Leaderboard />
</div>
