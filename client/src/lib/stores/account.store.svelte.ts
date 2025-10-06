import { padAddress } from '$lib/utils';

class UsernamesStore {
  private usernames: Record<string, string | undefined> = {};

  getUsernames(): Record<string, string | undefined> {
    return this.usernames;
  }

  getAddresses(): Array<{ address: string }> {
    return Object.keys(this.usernames).map((address) => ({
      address,
    }));
  }

  addAddresses(addresses: Array<{ address: string }>): void {
    addresses.forEach((addr) => {
      const paddedAddr = padAddress(addr.address);
      if (paddedAddr) {
        this.usernames[paddedAddr] = undefined;
      }
    });
  }

  updateUsernames(newUsernames: Record<string, string>): void {
    console.log('Updating usernames:', newUsernames);
    this.usernames = { ...this.usernames, ...newUsernames };
  }

  setUsername(address: string, username: string): void {
    const paddedAddr = padAddress(address);
    if (paddedAddr && paddedAddr in this.usernames) {
      this.usernames[paddedAddr] = username;
    } else {
      console.warn(
        `Address ${paddedAddr || address} not found in usernames store.`,
      );
    }
  }

  getUsername(address: string): string | undefined {
    const paddedAddr = padAddress(address);
    return paddedAddr ? this.usernames[paddedAddr] : undefined;
  }
}

export const usernamesStore = new UsernamesStore();
