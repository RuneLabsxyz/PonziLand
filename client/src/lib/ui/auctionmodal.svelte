<script lang="ts">
    import type { AuctionData } from '$lib/interfaces';
    import { onMount, onDestroy } from 'svelte';

    let { onCancel, onBuy, data } = $props();
    let timeLeft = $state(0);
    let timer: number;

    onMount(() => {
        updateTimer();
        timer = setInterval(updateTimer, 1000);
    });

    onDestroy(() => {
        clearInterval(timer);
    });

    function updateTimer() {
        if (data?.bids.length) {
            const lastBid = data.bids[data.bids.length - 1];
            timeLeft = Math.max(0, (lastBid.timestamp + 3600000) - Date.now());
        }
    }

    function handleBuyClick() {
        onBuy(data);
    }

    function handleCancelClick() {
        onCancel();
    }
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4">Auction Modal</h2>
        
        {#if data?.bids.length}
            <div class="mb-4">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="text-lg font-semibold">Time Remaining:</h3>
                        <span class="text-xl font-bold">
                            {Math.floor(timeLeft / 60000)}m {Math.floor((timeLeft % 60000) / 1000)}s
                        </span>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">Current Price:</h3>
                        <span class="text-xl font-bold">
                            {data.bids[data.bids.length - 1].price} LORDS
                        </span>
                    </div>
                </div>
            </div>
            <div class="mt-4">
                <h2 class="text-lg font-bold mb-2">Auction History</h2>
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="bg-gray-100">
                            <th class="p-2 text-left">Price</th>
                            <th class="p-2 text-left">Bidder</th>
                            <th class="p-2 text-left">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.bids as bid}
                            <tr class="border-t">
                                <td class="p-2">{bid.price}</td>
                                <td class="p-2">{bid.bidder.slice(0, 6)}...</td>
                                <td class="p-2">{new Date(bid.timestamp).toLocaleString()}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
        
        <div class="flex justify-end space-x-4 mt-6">
            <button 
                class="px-4 py-2 border rounded-md hover:bg-gray-100 transition-colors"
                onclick={handleCancelClick}
            >
                Cancel
            </button>
            <button 
                class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                onclick={handleBuyClick}
            >
                Bid
            </button>
        </div>
    </div>
</div>