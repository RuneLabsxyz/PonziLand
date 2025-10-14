import { MAX_CLAIM_ALL_COUNT } from '$lib/flags';

export let devsettings = $state({
  frustumPadding: 2,
  claimAllCount: MAX_CLAIM_ALL_COUNT,
  cameraControlsLeftClick: 2,
  cameraControlsRightClick: 2,
  CameraControlsWheel: 0b100000,
  billboarding: false,
  randomUpdates: false, // Enable/disable random land updates
  minRandomUpdates: 10,
  maxRandomUpdates: 20,
  nukeRate: 0.5,
  updateInterval: 1000,
  showRoads: true,
  showBiomes: true,
  showBuildings: true,
  showCoins: true,
  showLandOverlay: true,
  showRatesOverlay: true,
  showGrid: false,
  showUI: true,
  showNukes: true,
  showOwnerIndicator: true,
  showNukeTimes: false,
  showArtLayer: false,
  artLayerOpacity: 1,
  showHeatmap: false,
  showClouds: true,
  multiLandInfo: false,
  // Animation Performance Settings
  enableAnimations: true, // Master animation toggle
  enableSpriteAnimations: true, // Sprite animations (biomes, buildings, nukes)
  enableShaderAnimations: true, // Coin hover effects and other shader animations
  enableCloudAnimations: true, // Cloud movement and effects
  enableNukeAnimations: true, // Nuke pulsing and time display animations
  reducedAnimationMode: false, // Reduces FPS and disables non-essential animations
  animationFPS: 30, // FPS for sprite animations (reduced from default when in reduced mode)
});

// Animation performance presets
export function setAnimationPerformance(
  preset: 'high' | 'medium' | 'low' | 'off',
) {
  switch (preset) {
    case 'high':
      devsettings.enableAnimations = true;
      devsettings.enableSpriteAnimations = true;
      devsettings.enableShaderAnimations = true;
      devsettings.enableCloudAnimations = true;
      devsettings.enableNukeAnimations = true;
      devsettings.reducedAnimationMode = false;
      devsettings.animationFPS = 60;
      break;
    case 'medium':
      devsettings.enableAnimations = true;
      devsettings.enableSpriteAnimations = true;
      devsettings.enableShaderAnimations = true;
      devsettings.enableCloudAnimations = true;
      devsettings.enableNukeAnimations = true;
      devsettings.reducedAnimationMode = true;
      devsettings.animationFPS = 30;
      break;
    case 'low':
      devsettings.enableAnimations = true;
      devsettings.enableSpriteAnimations = true;
      devsettings.enableShaderAnimations = false;
      devsettings.enableCloudAnimations = false;
      devsettings.enableNukeAnimations = false;
      devsettings.reducedAnimationMode = true;
      devsettings.animationFPS = 15;
      break;
    case 'off':
      devsettings.enableAnimations = false;
      devsettings.enableSpriteAnimations = false;
      devsettings.enableShaderAnimations = false;
      devsettings.enableCloudAnimations = false;
      devsettings.enableNukeAnimations = false;
      devsettings.reducedAnimationMode = true;
      devsettings.animationFPS = 0;
      break;
  }
}
