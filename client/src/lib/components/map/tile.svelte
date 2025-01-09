<script lang="ts">    

    import { tileHUD } from '$lib/stores/stores';
    import data from '$lib/data.json';
    
    
    let backgroundImage = $state('/tiles/grass.jpg');

    let { type, location, owner, sellPrice, tokenUsed, tokenAddress } = $props<{
        type: string;
        location: number;
        owner: string | null;
        sellPrice: number;
        tokenUsed: string | null;
        tokenAddress: string | null;
    }>()

    function handleClick() {
        console.log('clicked');
        $tileHUD = {
            location: location,
            owner: owner,
            sellPrice: sellPrice,
            tokenUsed: tokenUsed,
            tokenAddress: tokenAddress
        };
    }

    // const getCastleImage = () => {
    //     const token = data.availableTokens.find(t => t.name === tokenUsed);
    //     return token ? token.images.castle.basic : '/images/basic/basic.png';
    // };

    const getCastleImage = () => {
        const token = data.availableTokens.find(t => t.name === tokenUsed);
        if (!token) {
            const basicTypes = ['basic', 'advanced', 'premium'];
            const randomBasic = basicTypes[Math.floor(Math.random() * basicTypes.length)];
            return `/assets/tokens/basic/castles/${randomBasic}.png`;
        }
        
        const castleTypes = ['basic', 'advanced', 'premium'] as const;
        const randomType = castleTypes[Math.floor(Math.random() * castleTypes.length)];
        return token.images.castle[randomType];
    };

    $effect(() => {
        backgroundImage = getCastleImage();
    });
</script>


<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore event_directive_deprecated -->
<div
    on:click={handleClick}
    class="tile"
    style={
        type === 'house'
            ? `background-image: url('${backgroundImage}'), url('/tiles/grass.jpg');
               background-size: contain, cover;
               background-repeat: no-repeat, repeat;
               background-position: center, center;`
            : `background-image: url('/tiles/${type}.jpg');
               background-size: cover;
               background-position: center;`
    }
>
</div>

<style>
    .tile {
        width: 32px;
        height: 32px;
        border: 1px solid #44656b;
    }
</style>