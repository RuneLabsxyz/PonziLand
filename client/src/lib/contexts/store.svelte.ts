// TODO: Add bindings
import type { SchemaType } from '$lib/models.gen';
import zustandToSvelte from '$lib/zustandToSvelte';
//@ts-ignore: This error comes from a difference between the types and the actual implementation.
import { createDojoStore } from '@dojoengine/sdk/react';
import type { createDojoStore as dojoStoreFunction } from '@dojoengine/sdk';
import { getContext, setContext } from 'svelte';

const storeKey = Symbol('dojo_store');

let state: { value?: Store } = $state({});

export type Store = ReturnType<typeof setupStore>;

export function setupStore() {
  const value = zustandToSvelte(
    // This is a dirty fix to make the type checker happy
    createDojoStore<SchemaType>() as ReturnType<
      typeof dojoStoreFunction<SchemaType>
    >,
  );

  state = { value };

  return value;
}

export function useStore(): Store {
  const context = state.value;

  if (context == undefined) {
    throw 'Store is not set!';
  } else {
    return context;
  }
}
