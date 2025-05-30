import { TutorialLandStore } from './tutorial-land-store';

export let tutorialLandStore = $state(new TutorialLandStore());

export function tutorialProgression() {
  let value = $state(1);

  return {
    get value() {
      return value;
    },
    increment: () => (value += 1),
    decrement: () => (value -= 1),
  };
}
