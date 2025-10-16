export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  action?: string; // What the user needs to do
  targetElement?: string; // Element to highlight
  allowedActions?: string[]; // Actions allowed in this step
  completionCheck?: () => boolean;
}

export class TutorialStore {
  // Tutorial state
  isActive = $state(true);
  currentStepIndex = $state(0);
  isCompleted = $state(false);

  // Tutorial dialogue
  currentDialogue = $state<{
    speaker: string;
    text: string;
    avatar?: string;
  } | null>(null);

  // Tutorial steps
  steps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to PonziLand!',
      description:
        "Welcome to the tutorial! I'll teach you how to buy, sell, and manage your lands.",
      action: 'Click anywhere to continue',
    },
    {
      id: 'view-map',
      title: 'Explore the Map',
      description:
        'This is the PonziLand map. You can pan by dragging and zoom with the mouse wheel.',
      action: 'Try panning and zooming the map',
      allowedActions: ['pan', 'zoom'],
    },
    {
      id: 'select-land',
      title: 'Select a Land',
      description:
        'Click on any land to see its details. Empty lands can be purchased!',
      action: 'Click on an empty land (gray tiles)',
      targetElement: 'empty-land',
      allowedActions: ['select-land'],
    },
    {
      id: 'buy-land',
      title: 'Buy Your First Land',
      description:
        'Great! This land is available. Click the Buy button to purchase it.',
      action: 'Click the Buy button',
      targetElement: 'buy-button',
      allowedActions: ['buy-land'],
    },
    {
      id: 'manage-land',
      title: 'Manage Your Land',
      description:
        'Congratulations! You now own a land. You can upgrade it or set a new price.',
      action: 'Try upgrading your land',
      targetElement: 'upgrade-button',
      allowedActions: ['upgrade-land', 'set-price'],
    },
    {
      id: 'wallet-info',
      title: 'Check Your Wallet',
      description:
        'Your wallet shows your token balances. You spend tokens to buy and upgrade lands.',
      action: 'Check your wallet balance',
      targetElement: 'wallet-widget',
    },
    {
      id: 'auction',
      title: 'Land Auctions',
      description:
        'Some lands are auctioned. The highest bidder wins when the timer ends!',
      action: 'View the auction land (purple tile)',
      targetElement: 'auction-land',
      allowedActions: ['view-auction'],
    },
    {
      id: 'completion',
      title: 'Tutorial Complete!',
      description:
        "You've learned the basics! Now go explore and build your PonziLand empire!",
      action: 'Start playing',
    },
  ];

  // Get current step
  get currentStep() {
    return this.steps[this.currentStepIndex];
  }

  // Get progress percentage
  get progress() {
    return Math.round((this.currentStepIndex / (this.steps.length - 1)) * 100);
  }

  // Show dialogue
  showDialogue(speaker: string, text: string, avatar?: string) {
    this.currentDialogue = { speaker, text, avatar };
  }

  // Hide dialogue
  hideDialogue() {
    this.currentDialogue = null;
  }

  // Go to next step
  nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.onStepChange();
    } else {
      this.completeTutorial();
    }
  }

  // Go to previous step
  previousStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.onStepChange();
    }
  }

  // Jump to specific step
  goToStep(stepId: string) {
    const index = this.steps.findIndex((s) => s.id === stepId);
    if (index !== -1) {
      this.currentStepIndex = index;
      this.onStepChange();
    }
  }

  // Check if an action is allowed
  isActionAllowed(action: string): boolean {
    const currentStep = this.currentStep;
    if (!currentStep?.allowedActions) return true;
    return currentStep.allowedActions.includes(action);
  }

  // Handle step change
  private onStepChange() {
    const step = this.currentStep;

    // Show dialogue for the step
    if (step) {
      this.showDialogue(
        'Tutorial Guide',
        `${step.title}\n\n${step.description}`,
        '/images/tutorial-guide.png',
      );
    }
  }

  // Complete tutorial
  private completeTutorial() {
    this.isCompleted = true;
    this.isActive = false;

    // Save completion to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('ponziland-tutorial-completed', 'true');
    }
  }

  // Skip tutorial
  skipTutorial() {
    this.completeTutorial();
  }

  // Reset tutorial
  reset() {
    this.isActive = true;
    this.currentStepIndex = 0;
    this.isCompleted = false;
    this.currentDialogue = null;
    this.onStepChange();
  }

  // Check if tutorial was completed before
  wasCompletedBefore(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ponziland-tutorial-completed') === 'true';
  }
}

export const tutorialStore = new TutorialStore();
