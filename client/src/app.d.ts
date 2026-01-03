// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type {
  Env,
  CfProperties,
  ExecutionContext,
} from '@cloudflare/workers-types';

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    interface Platform {
      env: Env;
      cf: CfProperties;
      ctx: ExecutionContext;
    }
  }

  interface Window {
    phantom?: {
      ethereum?: unknown;
    };
  }
}

export {};
