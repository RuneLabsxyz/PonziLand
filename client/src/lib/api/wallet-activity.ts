import { PUBLIC_PONZI_API_URL } from '$env/static/public';

interface LandHistoricalCountResponse {
  owner: string;
  total_lands_owned: number;
  first_activity_at: string | null;
}

/**
 * Check if a wallet has any onchain activity in PonziLand
 * @param address - The wallet address to check
 * @returns Promise resolving to { hasActivity: boolean }
 */
export async function checkWalletActivity(
  address: string,
): Promise<{ hasActivity: boolean }> {
  const url = `${PUBLIC_PONZI_API_URL}land-historical/${address}/count`;
  console.log('[WalletActivity] Checking wallet activity', { address, url });

  try {
    // 5-second timeout for the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `${PUBLIC_PONZI_API_URL}land-historical/${address}/count`,
      {
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    console.log('[WalletActivity] Response status:', response.status);

    if (!response.ok) {
      console.error(
        `[WalletActivity] Failed to fetch wallet activity: ${response.status} ${response.statusText}`,
      );
      // Fail-safe: don't show modal on errors
      return { hasActivity: true };
    }

    const data: LandHistoricalCountResponse = await response.json();
    console.log('[WalletActivity] Response data:', data);

    // If first_activity_at is not null, the wallet has activity
    const hasActivity = data.first_activity_at !== null;
    console.log('[WalletActivity] Has activity:', hasActivity);

    return { hasActivity };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[WalletActivity] Wallet activity check timed out');
    } else {
      console.error('[WalletActivity] Error checking wallet activity:', error);
    }

    // Fail-safe: don't show modal on errors
    return { hasActivity: true };
  }
}
