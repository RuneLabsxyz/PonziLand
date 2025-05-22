class SettingsStore {
  private static STORAGE_KEY = 'ponziland_settings';

  private settings = $state({
    noobMode: false,
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

  toggleNoobMode() {
    this.settings.noobMode = !this.settings.noobMode;
    this.saveSettings();
  }
}

export const settingsStore = new SettingsStore();
