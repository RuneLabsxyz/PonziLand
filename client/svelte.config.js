import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import process from 'node:process';

// Import dotenv for environment variables
import dotenv from 'dotenv';
dotenv.config();

let profile = process.env.DOJO_PROFILE?.toLowerCase() ?? 'dev';

process.env.PUBLIC_DOJO_PROFILE = profile;

const profiles = {
  env: {
    PUBLIC_DOJO_RPC_URL: process.env.DOJO_RPC_URL,
    PUBLIC_DOJO_TORII_URL: process.env.DOJO_TORII_URL,
    PUBLIC_DOJO_BURNER_ADDRESS: process.env.DOJO_BURNER_ADDRESS,
    PUBLIC_DOJO_BURNER_PRIVATE: process.env.DOJO_BURNER_PRIVATE,
    PUBLIC_DOJO_CHAIN_ID: process.env.DOJO_CHAIN_ID,
    PUBLIC_AVNU_URL: process.env.AVNU_URL,
    PUBLIC_EKUBO_URL: process.env.EKUBO_URL,
    BYPASS_TOKEN: process.env.BYPASS_TOKEN,
    PUBLIC_SOCIALINK_URL: process.env.SOCIALINK_URL,
    PUBLIC_PONZI_API_URL: process.env.PONZI_API_URL,
    PUBLIC_FARO_COLLECTOR_URL: process.env.FARO_COLLECTOR_URL,
    PUBLIC_GIT_COMMIT_HASH: process.env.PUBLIC_GIT_COMMIT_HASH,
  },
  dev: {
    PUBLIC_DOJO_RPC_URL: 'http://127.0.0.1:5050',
    PUBLIC_DOJO_TORII_URL: 'http://127.0.0.1:8080',
    PUBLIC_AVNU_URL: 'https://sepolia.api.avnu.fi',
    PUBLIC_EKUBO_URL: 'https://sepolia-api.ekubo.org',
    PUBLIC_SOCIALINK_URL: 'https://socialink-sepolia.ponzi.land',
    PUBLIC_PONZI_API_URL: 'https://api-sepolia.ponzi.land',
    PUBLIC_DOJO_CHAIN_ID: 'SN_KATANA',
    PUBLIC_DOJO_BURNER_ADDRESS:
      '0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec',
    PUBLIC_DOJO_BURNER_PRIVATE:
      '0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912',
    BYPASS_TOKEN: '',
    LAYERSWAP_TOKEN: '',
    PUBLIC_FARO_COLLECTOR_URL: null,
    PUBLIC_GIT_COMMIT_HASH: null,
  },
  katana: {
    PUBLIC_DOJO_RPC_URL: 'https://play.ponzis.fun/x/katana/katana',
    PUBLIC_DOJO_TORII_URL: 'https://play.ponzis.fun/torii',
    PUBLIC_DOJO_CHAIN_ID: 'WP_KATANA',
    PUBLIC_AVNU_URL: 'https://sepolia.api.avnu.fi',
    PUBLIC_EKUBO_URL: 'https://sepolia-api.ekubo.org',
    PUBLIC_DOJO_BURNER_ADDRESS: null,
    PUBLIC_DOJO_BURNER_PRIVATE: null,
    BYPASS_TOKEN: '',
    LAYERSWAP_TOKEN: '',
    PUBLIC_SOCIALINK_URL: 'https://socialink-sepolia.ponzi.land',
    PUBLIC_PONZI_API_URL: 'https://api-sepolia.ponzi.land',
    PUBLIC_FARO_COLLECTOR_URL:
      'https://faro-collector-prod-eu-west-2.grafana.net/collect/6b0946d2811fceca6349c46b402a3d2c',
    PUBLIC_GIT_COMMIT_HASH: process.env.PUBLIC_GIT_COMMIT_HASH,
  },
  sepolia: {
    PUBLIC_DOJO_RPC_URL: 'https://api.cartridge.gg/x/starknet/sepolia',
    PUBLIC_DOJO_TORII_URL: 'https://api.cartridge.gg/x/ponziland-sepolia/torii',
    PUBLIC_DOJO_CHAIN_ID: 'SN_SEPOLIA',
    PUBLIC_AVNU_URL: 'https://sepolia.api.avnu.fi',
    PUBLIC_EKUBO_URL: 'https://sepolia-api.ekubo.org',
    PUBLIC_DOJO_BURNER_ADDRESS: null,
    PUBLIC_DOJO_BURNER_PRIVATE: null,
    BYPASS_TOKEN: '',
    LAYERSWAP_TOKEN: '',
    PUBLIC_SOCIALINK_URL: 'https://socialink-sepolia.ponzi.land',
    PUBLIC_PONZI_API_URL: 'https://api-sepolia.ponzi.land',
    PUBLIC_FARO_COLLECTOR_URL:
      'https://faro-collector-prod-eu-west-2.grafana.net/collect/6b0946d2811fceca6349c46b402a3d2c',
    PUBLIC_GIT_COMMIT_HASH: process.env.PUBLIC_GIT_COMMIT_HASH,
  },
  'mainnet-test': {
    PUBLIC_DOJO_RPC_URL: 'https://api.cartridge.gg/x/starknet/mainnet',
    PUBLIC_DOJO_TORII_URL:
      'https://api.cartridge.gg/x/ponziland-mainnet-test/torii',
    PUBLIC_DOJO_CHAIN_ID: 'SN_MAIN',
    PUBLIC_AVNU_URL: 'https://starknet.api.avnu.fi',
    PUBLIC_EKUBO_URL: 'https://mainnet-api.ekubo.org',
    PUBLIC_DOJO_BURNER_ADDRESS: null,
    PUBLIC_DOJO_BURNER_PRIVATE: null,
    BYPASS_TOKEN: '',
    LAYERSWAP_TOKEN: '',
    PUBLIC_SOCIALINK_URL: 'https://socialink.ponzi.land',
    PUBLIC_PONZI_API_URL: 'https://api.ponzi.land',
    PUBLIC_FARO_COLLECTOR_URL:
      'https://faro-collector-prod-eu-west-2.grafana.net/collect/6b0946d2811fceca6349c46b402a3d2c',
    PUBLIC_GIT_COMMIT_HASH: process.env.PUBLIC_GIT_COMMIT_HASH,
  },
  mainnet: {
    PUBLIC_DOJO_RPC_URL: 'https://api.cartridge.gg/x/starknet/mainnet',
    PUBLIC_DOJO_TORII_URL:
      'https://api.cartridge.gg/x/ponziland-tourney-2/torii',
    PUBLIC_DOJO_CHAIN_ID: 'SN_MAIN',
    PUBLIC_AVNU_URL: 'https://starknet.api.avnu.fi',
    PUBLIC_EKUBO_URL: 'https://mainnet-api.ekubo.org',
    PUBLIC_DOJO_BURNER_ADDRESS: null,
    PUBLIC_DOJO_BURNER_PRIVATE: null,
    BYPASS_TOKEN: '',
    LAYERSWAP_TOKEN: '',
    PUBLIC_SOCIALINK_URL: 'https://socialink.ponzi.land',
    PUBLIC_PONZI_API_URL: 'https://api.ponzi.land',
    PUBLIC_FARO_COLLECTOR_URL:
      'https://faro-collector-prod-eu-west-2.grafana.net/collect/6b0946d2811fceca6349c46b402a3d2c',
    PUBLIC_GIT_COMMIT_HASH: process.env.PUBLIC_GIT_COMMIT_HASH,
  },
};

const envProfile = profiles[profile];

// Check if available in the environment, else use the default one
for (const entry of Object.entries(profiles.env)) {
  if (entry[1] != null) {
    envProfile[entry[0]] = entry[1];
  }
}

for (const val of Object.entries(envProfile)) {
  process.env[val[0]] = val[1];
}

console.log(process.env['BYPASS_TOKEN']);

const manifestPath = profile == 'katana' ? `/etc/config/manifest_katana.json` : `../contracts/manifest_${profile}.json`;
const dataPath = profile == 'katana' ? `/etc/config/katana.json` : `${profile}.json`;

console.log('Manifest: ', manifestPath);
console.log('Data: ', dataPath);

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://svelte.dev/docs/kit/adapters for more information about adapters.
    adapter: adapter(),
    alias: {
      $manifest: manifestPath,
      $profileData: dataPath,
    },
  },
};

export default config;
