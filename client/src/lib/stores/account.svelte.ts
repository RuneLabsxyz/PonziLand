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
    addresses.forEach((address) => {
      this.usernames[address.address] = undefined;
    });
  }

  updateUsernames(newUsernames: Record<string, string>): void {
    this.usernames = { ...this.usernames, ...newUsernames };
  }

  setUsername(address: string, username: string): void {
    if (address in this.usernames) {
      this.usernames[address] = username;
    } else {
      console.warn(`Address ${address} not found in usernames store.`);
    }
  }
}

export const usernamesStore = new UsernamesStore();
