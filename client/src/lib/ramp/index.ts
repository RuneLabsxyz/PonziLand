// main.ts

import { createAppKit } from '@reown/appkit';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { sepolia } from '@reown/appkit/networks';

// 1. Get projectId from https://cloud.reown.com
const projectId = 'e99a3b083d592b390d9bf86de8f2e667';

// 2. Create your application's metadata object
const metadata = {
  name: 'PonziRamp',
  description: 'AppKit Example',
  url: 'https://reown.com/appkit', // origin must match your domain & subdomain
  icons: ['https://assets.reown.com/reown-profile-pic.png'],
};

// 3. Create a AppKit instance
export const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  networks: [sepolia],
  metadata,
  projectId,
  features: {
    analytics: false,
    onramp: false,
    swaps: false,
    socials: false,
  },
});
