/**
 * Store for managing the empty wallet prompt visibility state.
 * Session-only dismissal - reappears on page refresh if wallet is still empty.
 */
class EmptyWalletPromptStore {
  // Track if user has dismissed the prompt this session
  private sessionDismissed = $state(false);

  // Whether the prompt should be shown (when not dismissed)
  public get shouldShow(): boolean {
    return !this.sessionDismissed;
  }

  /**
   * Dismiss the prompt for this session
   */
  public dismiss(): void {
    this.sessionDismissed = true;
  }

  /**
   * Reset dismissal state (e.g., when wallet was funded then emptied again)
   */
  public reset(): void {
    this.sessionDismissed = false;
  }
}

export const emptyWalletPromptStore = new EmptyWalletPromptStore();
