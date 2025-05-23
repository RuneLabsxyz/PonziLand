<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import data from '$profileData';
  import TokenSelect from './TokenSelect.svelte';

  // Svelte 5 reactive states using runes
  let input1 = $state('');
  let select1 = $state(data.availableTokens[0]?.address || '');
  let input2 = $state('');
  let select2 = $state(data.availableTokens[1]?.address || '');

  function handleSwap() {
    // Swap input values
    [input1, input2] = [input2, input1];
    // Swap selected tokens
    [select1, select2] = [select2, select1];
  }
</script>

<div class="flex flex-col relative">
  <div class="flex gap-2 rounded border border-[#ffffff55] p-2">
    <input
      class="w-full bg-[#282835] text-white rounded p-1"
      bind:value={input1}
    />
    <TokenSelect bind:value={select1} />
  </div>
  <div class="flex gap-2 rounded border border-[#ffffff55] p-2">
    <input
      class="w-full bg-[#282835] text-white rounded p-1"
      bind:value={input2}
    />
    <TokenSelect bind:value={select2} />
  </div>
  <button
    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
    onclick={handleSwap}
  >
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12.9365"
        cy="13.1347"
        r="11.6736"
        fill="#10101A"
        stroke="#57575E"
        stroke-width="1.45921"
      />
      <path
        d="M10.3827 8.02734V15.8384M10.3827 8.02734L7.8291 10.631M10.3827 8.02734L12.9363 10.631M15.4899 18.2418V10.4307M15.4899 18.2418L18.0435 15.6381M15.4899 18.2418L12.9363 15.6381"
        stroke="white"
        stroke-opacity="0.5"
        stroke-width="1.24462"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</div>

<Button class="w-full mt-2">SWAP</Button>
