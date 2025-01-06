<script>
    import { dev } from '$app/environment';
    import ThreeDots from '$lib/components/threeDots.svelte';
    import { Progress } from '$lib/components/ui/progress';
    import { setupBurner } from '$lib/contexts/account';
    import { setupClient } from '$lib/contexts/client';
    import { setupStore } from '$lib/contexts/store';
    import { dojoConfig } from '$lib/dojoConfig';
    import Map from '$lib/map/map.svelte';
    import Ui from '$lib/ui/ui.svelte';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';

    let loading = $state(true);
    let value = $state(10);

    const promise = Promise.all([
        setupClient(dojoConfig),
        setupBurner(dojoConfig),
        setupStore(),
    ]);

    $effect(() => {
        let increment = 10;

        const interval = setInterval(() => {
            value += increment;
            if (increment > 1) {
                increment = increment - 1;
            }
            if (value >= 80) {
                clearInterval(interval);
            }
        }, 100);

        promise
            .then((res) => {
                console.log('promise resolved', res);
                clearInterval(interval);
                value = 100;
                setTimeout(() => {
                    loading = false;
                }, 200);
            })
            .catch((err) => {
                console.error('promise rejected', err);
                clearInterval(interval);
                value = 100;
                setTimeout(() => {
                    loading = false;
                }, 200);
            });
    });
</script>

<div class="h-screen w-screen bg-black/10 overflow-hidden relative">
    {#if loading}
        <div
            transition:fade
            class="absolute inset-0 flex items-center justify-center bg-[#322637] flex-col z-50 dark"
        >
            <!-- will need an svg for smooth rendering-->
            <!-- <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-pyramid text-white h-20 w-20"
                ><path
                    d="M2.5 16.88a1 1 0 0 1-.32-1.43l9-13.02a1 1 0 0 1 1.64 0l9 13.01a1 1 0 0 1-.32 1.44l-8.51 4.86a2 2 0 0 1-1.98 0Z"
                /><path d="M12 2v20" /></svg
            > -->
            <img
                src="/images/PONZI_LAND_LOGO.png"
                class="w-1/2"
                alt="ponziland logo"
                fetchPriority="high"
            />
            <div class="text-2xl text-white">
                loading
                <ThreeDots />
            </div>
            <Progress {value} max={100} class="w-[60%]"/>
        </div>
    {:else}
        <Map />
        <Ui />
    {/if}
</div>
