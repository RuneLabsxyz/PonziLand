//TODO: Add cartridge controller at some point

import type { DojoConfig } from "@dojoengine/core";
import { BurnerManager, setupBurnerManager } from "@dojoengine/create-burner";
import { getContext, setContext } from "svelte";

const accountKey = Symbol("dojoAccount");

// For the context, svelte is weird.
// You cannot reassign, because then the change is not propagated through the setContext (js identity things)
// So we need to wrap it in a {value: value} to make it work.

export function setupBurner(
    config: DojoConfig
): Promise<BurnerManager | undefined> {
    let state: { value: BurnerManager | undefined } = { value: undefined };

    const promise = (async () => {
        if (typeof window === "undefined") {
            // We are on the server. Return nothing.
            return undefined;
        }
        return await setupBurnerManager(config);
    })().then((e) => (state.value = e));

    setContext(accountKey, state);

    return promise;
}

export function useBurner(): BurnerManager {
    const contextValue = getContext<{ value: BurnerManager | undefined }>(
        accountKey
    ).value;

    if (contextValue == null) {
        throw "The context is null! Please await for setupBurner before using components containing useBurner()!";
    }

    return contextValue;
}
