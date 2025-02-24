import type { UniversalProviderType } from '@reown/appkit-adapter-ethers';
import { appKit } from '.';

export let address: { current?: string | undefined } = $state({});
export let provider: { current?: UniversalProviderType | undefined } = $state(
  {},
);

appKit.subscribeAccount((state) => {
  address.current = state.address;
});

appKit.subscribeProviders((state) => {
  console.log('Providers:', state);
  provider.current = state['eip155'] as UniversalProviderType | undefined;
});

(async () => {
  // Fetch the providers on reload
  provider.current = appKit.getProvider('eip155');
  if (provider.current != undefined) {
    address.current = appKit.getAddress('eip155');
  }
})();

export let currentStep: { current: number } = $state({ current: 1 });

export function setCurrentStep(step: number) {
  console.log('Setting current step to:', step);
  currentStep.current = step;
}
