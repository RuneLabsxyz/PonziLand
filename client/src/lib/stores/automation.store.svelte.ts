/**
 * Automation Store
 * Manages saved automation rules for batch operations (auction buying, land sniping)
 * Persists to localStorage for reuse across sessions
 */

export interface AutomationRule {
  id: string;
  name: string;
  type: 'auction-buy' | 'land-snipe';
  enabled: boolean;
  createdAt: number;

  // Filters
  filters: {
    tokens: string[]; // Filter by token addresses (empty = all tokens)
    maxPriceUsd?: number; // Max price in USD equivalent
    maxPriceToken?: string; // Max price in specific token amount
  };

  // Settings for purchased lands
  settings: {
    sellPricePercent: number; // % offset from buy price (default 0)
    stakePercent: number; // % of sell price (default 200 = 2x)
    payWithToken?: string; // Token to pay with (undefined = auto-select best)
  };
}

function generateId(): string {
  return `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

class AutomationStore {
  private static STORAGE_KEY = 'ponziland-automations';

  private state = $state<{ rules: AutomationRule[] }>({
    rules: [],
  });

  constructor() {
    this.loadRules();
  }

  private loadRules() {
    try {
      const saved = localStorage.getItem(AutomationStore.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.rules)) {
          this.state.rules = parsed.rules;
        }
      }
    } catch (error) {
      console.error('Failed to load automation rules:', error);
    }
  }

  private saveRules() {
    try {
      localStorage.setItem(
        AutomationStore.STORAGE_KEY,
        JSON.stringify({ rules: this.state.rules }),
      );
    } catch (error) {
      console.error('Failed to save automation rules:', error);
    }
  }

  get rules(): AutomationRule[] {
    return this.state.rules;
  }

  getRuleById(id: string): AutomationRule | undefined {
    return this.state.rules.find((r) => r.id === id);
  }

  getRulesByType(type: AutomationRule['type']): AutomationRule[] {
    return this.state.rules.filter((r) => r.type === type);
  }

  addRule(rule: Omit<AutomationRule, 'id' | 'createdAt'>): AutomationRule {
    const newRule: AutomationRule = {
      ...rule,
      id: generateId(),
      createdAt: Date.now(),
    };
    this.state.rules = [...this.state.rules, newRule];
    this.saveRules();
    return newRule;
  }

  updateRule(
    id: string,
    updates: Partial<Omit<AutomationRule, 'id' | 'createdAt'>>,
  ) {
    const index = this.state.rules.findIndex((r) => r.id === id);
    if (index === -1) return;

    this.state.rules = [
      ...this.state.rules.slice(0, index),
      { ...this.state.rules[index], ...updates },
      ...this.state.rules.slice(index + 1),
    ];
    this.saveRules();
  }

  deleteRule(id: string) {
    this.state.rules = this.state.rules.filter((r) => r.id !== id);
    this.saveRules();
  }

  duplicateRule(id: string): AutomationRule | undefined {
    const original = this.getRuleById(id);
    if (!original) return undefined;

    return this.addRule({
      ...original,
      name: `${original.name} (copy)`,
      enabled: original.enabled,
    });
  }

  toggleEnabled(id: string) {
    const rule = this.getRuleById(id);
    if (rule) {
      this.updateRule(id, { enabled: !rule.enabled });
    }
  }

  // Create a default rule template
  createDefaultRule(
    type: AutomationRule['type'],
  ): Omit<AutomationRule, 'id' | 'createdAt'> {
    const baseName =
      type === 'auction-buy' ? 'New Auction Buy' : 'New Land Snipe';
    return {
      name: baseName,
      type,
      enabled: true,
      filters: {
        tokens: [], // All tokens
        maxPriceUsd: undefined,
        maxPriceToken: undefined,
      },
      settings: {
        sellPricePercent: 0, // Same as buy price
        stakePercent: 200, // 2x stake
        payWithToken: undefined, // Auto-select
      },
    };
  }
}

export const automationStore = new AutomationStore();
