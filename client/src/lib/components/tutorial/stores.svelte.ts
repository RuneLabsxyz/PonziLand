export let tutorialState = $state({
  tutorialEnabled: false,
  tutorialStep: 1,
});

export function nextStep() {
  if (tutorialState.tutorialStep < 25) {
    tutorialState.tutorialStep += 1;
  }
}

export function previousStep() {
  if (tutorialState.tutorialStep > 1) {
    tutorialState.tutorialStep -= 1;
  }
}

export function enableTutorial() {
  tutorialState.tutorialEnabled = true;
  tutorialState.tutorialStep = 1;
}

export function disableTutorial() {
  tutorialState.tutorialEnabled = false;
}
