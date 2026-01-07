import tutorialData from './dialog.json';
import { TUTORIAL_CAMERA_CONFIG } from './constants';

/**
 * Known tutorial attribute names for type safety.
 * These correspond to values in the `has` array of dialog.json steps.
 */
export type TutorialAttribute =
  // Display modes
  | 'fullscreen_intro'
  | 'darken_map'
  | 'darken_widget'
  | 'no_interraction'
  // Highlighting - general
  | 'highlight_auction'
  | 'highlight_building'
  | 'highlight_map_buy'
  | 'highlight_info'
  | 'highlight_info_button'
  | 'highlight_pro_mode'
  | 'highlight_token_earnings'
  | 'highlight_tax_impact'
  | 'highlight_shield_button'
  | 'highlight_nuke_neighbor'
  | 'highlight_buy_inputs'
  // Highlighting - info panel fields
  | 'highlight_info_token'
  | 'highlight_info_stake'
  | 'highlight_info_sell_price'
  | 'highlight_info_income'
  | 'highlight_info_outgoing'
  | 'highlight_info_earnings'
  | 'highlight_info_nuke'
  // Wait conditions
  | 'wait_auction_click'
  | 'wait_auction_buy'
  | 'wait_second_auction_click'
  | 'wait_land_info_click'
  | 'wait_buy_land_open'
  | 'wait_buy_land'
  | 'wait_select_land'
  | 'wait_auction_selected'
  | 'wait_pro_mode_click'
  | 'wait_tax_impact_click'
  | 'wait_shield_click'
  | 'wait_info_open'
  | 'wait_increase_stake'
  | 'wait_claim_nuke'
  | 'wait_lazi_click'
  // Actions
  | 'spawn_second_auction'
  | 'spawn_neighbors'
  | 'spawn_full_auction'
  | 'auto_convert_auction'
  | 'auto_advance'
  | 'decrease_stake'
  | 'trigger_outro'
  // UI controls
  | 'show_next_button'
  | 'enter_grid'
  | 'simplified_buy'
  | 'allow_buy_widget'
  | 'interactive_explore'
  | 'interactive_tax_explore'
  // Phase markers
  | 'tutorial_phase_1'
  | 'tutorial_phase_2'
  | 'tutorial_phase_3'
  | 'tutorial_phase_4'
  | 'tutorial_phase_5'
  | 'tutorial_phase_6'
  // Nuke state
  | 'player_land_nuke'
  | 'neighbor_land_nuke';

// Position type for dynamic tutorial positioning
export interface TutorialPosition {
  type: 'fixed' | 'widget-relative' | 'map-relative';
  preset?: string; // For 'fixed' type
  targetWidget?: string; // For 'widget-relative' (e.g., 'buy-land', 'land-info')
  targetLand?: [number, number]; // For 'map-relative' [x, y]
  offset?: { x: number; y: number };
  fallback?: string; // Fallback preset if target unavailable
  dialogSide?: 'left' | 'right'; // Which side of the target to place the dialog
}

// Type definition for tutorial step
export interface TutorialStep {
  _step: string;
  text: string;
  image_id: number;
  has: string[];
  hint?: string;
  position?: string | TutorialPosition;
  allowed_lands: number[][];
  enabled_widgets: string[];
  continue?: string;
  spotlight_widget?: string; // Widget to spotlight with darkening overlay
}

// Normalize position to TutorialPosition format (backward compatible)
export function normalizePosition(
  position: string | TutorialPosition | undefined,
): TutorialPosition {
  if (!position) {
    return { type: 'fixed', preset: 'map-center', fallback: 'map-center' };
  }

  if (typeof position === 'string') {
    // Legacy format - treat as fixed preset
    return { type: 'fixed', preset: position, fallback: position };
  }

  return position;
}

// Tutorial camera settings (re-exported from constants for backward compatibility)
export const TUTORIAL_CAMERA = {
  zoomLevel: TUTORIAL_CAMERA_CONFIG.ZOOM_LEVEL,
  centerX: TUTORIAL_CAMERA_CONFIG.CENTER_X,
  centerY: TUTORIAL_CAMERA_CONFIG.CENTER_Y,
  lockControls: TUTORIAL_CAMERA_CONFIG.LOCK_CONTROLS,
};

// Field descriptions for interactive exploration (step 4)
export const TUTORIAL_FIELD_DESCRIPTIONS: Record<string, string> =
  tutorialData.field_descriptions;

export const TOTAL_EXPLORABLE_FIELDS = Object.keys(
  TUTORIAL_FIELD_DESCRIPTIONS,
).length;

// Tax field descriptions for interactive tax impact exploration (step 10)
export const TAX_FIELD_DESCRIPTIONS: Record<string, string> =
  (tutorialData as { tax_field_descriptions?: Record<string, string> })
    .tax_field_descriptions || {};

export const TOTAL_TAX_FIELDS = Object.keys(TAX_FIELD_DESCRIPTIONS).length;

export let tutorialState = $state({
  tutorialEnabled: false,
  tutorialStep: 1,
  exploredFields: new Set<string>(), // For interactive info panel
  exploredTaxFields: new Set<string>(), // For interactive tax impact panel
});

// Outro sequence state
export type OutroPhase =
  | 'idle'
  | 'zooming'
  | 'activity'
  | 'nuking'
  | 'pausing'
  | 'complete';

export let tutorialOutroState = $state({
  isPlaying: false,
  phase: 'idle' as OutroPhase,
});

export function startOutroSequence() {
  tutorialOutroState.isPlaying = true;
  tutorialOutroState.phase = 'zooming';
}

// Advance step with outro check - use this when the current step might have trigger_outro
export function advanceStepWithOutroCheck() {
  // Get current step attributes
  const currentStepData = tutorialData.steps[tutorialState.tutorialStep - 1];
  const hasOutroTrigger = currentStepData?.has?.includes('trigger_outro');

  if (hasOutroTrigger) {
    console.log(
      'Tutorial: Triggering outro sequence from step',
      tutorialState.tutorialStep,
    );
    startOutroSequence();
    return;
  }

  // Otherwise, normal advancement
  nextStep();
}

export function setOutroPhase(phase: OutroPhase) {
  tutorialOutroState.phase = phase;
  if (phase === 'complete') {
    tutorialOutroState.isPlaying = false;
  }
}

export function resetOutroSequence() {
  tutorialOutroState.isPlaying = false;
  tutorialOutroState.phase = 'idle';
}

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
export function getCurrentStep(): TutorialStep | null {
  if (!tutorialState.tutorialEnabled) return null;
  return tutorialData.steps[tutorialState.tutorialStep - 1] as TutorialStep;
}

export function tutorialAttribute(attribute: TutorialAttribute) {
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

// Track explored tax fields for interactive tax impact panel
export function markTaxFieldExplored(fieldId: string) {
  if (!tutorialState.exploredTaxFields.has(fieldId)) {
    tutorialState.exploredTaxFields = new Set([
      ...tutorialState.exploredTaxFields,
      fieldId,
    ]);
  }
}

export function isTaxFieldExplored(fieldId: string): boolean {
  return tutorialState.exploredTaxFields.has(fieldId);
}

export function getExploredTaxFieldsCount(): number {
  return tutorialState.exploredTaxFields.size;
}

export function resetExploredTaxFields() {
  tutorialState.exploredTaxFields = new Set();
}

// Skip to a specific minimum step (for action-based progression)
export function ensureMinimumStep(minStep: number) {
  if (tutorialState.tutorialEnabled && tutorialState.tutorialStep < minStep) {
    tutorialState.tutorialStep = minStep;
  }
}

// Skip to the step containing a specific attribute
export function skipToStepWithAttribute(attribute: string) {
  if (!tutorialState.tutorialEnabled) return;

  const stepIndex = tutorialData.steps.findIndex((step) =>
    step.has.includes(attribute),
  );

  if (stepIndex !== -1 && tutorialState.tutorialStep < stepIndex + 1) {
    tutorialState.tutorialStep = stepIndex + 1;
  }
}
