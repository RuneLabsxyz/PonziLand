export let devsettings = $state({
  frustumPadding: 1.0,
  cameraControlsLeftClick: 2, // Default to TRUCK (0b10)
  billboarding: false,
  randomUpdates: true, // Enable/disable random land updates
  minRandomUpdates: 10,
  maxRandomUpdates: 20,
  nukeRate: 0.5,
  updateInterval: 1000,
});
