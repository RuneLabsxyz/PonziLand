import { createAudioStore } from '$lib/stores/audioStore.store';
const sounds = {
  click: '/sfx/PL_ButtonClick2.wav',
  buy: '/sfx/PL_BuildingBuy.wav',
  claim: '/sfx/PL_Claim1.wav',
  biomeSelect: '/sfx/PL_BiomeSelect1.wav',
  hover: '/sfx/PL_Hover1.wav',
  launchGame: '/sfx/PL_LaunchGame.wav',
  nuke: '/sfx/PL_Nuke1.wav',
  coin1: '/sfx/PL_Coin.wav',
};

export const gameSounds = $state(createAudioStore(sounds));
