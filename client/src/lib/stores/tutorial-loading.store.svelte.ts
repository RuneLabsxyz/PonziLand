export class TutorialLoadingStore {
  isLoading = $state(true);
  progress = $state(0);

  async startLoading() {
    this.isLoading = true;
    this.progress = 0;

    // Simulate loading tutorial assets
    const steps = [
      { name: 'Initializing tutorial', duration: 500 },
      { name: 'Loading tutorial map', duration: 800 },
      { name: 'Setting up tutorial state', duration: 500 },
      { name: 'Preparing tutorial dialogue', duration: 300 },
    ];

    let currentProgress = 0;
    const progressStep = 100 / steps.length;

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, step.duration));
      currentProgress += progressStep;
      this.progress = Math.min(currentProgress, 100);
    }

    this.isLoading = false;
  }
}

export const tutorialLoadingStore = new TutorialLoadingStore();
