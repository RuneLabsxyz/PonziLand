// TODO: Add bindings
import type { SchemaType } from "$lib/models.gen";
import zustandToSvelte from "$lib/zustandToSvelte";
import { createDojoStore } from "@dojoengine/sdk";
import { getContext, setContext } from "svelte";

const storeKey = Symbol("dojo_store");

export type Store = ReturnType<typeof setupStore>;

export function setupStore() {
  const value = zustandToSvelte(createDojoStore<SchemaType>());

  setContext(storeKey, value);

  return value;
}

export function useStore(): Store {
  const context = getContext<Store | undefined>(storeKey);
  if (context == undefined) {
    throw "Store is not set!";
  } else {
    return context;
  }
}
