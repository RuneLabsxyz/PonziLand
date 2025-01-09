<script lang="ts">
    import YourLands from '../components/sidebar/yourlands.svelte';
    import YourBids from '../components/sidebar/yourbids.svelte';
    let open = $state(false);
    let activeTab = $state('lands'); // 'lands' or 'bids'
</script>

{#if open}
    <div class="fixed top-0 left-8 h-screen w-[300px] bg-white shadow-lg z-50">
        <div class="flex justify-between items-center px-2 border-b">
            <h1>Become the ponzi</h1>
            <button class="p-2" aria-label="Close sidebar" onclick={() => (open = false)}>
                ×
            </button>
        </div>
        
        <div class="border-b">
            <div class="flex">
                <button 
                    class="flex-1 p-2 {activeTab === 'lands' ? 'bg-gray-100 font-bold' : ''}"
                    onclick={() => activeTab = 'lands'}
                >
                    Your Lands
                </button>
                <button 
                    class="flex-1 p-2 {activeTab === 'bids' ? 'bg-gray-100 font-bold' : ''}"
                    onclick={() => activeTab = 'bids'}
                >
                    Your Bids
                </button>
            </div>
        </div>

        <div class="p-4 overflow-y-auto max-h-[calc(100vh-96px)]">
            {#if activeTab === 'lands'}
                <YourLands />
            {:else}
                <YourBids />
            {/if}
        </div>
    </div>
{:else}
    <button class="p-2 bg-white rounded" aria-label="Open sidebar" onclick={() => (open = true)}>
        <svg width="24" height="24" viewBox="0 0 24 24">
            <line x1="4" y1="6" x2="20" y2="6" stroke="black" stroke-width="2"/>
            <line x1="4" y1="12" x2="20" y2="12" stroke="black" stroke-width="2"/>
            <line x1="4" y1="18" x2="20" y2="18" stroke="black" stroke-width="2"/>
        </svg>
    </button>
{/if}