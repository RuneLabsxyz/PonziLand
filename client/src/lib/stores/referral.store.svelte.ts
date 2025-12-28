import { browser } from '$app/environment';
import { PUBLIC_BRIDGE_API_URL } from '$env/static/public';
import type { AccountInterface, TypedData } from 'starknet';

const REFERRAL_STORAGE_KEY = 'ponziland_pending_referral';

class ReferralStore {
  private _pendingCode = $state<string | null>(null);
  private _initialized = false;
  userCode = $state<string | null>(null);
  loading = $state(false);
  error = $state<string | null>(null);

  // Lazy load from localStorage (constructor runs during SSR when browser=false)
  get pendingCode(): string | null {
    if (!this._initialized && browser) {
      this._pendingCode = localStorage.getItem(REFERRAL_STORAGE_KEY);
      this._initialized = true;
      console.log(
        '[Referral] Loaded pending code from storage:',
        this._pendingCode,
      );
    }
    return this._pendingCode;
  }

  set pendingCode(value: string | null) {
    this._pendingCode = value;
    this._initialized = true;
  }

  setPendingReferral(code: string) {
    this.pendingCode = code.toUpperCase();
    if (browser) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, this.pendingCode);
    }
  }

  clearPendingReferral() {
    this.pendingCode = null;
    if (browser) {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
    }
  }

  async fetchUserCode(address: string): Promise<string | null> {
    this.loading = true;
    this.error = null;
    try {
      const res = await fetch(
        `${PUBLIC_BRIDGE_API_URL}/api/${address}/referral-code`,
      );
      const data = await res.json();
      if (data.success) {
        this.userCode = data.referralCode;
        return data.referralCode;
      } else {
        this.error = data.error || 'Failed to fetch referral code';
        return null;
      }
    } catch (e) {
      console.error('Error fetching referral code:', e);
      this.error = 'Failed to fetch referral code';
      return null;
    } finally {
      this.loading = false;
    }
  }

  async submitReferral(
    address: string,
    walletAccount: AccountInterface,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.pendingCode) {
      return { success: false, error: 'No pending referral code' };
    }

    this.loading = true;
    this.error = null;

    try {
      // 1. Get typed data from API
      const apiUrl = `${PUBLIC_BRIDGE_API_URL}/api/referral/${this.pendingCode}/typed-data`;
      console.log('[Referral] Fetching typed data from:', apiUrl);
      const tdRes = await fetch(apiUrl);
      const tdData = await tdRes.json();
      console.log('[Referral] Typed data response:', tdData);

      if (!tdData.success) {
        // Code not found or invalid - clear it
        this.clearPendingReferral();
        return {
          success: false,
          error: tdData.error || 'Invalid referral code',
        };
      }

      const typedData: TypedData = tdData.typedData;

      // 2. Sign with wallet
      console.log('[Referral] Requesting signature...');
      const signature = await walletAccount.signMessage(typedData);
      console.log('[Referral] Got signature:', signature);

      // 3. Submit to API
      const submitRes = await fetch(
        `${PUBLIC_BRIDGE_API_URL}/api/referral/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address,
            referral_code: this.pendingCode,
            signature,
            typed_data: typedData,
          }),
        },
      );

      const result = await submitRes.json();

      if (result.success) {
        this.clearPendingReferral();
        return { success: true };
      } else {
        // Clear pending referral on certain errors (already referred, has activity, etc.)
        const clearErrors = [
          'ALREADY_REFERRED',
          'HAS_ACTIVITY',
          'SELF_REFERRAL',
          'CIRCULAR_REFERRAL',
        ];
        if (clearErrors.includes(result.errorCode)) {
          this.clearPendingReferral();
        }
        return { success: false, error: result.error };
      }
    } catch (e) {
      console.error('Error submitting referral:', e);
      return { success: false, error: 'Failed to submit referral' };
    } finally {
      this.loading = false;
    }
  }
}

export const referralStore = new ReferralStore();
