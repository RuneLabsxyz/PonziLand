class Usernames {
  public usernamesStore: Record<string, string> = {};

  getUsernames() {
    return this.usernamesStore;
  }

  updateUsernames(newUsernames: Record<string, string>): void {
    this.usernamesStore = { ...this.usernamesStore, ...newUsernames };
  }
}

export const usernamesStore = new Usernames();
