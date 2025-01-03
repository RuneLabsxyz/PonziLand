<script>
    import { setupBurner } from '$lib/contexts/account';
    import { setupClient } from '$lib/contexts/client';
    import { setupStore } from '$lib/contexts/store';
    import { dojoConfig } from '$lib/dojoConfig';
    import Map from '$lib/map/map.svelte';
    import Ui from '$lib/ui/ui.svelte';

    const promise = Promise.all([
        setupClient(dojoConfig),
        setupBurner(dojoConfig),
        setupStore(),
    ])
</script>

<div class="h-screen w-screen bg-black/10 overflow-hidden">
    {#await promise}
        <p>Loading...</p>
    {:then _}
        <Map />
        <Ui />
    <!-- even if dojo error render -->
    {:catch _}
        <Map />
        <Ui />
    {/await}
</div>
