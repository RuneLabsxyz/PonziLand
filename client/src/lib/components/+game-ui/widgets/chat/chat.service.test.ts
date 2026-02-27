import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock the $env/static/public module
vi.mock('$env/static/public', () => ({
  PUBLIC_PONZI_API_URL: 'http://localhost:3000',
}));

import {
  getGlobalMessages,
  sendGlobalMessage,
  sendDm,
  listDmChannels,
  getDmMessages,
  type ChatMessage,
  type DmChannel,
} from './chat.service';

const BASE = 'http://localhost:3000/chat';

// Helper to create a mock Response
function mockResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('chat.service', () => {
  const fetchSpy =
    vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── getGlobalMessages ──────────────────────────────────────

  describe('getGlobalMessages', () => {
    it('sends correct GET with default limit', async () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          channel_id: 'global',
          sender_address: '0xabc',
          content: 'hello',
          created_at: '2025-01-01T00:00:00',
        },
      ];
      fetchSpy.mockResolvedValueOnce(mockResponse(messages));

      const result = await getGlobalMessages();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain(`${BASE}/global/messages`);
      expect(url).toContain('limit=50');
      expect(result).toEqual(messages);
    });

    it('passes custom limit and before', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse([]));

      await getGlobalMessages(20, '2025-01-01T00:00:00Z');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('limit=20');
      expect(url).toContain('before=2025-01-01T00%3A00%3A00Z');
    });

    it('throws on error response with message', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ error: 'Rate limit exceeded' }, 429),
      );

      await expect(getGlobalMessages()).rejects.toThrow('Rate limit exceeded');
    });

    it('throws generic message on non-JSON error', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response('Internal Server Error', { status: 500 }),
      );

      await expect(getGlobalMessages()).rejects.toThrow(
        'Chat request failed with status 500',
      );
    });
  });

  // ── sendGlobalMessage ──────────────────────────────────────

  describe('sendGlobalMessage', () => {
    it('sends correct POST with JSON body', async () => {
      const sent: ChatMessage = {
        id: '2',
        channel_id: 'global',
        sender_address: '0xabc',
        content: 'gm',
        created_at: '2025-01-01T00:00:01',
      };
      fetchSpy.mockResolvedValueOnce(mockResponse(sent));

      const result = await sendGlobalMessage('0xabc', 'gm');

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe(`${BASE}/global/send`);
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual({
        sender_address: '0xabc',
        content: 'gm',
      });
      expect(result).toEqual(sent);
    });

    it('throws on prohibited content', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ error: 'Message contains prohibited content' }, 400),
      );

      await expect(sendGlobalMessage('0xabc', 'bad word')).rejects.toThrow(
        'Message contains prohibited content',
      );
    });

    it('throws on ban', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ error: 'You are banned from chat' }, 403),
      );

      await expect(sendGlobalMessage('0xbanned', 'hi')).rejects.toThrow(
        'You are banned from chat',
      );
    });
  });

  // ── sendDm ─────────────────────────────────────────────────

  describe('sendDm', () => {
    it('sends correct POST with sender, recipient, content', async () => {
      const sent: ChatMessage = {
        id: '3',
        channel_id: 'dm-123',
        sender_address: '0xabc',
        content: 'hey',
        created_at: '2025-01-01T00:00:02',
      };
      fetchSpy.mockResolvedValueOnce(mockResponse(sent));

      const result = await sendDm('0xabc', '0xdef', 'hey');

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe(`${BASE}/dm/send`);
      expect(JSON.parse(init?.body as string)).toEqual({
        sender_address: '0xabc',
        recipient_address: '0xdef',
        content: 'hey',
      });
      expect(result).toEqual(sent);
    });

    it('throws on self-DM', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ error: 'Cannot send DM to yourself' }, 400),
      );

      await expect(sendDm('0xabc', '0xabc', 'hi')).rejects.toThrow(
        'Cannot send DM to yourself',
      );
    });
  });

  // ── listDmChannels ─────────────────────────────────────────

  describe('listDmChannels', () => {
    it('sends correct GET with user_address', async () => {
      const channels: DmChannel[] = [
        {
          channel_id: 'dm-1',
          peer_address: '0xdef',
          created_at: '2025-01-01T00:00:00',
        },
      ];
      fetchSpy.mockResolvedValueOnce(mockResponse(channels));

      const result = await listDmChannels('0xabc');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('user_address=0xabc');
      expect(result).toEqual(channels);
    });
  });

  // ── getDmMessages ──────────────────────────────────────────

  describe('getDmMessages', () => {
    it('sends correct GET with user, peer, default limit', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse([]));

      await getDmMessages('0xabc', '0xdef');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain(`${BASE}/dm/messages`);
      expect(url).toContain('user_address=0xabc');
      expect(url).toContain('peer_address=0xdef');
      expect(url).toContain('limit=50');
    });

    it('passes custom limit and before', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse([]));

      await getDmMessages('0xabc', '0xdef', 10, '2025-02-01T00:00:00Z');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('limit=10');
      expect(url).toContain('before=');
    });
  });
});
