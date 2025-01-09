<script lang="ts">
    import { playerLands } from '$lib/api/mock-land';
    import { moveCameraTo } from '$lib/stores/camera';
</script>

<h2 class="text-lg font-bold mb-4">Your Lands</h2>
{#each $playerLands as land}
    <button class="mb-4 p-3 border rounded shadow-sm w-full text-left" 
        onclick={() => moveCameraTo(
            Math.floor(land.location % 64) + 1,
            Math.floor(land.location / 64) + 1
        )}>
        <p class="font-medium">Location: {land.location % 64 + 1}, {Math.floor(land.location / 64) + 1}</p>
        <p>Block date bought: {land.block_date_bought}</p>
        <p>Sell Price: {land.sell_price}</p>
        {#if land.token_used}
            <p>Token: {land.token_used}</p>
        {/if}
        {#if land.pool_key}
            <p>Pool: {land.pool_key}</p>
        {/if}
    </button>
{/each}
