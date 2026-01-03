import tutorialData from './dialog.json';

// Tutorial camera settings
export const TUTORIAL_CAMERA = {
  zoomLevel: 280, // Higher = closer view
  centerX: 128,
  centerY: 128,
  lockControls: true, // Disable zoom/pan during tutorial
};

// Allowed land positions per step (empty array = no land clicks allowed)
const ALLOWED_LANDS_PER_STEP: Record<number, [number, number][]> = {
  1: [], // No clicks during intro
  2: [[128, 128]], // Click on owned land
  3: [[128, 128]], // Info panel exploration
  4: [[128, 128]], // Buy land - open menu
  5: [[128, 128]], // Buy land - execute
  6: [[127, 127]], // Auction intro - click on auction
  7: [[127, 127]], // Auction mechanics
  8: [[128, 128]], // Low stake warning
  9: [[128, 128]], // Increase stake
};

// Enabled widget buttons per step (others will be greyed out)
const ENABLED_WIDGETS_PER_STEP: Record<number, string[]> = {
  1: [],
  2: [],
  3: [],
  4: ['buy-land'],
  5: ['buy-land'],
  6: [],
  7: [],
  8: ['land-info'],
  9: ['land-info'],
  10: [],
};

// Field descriptions for interactive exploration (step 3)
export const TUTORIAL_FIELD_DESCRIPTIONS: Record<string, string> = {
  token:
    'The token used for this land. You pay taxes in this token.',
  stake:
    'Your deposited funds. Taxes are paid from this. When it runs out, your land gets nuked!',
  sell_price:
    'The price others must pay to buy your land. Higher price = higher taxes.',
  income: 'What you earn per hour from neighboring lands paying taxes to you.',
  outgoing: 'What you pay per hour in taxes to your neighbors.',
  earnings: 'Your net profit or loss per hour (income minus outgoing costs).',
  nuke: 'Time until your land explodes if stake runs out. Add more stake to extend this!',
};

export const TOTAL_EXPLORABLE_FIELDS = Object.keys(
  TUTORIAL_FIELD_DESCRIPTIONS,
).length;

export let tutorialState = $state({
  tutorialEnabled: false,
  tutorialStep: 1,
  exploredFields: new Set<string>(), // For interactive info panel
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

// Check if a land position is allowed for clicking in the current step
export function isLandClickAllowed(x: number, y: number): boolean {
  if (!tutorialState.tutorialEnabled) return true;
  const allowed = ALLOWED_LANDS_PER_STEP[tutorialState.tutorialStep] || [];
  if (allowed.length === 0) return false;
  return allowed.some(([ax, ay]) => ax === x && ay === y);
}

// Check if a widget button is enabled in the current step
export function isWidgetEnabled(widgetId: string): boolean {
  if (!tutorialState.tutorialEnabled) return true;
  const enabled = ENABLED_WIDGETS_PER_STEP[tutorialState.tutorialStep] || [];
  return enabled.length === 0 || enabled.includes(widgetId);
}

// Track explored fields for interactive info panel
export function markFieldExplored(fieldId: string) {
  tutorialState.exploredFields.add(fieldId);
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

export function checkProfitability() { }
