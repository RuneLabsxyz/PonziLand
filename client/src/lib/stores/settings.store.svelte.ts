import { gameSounds } from '$lib/stores/sfx.svelte';

class SettingsStore {
  private static STORAGE_KEY = 'ponziland_settings';

  private settings = $state({
    noobMode: false,
    volume: 50,
    showRatesInBaseToken: true,
    walletDisplayMode: 'base' as 'base' | 'token', // 'base' shows base token value primarily, 'token' shows original token value
    selectedBaseTokenAddress: null as string | null, // null means use default from mainnet.json
    // Add more settings here as needed
  });

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const savedSettings = localStorage.getItem(SettingsStore.STORAGE_KEY);
      if (savedSettings) {
        this.settings = JSON.parse(savedSettings);
      }
      // Ensure volume is within bounds
      this.settings.volume = Math.max(0, Math.min(100, this.settings.volume));
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem(
        SettingsStore.STORAGE_KEY,
        JSON.stringify(this.settings),
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  get isNoobMode() {
    return this.settings.noobMode;
  }

  get volume() {
    return this.settings.volume;
  }

  get showRatesInBaseToken() {
    return this.settings.showRatesInBaseToken;
  }

  get walletDisplayMode() {
    return this.settings.walletDisplayMode;
  }

  get selectedBaseTokenAddress() {
    return this.settings.selectedBaseTokenAddress;
  }

  toggleNoobMode() {
    this.settings.noobMode = !this.settings.noobMode;
    this.saveSettings();
  }

  toggleRatesInBaseToken() {
    this.settings.showRatesInBaseToken = !this.settings.showRatesInBaseToken;
    this.saveSettings();
  }

  toggleWalletDisplayMode() {
    this.settings.walletDisplayMode =
      this.settings.walletDisplayMode === 'base' ? 'token' : 'base';
    this.saveSettings();
  }

  setVolume(volume: number) {
    // Clamp volume between 0 and 100
    this.settings.volume = Math.max(0, Math.min(100, volume));
    // Update game sounds volume
    const gameVolume = this.settings.volume / 100;
    gameSounds.setVolume(gameVolume);
    // Save the updated settings
    this.saveSettings();
    // Optionally, play a sound to indicate volume change
    console.log(`Volume set to ${gameVolume}`);
    gameSounds.play('click', { volume: gameVolume });
  }

  setSelectedBaseTokenAddress(address: string | null) {
    this.settings.selectedBaseTokenAddress = address;
    this.saveSettings();
  }
}

export const settingsStore = new SettingsStore();
