import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import process from 'node:process';

// Import dotenv for environment variables
import dotenv from 'dotenv';
dotenv.config();

let profile = process.env.DOJO_PROFILE?.toLowerCase() ?? 'dev';

process.env.PUBLIC_DOJO_PROFILE = profile;

// Game configuration constants
const GAME_LAUNCH_DATE = '2025-10-01T00:00:00Z';
const TOURNAMENT_START_DATE = '2025-12-15T19:00:00Z';
const TOURNAMENT_END_DATE = '2025-12-20T19:30:00Z';

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
    PUBLIC_BRIDGE_API_URL: process.env.BRIDGE_API_URL,
    PUBLIC_SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    PUBLIC_ENABLE_BRIDGE: process.env.ENABLE_BRIDGE,
    PUBLIC_FARO_COLLECTOR_URL: process.env.FARO_COLLECTOR_URL,
    PUBLIC_GIT_COMMIT_HASH: process.env.PUBLIC_GIT_COMMIT_HASH,
    PUBLIC_POSTHOG_KEY: process.env.POSTHOG_KEY,
    PAYMASTER_API_KEY: process.env.PAYMASTER_API_KEY,
    LAYERSWAP_TOKEN: process.env.LAYERSWAP_TOKEN,
    PUBLIC_GAME_LAUNCH: process.env.GAME_LAUNCH,
    PUBLIC_TOURNAMENT_START: process.env.TOURNAMENT_START,
    PUBLIC_TOURNAMENT_END: process.env.TOURNAMENT_END,
  },
  dev: {
    PUBLIC_DOJO_RPC_URL: 'http://127.0.0.1:5050',
    PUBLIC_DOJO_TORII_URL: 'http://127.0.0.1:8080',
    PUBLIC_AVNU_URL: 'https://sepolia.api.avnu.fi',
    PUBLIC_EKUBO_URL: 'https://sepolia-api.ekubo.org',
    PUBLIC_SOCIALINK_URL: 'https://socialink-sepolia.ponzi.land',
    PUBLIC_PONZI_API_URL: 'https://api-sepolia.ponzi.land',
    PUBLIC_BRIDGE_API_URL: 'http://localhost:5173',
    PUBLIC_SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
    PUBLIC_ENABLE_BRIDGE: 'false',
    PUBLIC_DOJO_CHAIN_ID: 'SN_KATANA',
    PUBLIC_DOJO_BURNER_ADDRESS:
      '0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec',
    PUBLIC_DOJO_BURNER_PRIVATE:
      '0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912',
    BYPASS_TOKEN: '',
    LAYERSWAP_TOKEN: '',
    PAYMASTER_API_KEY: '',
    PUBLIC_FARO_COLLECTOR_URL: null,
    PUBLIC_GIT_COMMIT_HASH: null,
    PUBLIC_POSTHOG_KEY: null,
    PUBLIC_GAME_LAUNCH: GAME_LAUNCH_DATE,
    PUBLIC_TOURNAMENT_START: TOURNAMENT_START_DATE,
    PUBLIC_TOURNAMENT_END: TOURNAMENT_END_DATE,
  },
  sepolia: {
    PUBLIC_DOJO_RPC_URL: 'https://api.cartridge.gg/x/starknet/sepolia/rpc/v0_8',
    PUBLIC_DOJO_TORII_URL:
      'https://api.cartridge.gg/x/ponziland-sepolia-new/torii',
    PUBLIC_DOJO_CHAIN_ID: 'SN_SEPOLIA',
    PUBLIC_AVNU_URL: 'https://sepolia.api.avnu.fi',
    PUBLIC_EKUBO_URL: 'https://sepolia-api.ekubo.org',
    PUBLIC_DOJO_BURNER_ADDRESS: null,
    PUBLIC_DOJO_BURNER_PRIVATE: null,
    BYPASS_TOKEN: '',
    LAYERSWAP_TOKEN: '',
    PAYMASTER_API_KEY: '',
    PUBLIC_SOCIALINK_URL: 'https://socialink-sepolia.ponzi.land',
    PUBLIC_PONZI_API_URL: 'https://api.runelabs.xyz/ponziland-sepolia/api/',
    PUBLIC_BRIDGE_API_URL: 'https://ponzi.land',
    PUBLIC_SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
    PUBLIC_ENABLE_BRIDGE: 'false',
    PUBLIC_FARO_COLLECTOR_URL:
      'https://faro-collector-prod-eu-west-2.grafana.net/collect/6b0946d2811fceca6349c46b402a3d2c',
    PUBLIC_GIT_COMMIT_HASH: process.env.PUBLIC_GIT_COMMIT_HASH,
    PUBLIC_POSTHOG_KEY: null,
    PUBLIC_GAME_LAUNCH: GAME_LAUNCH_DATE,
    PUBLIC_TOURNAMENT_START: TOURNAMENT_START_DATE,
    PUBLIC_TOURNAMENT_END: TOURNAMENT_END_DATE,
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
    PUBLIC_PONZI_API_URL: 'https://api.ponzi.land/api',
    PUBLIC_BRIDGE_API_URL: 'https://ponzi.land',
    PUBLIC_SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
    PUBLIC_ENABLE_BRIDGE: 'true',
    PUBLIC_FARO_COLLECTOR_URL:
      'https://faro-collector-prod-eu-west-2.grafana.net/collect/6b0946d2811fceca6349c46b402a3d2c',
    PUBLIC_GIT_COMMIT_HASH: process.env.PUBLIC_GIT_COMMIT_HASH,
    PUBLIC_POSTHOG_KEY: null,
    PUBLIC_GAME_LAUNCH: GAME_LAUNCH_DATE,
    PUBLIC_TOURNAMENT_START: TOURNAMENT_START_DATE,
    PUBLIC_TOURNAMENT_END: TOURNAMENT_END_DATE,
  },
  'mainnet-local-api': {
    PUBLIC_DOJO_RPC_URL: 'https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9',
    PUBLIC_DOJO_TORII_URL:
      'https://api.cartridge.gg/x/ponziland-mainnet-world-new/torii',
    PUBLIC_DOJO_CHAIN_ID: 'SN_MAIN',
    PUBLIC_AVNU_URL: 'https://starknet.api.avnu.fi',
    PUBLIC_EKUBO_URL: 'https://mainnet-api.ekubo.org',
    PUBLIC_DOJO_BURNER_ADDRESS: null,
    PUBLIC_DOJO_BURNER_PRIVATE: null,
    BYPASS_TOKEN: '',
    LAYERSWAP_TOKEN: '',
    PAYMASTER_API_KEY: '',
    PUBLIC_SOCIALINK_URL: 'https://socialink.ponzi.land',
    PUBLIC_PONZI_API_URL: 'http://localhost:3031',
    PUBLIC_BRIDGE_API_URL: 'https://ponzi.land',
    PUBLIC_SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
    PUBLIC_ENABLE_BRIDGE: 'true',
    PUBLIC_FARO_COLLECTOR_URL:
      'https://faro-collector-prod-eu-west-2.grafana.net/collect/6b0946d2811fceca6349c46b402a3d2c',
    PUBLIC_GIT_COMMIT_HASH: process.env.PUBLIC_GIT_COMMIT_HASH,
    PUBLIC_POSTHOG_KEY: null,
    PUBLIC_GAME_LAUNCH: GAME_LAUNCH_DATE,
    PUBLIC_TOURNAMENT_START: TOURNAMENT_START_DATE,
    PUBLIC_TOURNAMENT_END: TOURNAMENT_END_DATE,
  },
  mainnet: {
    PUBLIC_DOJO_RPC_URL: 'https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9',
    PUBLIC_DOJO_TORII_URL:
      'https://api.cartridge.gg/x/ponziland-mainnet-world-new/torii',
    PUBLIC_DOJO_CHAIN_ID: 'SN_MAIN',
    PUBLIC_AVNU_URL: 'https://starknet.api.avnu.fi',
    PUBLIC_EKUBO_URL: 'https://mainnet-api.ekubo.org',
    PUBLIC_DOJO_BURNER_ADDRESS: null,
    PUBLIC_DOJO_BURNER_PRIVATE: null,
    BYPASS_TOKEN: '',
    LAYERSWAP_TOKEN: '',
    PAYMASTER_API_KEY: '',
    PUBLIC_SOCIALINK_URL: 'https://socialink.ponzi.land',
    PUBLIC_PONZI_API_URL: 'https://api.runelabs.xyz/ponziland-mainnet/api/',
    PUBLIC_BRIDGE_API_URL: 'https://ponzi.land',
    PUBLIC_SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
    PUBLIC_ENABLE_BRIDGE: 'true',
    PUBLIC_FARO_COLLECTOR_URL:
      'https://faro-collector-prod-eu-west-2.grafana.net/collect/6b0946d2811fceca6349c46b402a3d2c',
    PUBLIC_GIT_COMMIT_HASH: process.env.PUBLIC_GIT_COMMIT_HASH,
    PUBLIC_POSTHOG_KEY: null,
    PUBLIC_GAME_LAUNCH: GAME_LAUNCH_DATE,
    PUBLIC_TOURNAMENT_START: TOURNAMENT_START_DATE,
    PUBLIC_TOURNAMENT_END: TOURNAMENT_END_DATE,
  },
  deployment: {
    PUBLIC_DOJO_RPC_URL: 'https://api.cartridge.gg/x/starknet/sepolia',
    PUBLIC_DOJO_TORII_URL:
      'https://' + process.env['DEPLOY_NAME'] + '.ponzis.fun/torii',
    PUBLIC_DOJO_CHAIN_ID: 'SN_SEPOLIA',
    PUBLIC_AVNU_URL: 'https://sepolia.api.avnu.fi',
    PUBLIC_EKUBO_URL: 'https://sepolia-api.ekubo.org',
    PUBLIC_DOJO_BURNER_ADDRESS: null,
    PUBLIC_DOJO_BURNER_PRIVATE: null,
    BYPASS_TOKEN: '',
    LAYERSWAP_TOKEN: '',
    PAYMASTER_API_KEY: '',
    PUBLIC_SOCIALINK_URL: 'https://socialink-sepolia.ponzi.land',
    PUBLIC_PONZI_API_URL:
      'https://' + process.env['DEPLOY_NAME'] + '.ponzis.fun/api',
    PUBLIC_BRIDGE_API_URL: 'https://ponzi.land',
    PUBLIC_SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
    PUBLIC_ENABLE_BRIDGE: 'false',
    PUBLIC_FARO_COLLECTOR_URL:
      'https://faro-collector-prod-eu-west-2.grafana.net/collect/6b0946d2811fceca6349c46b402a3d2c',
    PUBLIC_GIT_COMMIT_HASH: process.env.PUBLIC_GIT_COMMIT_HASH,
    PUBLIC_POSTHOG_KEY: null,
    PUBLIC_GAME_LAUNCH: GAME_LAUNCH_DATE,
    PUBLIC_TOURNAMENT_START: TOURNAMENT_START_DATE,
    PUBLIC_TOURNAMENT_END: TOURNAMENT_END_DATE,
    MANIFEST_PATH: '/etc/config/manifest.json',
    DATA_PATH: '/etc/config/data.json',
  },
  deployment_local: {
    PUBLIC_DOJO_RPC_URL: 'https://api.cartridge.gg/x/starknet/sepolia',
    PUBLIC_DOJO_TORII_URL: 'https://play.ponzis.fun/torii',
    PUBLIC_DOJO_CHAIN_ID: 'SN_SEPOLIA',
    PUBLIC_AVNU_URL: 'https://sepolia.api.avnu.fi',
    PUBLIC_EKUBO_URL: 'https://sepolia-api.ekubo.org',
    PUBLIC_DOJO_BURNER_ADDRESS: null,
    PUBLIC_DOJO_BURNER_PRIVATE: null,
    BYPASS_TOKEN: '',
    LAYERSWAP_TOKEN: '',
    PAYMASTER_API_KEY: '',
    PUBLIC_SOCIALINK_URL: 'https://socialink-sepolia.ponzi.land',
    PUBLIC_PONZI_API_URL: 'https://play.ponzis.fun/api',
    PUBLIC_BRIDGE_API_URL: 'https://ponzi.land',
    PUBLIC_SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
    PUBLIC_ENABLE_BRIDGE: 'false',
    PUBLIC_FARO_COLLECTOR_URL:
      'https://faro-collector-prod-eu-west-2.grafana.net/collect/6b0946d2811fceca6349c46b402a3d2c',
    PUBLIC_GIT_COMMIT_HASH: process.env.PUBLIC_GIT_COMMIT_HASH,
    PUBLIC_POSTHOG_KEY: null,
    PUBLIC_GAME_LAUNCH: GAME_LAUNCH_DATE,
    PUBLIC_TOURNAMENT_START: TOURNAMENT_START_DATE,
    PUBLIC_TOURNAMENT_END: TOURNAMENT_END_DATE,
    MANIFEST_PATH: '../playtest/deployments/test/manifest.json',
    DATA_PATH: '../playtest/deployments/test/data.json',
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

const manifestPath =
  process.env['MANIFEST_PATH'] || `../contracts/manifest_${profile}.json`;
const dataPath = process.env['DATA_PATH'] || `data/${profile}.json`;

console.log('Manifest: ', manifestPath);

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://svelte.dev/docs/kit/adapters for more information about adapters.
    adapter:
      process.env['DOCKER'] == 'true' ? adapterNode() : adapterCloudflare(),
    alias: {
      $manifest: manifestPath,
      $profileData: dataPath,
      $tokens: '/src/tokens',
    },
  },
};

export default config;
