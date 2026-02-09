import {
  type Message,
  type Conversation,
  sendMessage as apiSendMessage,
  getMessages as apiGetMessages,
  getConversations as apiGetConversations,
} from '$lib/api/messages';
import { padAddress } from '$lib/utils';

interface MessagesState {
  conversations: Conversation[];
  activeConversation: string | null; // Address of the active conversation partner
  messages: Map<string, Message[]>; // Messages by conversation partner address
  loading: boolean;
  error: string | null;
}

class MessagesStore {
  private _conversations = $state<Conversation[]>([]);
  private _activeConversation = $state<string | null>(null);
  private _messages = $state<Map<string, Message[]>>(new Map());
  private _loading = $state<boolean>(false);
  private _error = $state<string | null>(null);
  private _userAddress = $state<string | null>(null);

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  // Public reactive accessors
  public readonly conversations = $derived(this._conversations);
  public readonly activeConversation = $derived(this._activeConversation);
  public readonly loading = $derived(this._loading);
  public readonly error = $derived(this._error);
  public readonly userAddress = $derived(this._userAddress);

  // Get messages for the active conversation
  public readonly activeMessages = $derived.by(() => {
    if (!this._activeConversation) return [];
    return this._messages.get(this._activeConversation) || [];
  });

  /**
   * Set the current user's address
   */
  public setUserAddress(address: string | null): void {
    const normalized = address ? padAddress(address) : null;
    if (this._userAddress !== normalized) {
      this._userAddress = normalized ?? null;
      this._conversations = [];
      this._messages = new Map();
      this._activeConversation = null;

      if (normalized) {
        this.loadConversations();
        this.startPolling();
      } else {
        this.stopPolling();
      }
    }
  }

  /**
   * Load all conversations for the current user
   */
  public async loadConversations(): Promise<void> {
    if (!this._userAddress) return;

    this._loading = true;
    this._error = null;

    try {
      const conversations = await apiGetConversations(this._userAddress);
      this._conversations = conversations;
    } catch (err) {
      console.error('Failed to load conversations:', err);
      this._error =
        err instanceof Error ? err.message : 'Failed to load conversations';
    } finally {
      this._loading = false;
    }
  }

  /**
   * Set the active conversation and load its messages
   */
  public async setActiveConversation(
    partnerAddress: string | null,
  ): Promise<void> {
    const normalized = partnerAddress ? padAddress(partnerAddress) : null;
    this._activeConversation = normalized ?? null;

    if (normalized && this._userAddress) {
      await this.loadMessages(normalized);
    }
  }

  /**
   * Load messages for a specific conversation
   */
  public async loadMessages(
    partnerAddress: string,
    after?: string,
  ): Promise<void> {
    if (!this._userAddress) return;

    const normalized = padAddress(partnerAddress);
    if (!normalized) return;

    this._loading = true;
    this._error = null;

    try {
      const messages = await apiGetMessages(
        this._userAddress,
        normalized,
        after,
        50,
      );

      // Merge with existing messages
      const existing = this._messages.get(normalized) || [];
      const existingIds = new Set(existing.map((m) => m.id));
      const newMessages = messages.filter((m) => !existingIds.has(m.id));

      if (newMessages.length > 0) {
        const allMessages = [...existing, ...newMessages].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        this._messages = new Map(this._messages).set(normalized, allMessages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      this._error =
        err instanceof Error ? err.message : 'Failed to load messages';
    } finally {
      this._loading = false;
    }
  }

  /**
   * Send a message to a recipient
   */
  public async sendMessage(
    recipientAddress: string,
    content: string,
  ): Promise<boolean> {
    if (!this._userAddress) {
      this._error = 'Not connected';
      return false;
    }

    const normalized = padAddress(recipientAddress);
    if (!normalized) {
      this._error = 'Invalid recipient address';
      return false;
    }

    this._loading = true;
    this._error = null;

    try {
      const result = await apiSendMessage(
        this._userAddress,
        normalized,
        content,
      );

      // Add the sent message to local state immediately
      const newMessage: Message = {
        id: result.id,
        sender: this._userAddress,
        content,
        created_at: result.created_at,
      };

      const existing = this._messages.get(normalized) || [];
      this._messages = new Map(this._messages).set(normalized, [
        ...existing,
        newMessage,
      ]);

      // Refresh conversations to update last message
      await this.loadConversations();

      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      this._error =
        err instanceof Error ? err.message : 'Failed to send message';
      return false;
    } finally {
      this._loading = false;
    }
  }

  /**
   * Start a new conversation with an address
   */
  public startConversation(partnerAddress: string): void {
    const normalized = padAddress(partnerAddress);
    if (!normalized) return;

    // Initialize empty message array for new conversation
    if (!this._messages.has(normalized)) {
      this._messages = new Map(this._messages).set(normalized, []);
    }
    this._activeConversation = normalized;
  }

  /**
   * Poll for new messages and conversations
   */
  private startPolling(): void {
    this.stopPolling();

    // Poll every 15 seconds
    this.pollInterval = setInterval(async () => {
      if (this._userAddress) {
        await this.loadConversations();

        // If there's an active conversation, also poll for new messages
        if (this._activeConversation) {
          const existingMessages =
            this._messages.get(this._activeConversation) || [];
          const lastMessage = existingMessages[existingMessages.length - 1];
          await this.loadMessages(
            this._activeConversation,
            lastMessage?.created_at,
          );
        }
      }
    }, 15000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Get messages for a specific conversation partner
   */
  public getMessagesFor(partnerAddress: string): Message[] {
    return this._messages.get(partnerAddress) || [];
  }

  /**
   * Clear error state
   */
  public clearError(): void {
    this._error = null;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.stopPolling();
    this._conversations = [];
    this._messages = new Map();
    this._activeConversation = null;
    this._userAddress = null;
    this._error = null;
  }
}

// Singleton instance
export const messagesStore = new MessagesStore();
