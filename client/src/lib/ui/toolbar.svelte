<script lang="ts">
    import Button from '$lib/components/ui/button/button.svelte';
    import * as Sheet from '$lib/components/ui/sheet';
    import Yourlands from './sidebar/yourlands.svelte';
</script>

<div class="z-30 absolute bottom-0 left-0 right-0 flex justify-center p-4">
    <div class="flex gap-2">
        <Sheet.Root preventScroll={false}>
            <Sheet.Trigger>
                <Button>My lands</Button>
            </Sheet.Trigger>
            <Sheet.Content side="left">
                <Sheet.Header>
                    <Sheet.Title>Your lands</Sheet.Title>
                    <Yourlands />
                </Sheet.Header>
            </Sheet.Content>
        </Sheet.Root>
        <Button>My Bids</Button>
        <Button>Achievements</Button>
    </div>
</div>
