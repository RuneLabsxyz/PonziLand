import { sveltekit } from '@sveltejs/kit/vite';
import wasm from 'vite-plugin-wasm';
import { defineConfig } from 'vitest/config';
import glsl from 'vite-plugin-glsl';
import process from 'node:process';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import type { Plugin } from 'vite';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);

// Resolve path to ethers-v5 package directory
let ethersV5Dir: string;
try {
  ethersV5Dir = path.dirname(require.resolve('ethers-v5/package.json'));
} catch {
  ethersV5Dir = '';
}

// Plugin to alias ethers to v5 only for @hyperlane-xyz packages
function hyperlaneEthersPlugin(): Plugin {
  return {
    name: 'hyperlane-ethers-v5',
    enforce: 'pre',
    resolveId(source, importer) {
      // Only intercept 'ethers' imports from @hyperlane-xyz packages
      if (source === 'ethers' && importer && importer.includes('@hyperlane-xyz')) {
        return this.resolve('ethers-v5', importer, { skipSelf: true });
      }
      return null;
    }
  };
}

// esbuild plugin for dependency pre-bundling
const hyperlaneEthersEsbuildPlugin = {
  name: 'hyperlane-ethers-v5-esbuild',
  setup(build: any) {
    // Handle bare 'ethers' imports from @hyperlane-xyz packages
    build.onResolve({ filter: /^ethers$/ }, (args: any) => {
      if (args.importer && args.importer.includes('@hyperlane-xyz') && ethersV5Dir) {
        return { path: path.join(ethersV5Dir, 'lib.esm', 'index.js') };
      }
      return null;
    });

    // Handle 'ethers-v5' imports (used by zksync-web3 patch)
    build.onResolve({ filter: /^ethers-v5$/ }, (args: any) => {
      if (ethersV5Dir) {
        return { path: path.join(ethersV5Dir, 'lib.esm', 'index.js') };
      }
      return null;
    });

    // Handle 'ethers-v5/lib/...' subpath imports (CJS)
    build.onResolve({ filter: /^ethers-v5\/lib\// }, (args: any) => {
      if (ethersV5Dir) {
        const subpath = args.path.replace('ethers-v5/lib/', '');
        return { path: path.join(ethersV5Dir, 'lib', subpath + '.js') };
      }
      return null;
    });
  }
};

export default defineConfig({
  plugins: [
    hyperlaneEthersPlugin(),
    glsl(),
    sveltekit(),
    wasm(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    })
  ],
  build: {
    sourcemap: false,
    minify: false,
    target: 'es2022',
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    fs: {
      allow: ['..'],
    },
  },
  resolve: {
    alias: {
      '@dojoengine/sdk-svelte': '../dist/index.js',
      $lib: '/src/lib',
    },
    conditions: process.env.VITEST ? ['browser'] : undefined,
  },
  define: {
    global: {},
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [hyperlaneEthersEsbuildPlugin],
    },
  },
  ssr: {
    noExternal: ['@dojoengine/torii-wasm'],
  },
});
