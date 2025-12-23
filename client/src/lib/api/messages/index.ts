import { PUBLIC_PONZI_API_URL } from '$env/static/public';

export interface Message {
  id: string;
  sender: string;
  content: string;
  created_at: string;
}

export interface Conversation {
  with_address: string;
  last_message: string;
  last_message_at: string;
}

export interface SendMessageRequest {
  sender: string;
  recipient: string;
  content: string;
}

export interface SendMessageResponse {
  id: string;
  created_at: string;
}

export interface GetMessagesResponse {
  messages: Message[];
}

export interface GetConversationsResponse {
  conversations: Conversation[];
}

export const GLOBAL_CHAT_ADDRESS = 'global';

export interface ErrorResponse {
  error: string;
}

const BASE_URL = `${PUBLIC_PONZI_API_URL}/messages`;

/**
 * Send a message to another wallet address
 */
export async function sendMessage(
  sender: string,
  recipient: string,
  content: string,
): Promise<SendMessageResponse> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender,
      recipient,
      content,
    } satisfies SendMessageRequest),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ErrorResponse;
    throw new Error(
      errorData.error || `Failed to send message: ${response.status}`,
    );
  }

  return response.json();
}

/**
 * Get messages with a specific address
 */
export async function getMessages(
  address: string,
  withAddress: string,
  after?: string,
  limit?: number,
): Promise<Message[]> {
  const params = new URLSearchParams({
    address,
    with: withAddress,
  });

  if (after) {
    params.set('after', after);
  }

  if (limit) {
    params.set('limit', limit.toString());
  }

  const response = await fetch(`${BASE_URL}?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ErrorResponse;
    throw new Error(
      errorData.error || `Failed to get messages: ${response.status}`,
    );
  }

  const data = (await response.json()) as GetMessagesResponse;
  return data.messages;
}

/**
 * Get all conversations for an address
 */
export async function getConversations(
  address: string,
): Promise<Conversation[]> {
  const params = new URLSearchParams({ address });

  const response = await fetch(`${BASE_URL}/conversations?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ErrorResponse;
    throw new Error(
      errorData.error || `Failed to get conversations: ${response.status}`,
    );
  }

  const data = (await response.json()) as GetConversationsResponse;
  return data.conversations;
}

/**
 * Get global chat messages
 */
export async function getGlobalMessages(
  after?: string,
  limit?: number,
): Promise<Message[]> {
  const params = new URLSearchParams();

  if (after) {
    params.set('after', after);
  }

  if (limit) {
    params.set('limit', limit.toString());
  }

  const url = params.toString()
    ? `${BASE_URL}/global?${params}`
    : `${BASE_URL}/global`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ErrorResponse;
    throw new Error(
      errorData.error || `Failed to get global messages: ${response.status}`,
    );
  }

  const data = (await response.json()) as GetMessagesResponse;
  return data.messages;
}
