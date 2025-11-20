import tutorialData from './dialog.json';

export let tutorialState = $state({
  tutorialEnabled: false,
  tutorialStep: 1,
});

export function nextStep() {
  if (tutorialState.tutorialStep < tutorialData.length) {
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

// Create a derived value that contains the current step's attributes
let currentStepAttributes = $derived(
  tutorialState.tutorialEnabled
    ? tutorialData[tutorialState.tutorialStep - 1].has || []
    : [],
);

export function tutorialAttribute(attribute: string) {
  return {
    get has() {
      return (
        tutorialState.tutorialEnabled &&
        currentStepAttributes.includes(attribute)
      );
    },
  };
}

export function checkProfitability() {}
