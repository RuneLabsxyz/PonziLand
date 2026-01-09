import { browser } from '$app/environment';
import { PUBLIC_BRIDGE_API_URL } from '$env/static/public';
import { REFERRAL_COOKIE_NAME } from '$lib/const';

interface ReferralStats {
  pendingCount: number;
  completedCount: number;
  totalCount: number;
}

function getCookie(name: string): string | null {
  if (!browser) return null;
  const escaped = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  if (!browser) return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

class ReferralStore {
  private _pendingCode = $state<string | null>(null);
  private _initialized = false;
  userCode = $state<string | null>(null);
  referralStats = $state<ReferralStats | null>(null);
  loading = $state(false);
  error = $state<string | null>(null);

  get pendingCode(): string | null {
    if (!this._initialized && browser) {
      this._pendingCode = getCookie(REFERRAL_COOKIE_NAME);
      this._initialized = true;
      if (this._pendingCode) {
        console.log(
          '[Referral] Loaded pending code from cookie:',
          this._pendingCode,
        );
      }
    }
    return this._pendingCode;
  }

  set pendingCode(value: string | null) {
    this._pendingCode = value;
    this._initialized = true;
  }

  clearPendingReferral() {
    this.pendingCode = null;
    deleteCookie(REFERRAL_COOKIE_NAME);
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

  async fetchReferralStats(address: string): Promise<ReferralStats | null> {
    try {
      const res = await fetch(
        `${PUBLIC_BRIDGE_API_URL}/api/${address}/referral-stats`,
      );
      const data = await res.json();
      if (data.success) {
        this.referralStats = {
          pendingCount: data.pendingCount,
          completedCount: data.completedCount,
          totalCount: data.totalCount,
        };
        return this.referralStats;
      } else {
        console.error('Failed to fetch referral stats:', data.error);
        return null;
      }
    } catch (e) {
      console.error('Error fetching referral stats:', e);
      return null;
    }
  }

  async submitReferral(
    address: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.pendingCode) {
      return { success: false, error: 'No pending referral code' };
    }

    this.loading = true;
    this.error = null;

    try {
      // Submit referral code (no signature required)
      console.log('[Referral] Submitting referral code:', this.pendingCode);
      const submitRes = await fetch(
        `${PUBLIC_BRIDGE_API_URL}/api/referral/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address,
            referral_code: this.pendingCode,
          }),
        },
      );

      const result = await submitRes.json();

      if (result.success) {
        this.clearPendingReferral();
        return { success: true };
      } else {
        // Clear pending referral on certain errors (already referred, etc.)
        const clearErrors = [
          'ALREADY_REFERRED',
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
