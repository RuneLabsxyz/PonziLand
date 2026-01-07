import tutorialData from './dialog.json';

// Type definition for tutorial step
interface TutorialStep {
  _step: string;
  text: string;
  image_id: number;
  has: string[];
  allowed_lands: number[][];
  enabled_widgets: string[];
  continue?: string;
}

// Tutorial camera settings
export const TUTORIAL_CAMERA = {
  zoomLevel: 280, // Higher = closer view
  centerX: 128,
  centerY: 128,
  lockControls: true, // Disable zoom/pan during tutorial
};

// Field descriptions for interactive exploration (step 3)
export const TUTORIAL_FIELD_DESCRIPTIONS: Record<string, string> =
  tutorialData.field_descriptions;

export const TOTAL_EXPLORABLE_FIELDS = Object.keys(
  TUTORIAL_FIELD_DESCRIPTIONS,
).length;

export let tutorialState = $state({
  tutorialEnabled: false,
  tutorialStep: 1,
  exploredFields: new Set<string>(), // For interactive info panel
});

export function nextStep() {
  if (tutorialState.tutorialStep < tutorialData.steps.length) {
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
    ? tutorialData.steps[tutorialState.tutorialStep - 1].has || []
    : [],
);

// Get the current step data
function getCurrentStep(): TutorialStep | null {
  if (!tutorialState.tutorialEnabled) return null;
  return tutorialData.steps[tutorialState.tutorialStep - 1] as TutorialStep;
}

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

// Check if a land position is allowed for clicking in the current step
export function isLandClickAllowed(x: number, y: number): boolean {
  if (!tutorialState.tutorialEnabled) return true;
  const step = getCurrentStep();
  if (!step) return true;
  const allowed = step.allowed_lands || [];
  if (allowed.length === 0) return false;
  return allowed.some(([ax, ay]) => ax === x && ay === y);
}

// Check if a widget button is enabled in the current step
export function isWidgetEnabled(widgetId: string): boolean {
  if (!tutorialState.tutorialEnabled) return true;
  const step = getCurrentStep();
  if (!step) return true;
  const enabled = step.enabled_widgets || [];
  return enabled.length === 0 || enabled.includes(widgetId);
}

// Track explored fields for interactive info panel
export function markFieldExplored(fieldId: string) {
  if (!tutorialState.exploredFields.has(fieldId)) {
    tutorialState.exploredFields = new Set([
      ...tutorialState.exploredFields,
      fieldId,
    ]);
  }
}

export function isFieldExplored(fieldId: string): boolean {
  return tutorialState.exploredFields.has(fieldId);
}

export function getExploredFieldsCount(): number {
  return tutorialState.exploredFields.size;
}

export function resetExploredFields() {
  tutorialState.exploredFields = new Set();
}

export function checkProfitability() {}
