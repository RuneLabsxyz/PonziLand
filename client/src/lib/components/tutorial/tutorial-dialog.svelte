<script lang=ts>
    import { Card } from '$lib/components/ui/card';
    import { tutorialState } from './stores.svelte';
    import dialogData from './dialog.json';

    let currentDialog = $derived(dialogData[tutorialState.tutorialStep - 1]);

</script>

<div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
<Card>
    <div class="flex flex-col gap-2 w-[400px] p-4">
        <h1 class="text-2xl font-bold">Tutorial</h1>
        {#if currentDialog}
            <div class="text-sm">
                {@html currentDialog.text}
            </div>
        {/if}
    </div>
</Card>
</div>