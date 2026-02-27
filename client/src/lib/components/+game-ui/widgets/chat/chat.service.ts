import { PUBLIC_PONZI_API_URL } from '$env/static/public';

const CHAT_BASE_URL = `${PUBLIC_PONZI_API_URL}/chat`;

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_address: string;
  content: string;
  created_at: string;
}

export interface DmChannel {
  channel_id: string;
  peer_address: string;
  created_at: string;
}

export interface ChatError {
  error: string;
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Chat request failed with status ${response.status}`;

    try {
      const data = (await response.json()) as ChatError;
      if (data?.error) {
        message = data.error;
      }
    } catch {}

    throw new Error(message);
  }

  return (await response.json()) as T;
}

function buildUrl(path: string, params?: URLSearchParams): string {
  if (!params) {
    return `${CHAT_BASE_URL}${path}`;
  }

  const search = params.toString();
  return search
    ? `${CHAT_BASE_URL}${path}?${search}`
    : `${CHAT_BASE_URL}${path}`;
}

export async function getGlobalMessages(
  limit?: number,
  before?: string,
): Promise<ChatMessage[]> {
  const params = new URLSearchParams();
  params.set('limit', String(limit ?? 50));
  if (before) {
    params.set('before', before);
  }

  const response = await fetch(buildUrl('/global/messages', params));
  return readResponse<ChatMessage[]>(response);
}

export async function sendGlobalMessage(
  senderAddress: string,
  content: string,
): Promise<ChatMessage> {
  const response = await fetch(buildUrl('/global/send'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender_address: senderAddress,
      content,
    }),
  });

  return readResponse<ChatMessage>(response);
}

export async function sendDm(
  senderAddress: string,
  recipientAddress: string,
  content: string,
): Promise<ChatMessage> {
  const response = await fetch(buildUrl('/dm/send'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender_address: senderAddress,
      recipient_address: recipientAddress,
      content,
    }),
  });

  return readResponse<ChatMessage>(response);
}

export async function listDmChannels(
  userAddress: string,
): Promise<DmChannel[]> {
  const params = new URLSearchParams({
    user_address: userAddress,
  });

  const response = await fetch(buildUrl('/dm/channels', params));
  return readResponse<DmChannel[]>(response);
}

export async function getDmMessages(
  userAddress: string,
  peerAddress: string,
  limit?: number,
  before?: string,
): Promise<ChatMessage[]> {
  const params = new URLSearchParams({
    user_address: userAddress,
    peer_address: peerAddress,
    limit: String(limit ?? 50),
  });

  if (before) {
    params.set('before', before);
  }

  const response = await fetch(buildUrl('/dm/messages', params));
  return readResponse<ChatMessage[]>(response);
}
