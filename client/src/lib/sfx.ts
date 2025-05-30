import { Sound, useSound } from 'svelte-sound';

export const click_sound = new Sound('/sfx/PL_ButtonClick2.wav');
export const click_directive = useSound('/sfx/PL_ButtonClick2.wav', ['click']);

export const buy_sound = new Sound('/sfx/PL_BuildingBuy.wav');

export const claim_sound = new Sound('/sfx/PL_Claim1.wav');

export const biomeSelect_sound = new Sound('/sfx/PL_BiomeSelect1.wav');

export const hover_sound = new Sound('/sfx/PL_Hover1.wav');
