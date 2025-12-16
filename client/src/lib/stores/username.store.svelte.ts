import accountDataProvider from '$lib/account.svelte';
import { getSocialink } from '$lib/accounts/social/index.svelte';

// Shared username state
let refetchKey = $state(0);
let usernamePromise: Promise<{ exists: boolean; username?: string } | null> =
  $state(Promise.resolve(null));

// Track address changes and refetch
let lastAddress: string | undefined = $state(undefined);

export const usernameStore = {
  get promise() {
    return usernamePromise;
  },

  /**
   * Trigger a refetch of the username (call after registration)
   */
  refetch() {
    refetchKey++;
    this.update();
  },

  /**
   * Update the username based on current address
   */
  update() {
    const address = accountDataProvider.address;
    if (address) {
      const socialink = getSocialink();
      if (socialink) {
        usernamePromise = socialink.getUser(address);
      }
    } else {
      usernamePromise = Promise.resolve(null);
    }
  },

  /**
   * Initialize the store - should be called once on app start
   */
  init() {
    $effect.root(() => {
      $effect(() => {
        const address = accountDataProvider.address;
        // Refetch when address changes or refetchKey changes
        const _ = refetchKey;
        if (address !== lastAddress) {
          lastAddress = address;
          this.update();
        } else if (address) {
          // refetchKey changed, refetch
          this.update();
        }
      });
    });
  },
};

// Auto-initialize on import
usernameStore.init();
