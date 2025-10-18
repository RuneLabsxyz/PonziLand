export let tutorialState = $state({
  tutorialEnabled: false,
  tutorialStep: 1,
  interactionsLocked: true,
});

export function nextStep() {
  if (tutorialState.tutorialStep < 25) {
    tutorialState.tutorialStep += 1;
    updateInteractionLock();
  }
}

export function previousStep() {
  if (tutorialState.tutorialStep > 1) {
    tutorialState.tutorialStep -= 1;
    updateInteractionLock();
  }
}

export function enableTutorial() {
  tutorialState.tutorialEnabled = true;
  tutorialState.tutorialStep = 1;
  updateInteractionLock();
}

export function disableTutorial() {
  tutorialState.tutorialEnabled = false;
}

export function shouldLockInteractions() {
  return tutorialState.tutorialEnabled && tutorialState.tutorialStep === 1;
}

export function updateInteractionLock() {
  tutorialState.interactionsLocked = shouldLockInteractions();
}
