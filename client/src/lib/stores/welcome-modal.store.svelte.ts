import { browser } from '$app/environment';
import { checkWalletActivity } from '$lib/api/wallet-activity';

class WelcomeModalStore {
  private static STORAGE_KEY = 'hasSeenWelcomeModal';

  private _shouldShow = $state(false);
  private _isChecking = $state(false);

  get shouldShow() {
    return this._shouldShow;
  }

  get isChecking() {
    return this._isChecking;
  }

  /**
   * Check if the user has seen the welcome modal before (from localStorage)
   */
  private hasSeenModalBefore(): boolean {
    if (!browser) return false;

    try {
      const seen = localStorage.getItem(WelcomeModalStore.STORAGE_KEY);
      return seen === 'true';
    } catch (error) {
      console.error(
        'Failed to read welcome modal flag from localStorage:',
        error,
      );
      return false;
    }
  }

  /**
   * Check backend and show modal if conditions are met:
   * - User hasn't seen modal before (localStorage)
   * - Wallet has no onchain activity
   */
  async checkAndShowModal(address: string): Promise<void> {
    console.log('[WelcomeModalStore] checkAndShowModal called', {
      browser,
      address,
    });

    if (!browser || !address) {
      console.log('[WelcomeModalStore] Early return - no browser or address');
      return;
    }

    // Don't check if already checking
    if (this._isChecking) {
      console.log('[WelcomeModalStore] Already checking, skipping');
      return;
    }

    // Don't check if user has already seen the modal
    const hasSeenBefore = this.hasSeenModalBefore();
    console.log('[WelcomeModalStore] Has seen before?', hasSeenBefore);
    if (hasSeenBefore) {
      return;
    }

    this._isChecking = true;
    console.log(
      '[WelcomeModalStore] Starting activity check for address:',
      address,
    );

    try {
      const { hasActivity } = await checkWalletActivity(address);
      console.log('[WelcomeModalStore] Activity check result:', {
        hasActivity,
      });

      // Only show modal if wallet has NO activity
      if (!hasActivity) {
        console.log('[WelcomeModalStore] Setting shouldShow = true');
        this._shouldShow = true;
      } else {
        console.log(
          '[WelcomeModalStore] Wallet has activity, not showing modal',
        );
      }
    } catch (error) {
      console.error('[WelcomeModalStore] Error in checkAndShowModal:', error);
      // Fail-safe: don't show modal on errors
    } finally {
      this._isChecking = false;
    }
  }

  /**
   * Mark the modal as seen and hide it
   * This sets the localStorage flag so it won't show again
   */
  markAsSeen(): void {
    if (!browser) return;

    try {
      localStorage.setItem(WelcomeModalStore.STORAGE_KEY, 'true');
      this._shouldShow = false;
    } catch (error) {
      console.error(
        'Failed to save welcome modal flag to localStorage:',
        error,
      );
    }
  }

  /**
   * Hide the modal without marking as seen
   * Used for error cases where we want to hide but not persist
   */
  hide(): void {
    this._shouldShow = false;
  }
}

export const welcomeModalStore = new WelcomeModalStore();
