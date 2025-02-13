import { DojoProvider, type DojoConfig } from '@dojoengine/core';
import { init } from '@dojoengine/sdk';
import { schema, type SchemaType as Schema } from '$lib/models.gen';
import { wrappedActions } from '$lib/api/contracts/approve';
import { dojoConfig } from '$lib/dojoConfig';
import { getContext, setContext } from 'svelte';

let dojoKey = Symbol('dojo');

export type Client = NonNullable<Awaited<ReturnType<typeof _setupDojo>>>;

async function _setupDojo(config: DojoConfig) {
  if (typeof window === 'undefined') {
    // We are on the server. Return nothing.
    return undefined;
  }

  const initialized = await init(
    {
      client: {
        rpcUrl: config.rpcUrl,
        toriiUrl: config.toriiUrl,
        relayUrl: config.relayUrl,
        worldAddress: config.manifest.world.address,
      },
      domain: {
        name: 'ponzi_land',
        version: '1.0',
        chainId: 'KATANA',
        revision: '1',
      },
    },
    schema,
  );

  const provider = new DojoProvider(dojoConfig.manifest, dojoConfig.rpcUrl);
  return {
    ...initialized,
    provider,
    toriiClient: initialized.client,
    client: await wrappedActions(provider),
  };
}

let state: { value: Client | undefined } = $state({ value: undefined });

// Set the context (This function CANNOT be async due to setContext not working otherwise)
export async function setupClient(
  config: DojoConfig,
): Promise<Client | undefined> {
  if (state?.value == undefined) {
    // set the value in the context
    const result = await _setupDojo(config);

    state = { value: result };

    return result;
  } else {
    return Promise.resolve(state.value);
  }
}

export function useClient(): Client {
  const contextValue = state.value;

  if (contextValue == null) {
    throw 'The context is null! Please await for setupDojo before using components containing useDojo() !';
  }

  return contextValue;
}
