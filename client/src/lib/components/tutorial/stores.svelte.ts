import { selectedLand } from '$lib/stores/store.svelte';
import { get } from 'svelte/store';
import { TutorialLandStore } from './tutorial-land-store';
import { widgetsStore } from '$lib/stores/widgets.store';

export let tutorialLandStore = $state(new TutorialLandStore());

export let tutorialState = $state({
  tutorialEnabled: false,
  tutorialProgress: 1,
});

export function nextStep() {
  if (tutorialState.tutorialProgress < 25) {
    tutorialState.tutorialProgress += 1;
    changeMap();
  }
}

export function previousStep() {
  if (tutorialState.tutorialProgress > 1) {
    tutorialState.tutorialProgress -= 1;
    changeMap();
  }
}

// Tutorial progression handler:
export function changeMap() {
  if (
    tutorialState.tutorialProgress >= 3 &&
    tutorialState.tutorialProgress < 8
  ) {
    tutorialLandStore.addAuction();
  } else if (tutorialState.tutorialProgress < 3) {
    tutorialLandStore.removeAuction();
  }
  if (tutorialState.tutorialProgress === 4) {
    // Select the auction tile at position [32][32]
    const landStore = tutorialLandStore.getLand(32, 32);
    if (landStore) {
      const land = get(landStore);
      selectedLand.value = land;
    }
  }

  if (tutorialState.tutorialProgress === 5) {
    widgetsStore.addWidget({
      id: 'tutorial',
      type: 'tutorial',
      position: { x: 100, y: 20 },
      dimensions: { width: 500, height: 0 },
      isMinimized: false,
      isOpen: true,
    });
  }

  if (tutorialState.tutorialProgress === 8) {
    tutorialLandStore.buyAuction(32, 32);
  }
  if (tutorialState.tutorialProgress === 9) {
    tutorialLandStore.levelUp(32, 32);
  }
  if (tutorialState.tutorialProgress === 10) {
    tutorialLandStore.levelUp(32, 32);
  }
  if (tutorialState.tutorialProgress === 11) {
    tutorialLandStore.addAuction(31, 32);
    tutorialLandStore.addAuction(33, 32);
    tutorialLandStore.addAuction(33, 33);
  } else if (tutorialState.tutorialProgress <= 11) {
    tutorialLandStore.removeAuction(31, 32);
    tutorialLandStore.removeAuction(33, 32);
    tutorialLandStore.removeAuction(33, 33);
    tutorialLandStore.setDisplayRates(false);
  }
  if (tutorialState.tutorialProgress === 12) {
    tutorialLandStore.buyAuction(31, 32, 1);
    tutorialLandStore.buyAuction(33, 32, 2);
    tutorialLandStore.buyAuction(33, 33, 3);
    tutorialLandStore.setDisplayRates(true);
  }
  if (tutorialState.tutorialProgress >= 13) {
    tutorialLandStore.setDisplayRates(false);
  }

  if (tutorialState.tutorialProgress === 14) {
    tutorialLandStore.setStake(10000000000000000000);
  }

  if (tutorialState.tutorialProgress === 15) {
    tutorialLandStore.setNuke(true);
  }

  if (tutorialState.tutorialProgress === 19) {
    tutorialLandStore.addAuction();
  }
}
