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
  1: [], // Fullscreen intro - no clicks
  2: [], // Lazi intro - no clicks
  3: [[128, 128]], // Click on owned land
  4: [[128, 128]], // Info panel exploration
  5: [[128, 128]], // Pro mode toggle
  6: [[128, 128]], // Token earnings explanation
  7: [[128, 128]], // Buy land - open menu
  8: [[128, 128]], // Buy land - execute
  9: [[127, 127]], // Auction intro - click on auction
  10: [[127, 127]], // Auction buy - wait for purchase
  11: [], // Activate shields - no land clicks
  12: [[128, 128]], // Low stake warning
  13: [[128, 128]], // Increase stake
  14: [[128, 128]], // Claim your land to trigger neighbor nuke
};

// Enabled widget buttons per step (others will be greyed out)
const ENABLED_WIDGETS_PER_STEP: Record<number, string[]> = {
  1: [], // Fullscreen intro
  2: [], // Lazi intro
  3: [],
  4: [],
  5: [], // Pro mode toggle - no widget buttons
  6: [], // Token earnings - no widget buttons
  7: ['buy-land'],
  8: ['buy-land'],
  9: ['buy-land'], // Clicking auction opens buy widget
  10: ['buy-land'], // Auction buy step
  11: [], // Activate shields - no widget buttons
  12: ['land-info'],
  13: ['land-info'],
  14: ['land-info'], // Claim button in land info
  15: [],
};

// Field descriptions for interactive exploration (step 3)
export const TUTORIAL_FIELD_DESCRIPTIONS: Record<string, string> = {
  token: 'The token used for this land. You pay taxes in this token.',
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
