import { useBurner } from "./account";
import { useClient } from "./client";
import { useStore } from "./store";

export function useDojo() {
    const client = useClient();
    const account = useBurner();
    const store = useStore();
    return {
        client,
        account,
        store,
    };
}
