import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from '../chatService';
import type { AppAction } from '../../types/appState';
import type { Dispatch } from 'react';

// Mock the auth module
vi.mock('../../config/authConfig', () => ({
  msalConfig: { auth: { clientId: 'test', authority: 'https://login.microsoftonline.com/test' } },
  loginRequest: { scopes: ['api://test/Chat.ReadWrite'] },
  tokenRequest: { scopes: ['api://test/Chat.ReadWrite'], forceRefresh: false },
}));

describe('ChatService', () => {
  let chatService: ChatService;
  let mockDispatch: Dispatch<AppAction>;
  let mockGetAccessToken: () => Promise<string | null>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockDispatch = vi.fn() as Dispatch<AppAction>;
    mockGetAccessToken = vi.fn().mockResolvedValue('test-token');
    chatService = new ChatService('/api', mockGetAccessToken, mockDispatch);
  });

  describe('listConversations', () => {
    it('calls fetch with default limit of 20', async () => {
      const mockResponse = { conversations: [], hasMore: false };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', fetchMock);

      await chatService.listConversations();

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/conversations?limit=20',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('calls fetch with custom limit', async () => {
      const mockResponse = { conversations: [], hasMore: false };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      vi.stubGlobal('fetch', fetchMock);

      await chatService.listConversations(50);

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/conversations?limit=50',
        expect.anything(),
      );
    });

    it('parses conversations and hasMore from response', async () => {
      const mockResponse = {
        conversations: [
          { id: 'c1', title: 'Conv 1', createdAt: 1 },
          { id: 'c2', title: 'Conv 2', createdAt: 2 },
        ],
        hasMore: true,
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }));

      const result = await chatService.listConversations();

      expect(result.conversations).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    it('throws on non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }));

      await expect(chatService.listConversations()).rejects.toThrow();
    });
  });

  describe('deleteConversation', () => {
    it('calls DELETE to the correct URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      await chatService.deleteConversation('conv-123');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/conversations/conv-123',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('throws on non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }));

      await expect(chatService.deleteConversation('conv-123')).rejects.toThrow();
    });
  });

  describe('getConversationMessages', () => {
    it('calls GET to the correct URL', async () => {
      const mockMessages = [{ role: 'user', content: 'Hello' }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMessages),
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await chatService.getConversationMessages('conv-123');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/conversations/conv-123/messages',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
      expect(result).toEqual(mockMessages);
    });

    it('throws on non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }));

      await expect(chatService.getConversationMessages('conv-123')).rejects.toThrow();
    });
  });

  describe('listConversations (agentId)', () => {
    it('includes agentId in query params when currentAgentId is set', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ conversations: [], hasMore: false }),
      });
      vi.stubGlobal('fetch', fetchMock);
      chatService.currentAgentId = 'agent-xyz';

      await chatService.listConversations(10);

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toMatch(/agentId=agent-xyz/);
      expect(calledUrl).toMatch(/limit=10/);
    });
  });

  describe('clearChat', () => {
    it('dispatches CHAT_CLEAR', () => {
      chatService.clearChat();
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'CHAT_CLEAR' });
    });
  });

  describe('clearError', () => {
    it('dispatches CHAT_CLEAR_ERROR', () => {
      chatService.clearError();
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'CHAT_CLEAR_ERROR' });
    });
  });

  describe('cancelStream', () => {
    it('does nothing when there is no active stream', () => {
      chatService.cancelStream();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('getUploadedFilesInfo', () => {
    it('GETs /files/uploaded and returns count and totalBytes', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 2, totalBytes: 4096 }),
      }));

      const result = await chatService.getUploadedFilesInfo();

      expect(result).toEqual({ count: 2, totalBytes: 4096 });
      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toBe('/api/files/uploaded');
    });

    it('throws on non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
      await expect(chatService.getUploadedFilesInfo()).rejects.toThrow();
    });
  });

  describe('cleanupUploadedFiles', () => {
    it('POSTs to /files/cleanup and returns deletion stats', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ deleted: 5, failed: 0 }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await chatService.cleanupUploadedFiles();

      expect(result).toEqual({ deleted: 5, failed: 0 });
      expect(fetchMock.mock.calls[0][0]).toBe('/api/files/cleanup');
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    });

    it('throws on non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
      await expect(chatService.cleanupUploadedFiles()).rejects.toThrow();
    });
  });

  describe('downloadFile', () => {
    it('fetches file, triggers anchor download with correct name, then revokes URL', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['data'])),
      }));
      const fakeObjectUrl = 'blob:http://localhost/fake-123';
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(fakeObjectUrl);
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const clickSpy = vi.fn();
      const anchor = { href: '', download: '', click: clickSpy };
      vi.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLAnchorElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
      vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

      vi.useFakeTimers();
      await chatService.downloadFile('file-id', 'report.pdf');
      vi.runAllTimers();
      vi.useRealTimers();

      expect(anchor.href).toBe(fakeObjectUrl);
      expect(anchor.download).toBe('report.pdf');
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeSpy).toHaveBeenCalledWith(fakeObjectUrl);
    });

    it('uses fileId as download name when fileName is omitted', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      }));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const anchor = { href: '', download: '', click: vi.fn() };
      vi.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLAnchorElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
      vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

      vi.useFakeTimers();
      await chatService.downloadFile('raw-file-id');
      vi.runAllTimers();
      vi.useRealTimers();

      expect(anchor.download).toBe('raw-file-id');
    });

    it('appends containerId to URL when provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      });
      vi.stubGlobal('fetch', fetchMock);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const anchor = { href: '', download: '', click: vi.fn() };
      vi.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLAnchorElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
      vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

      vi.useFakeTimers();
      await chatService.downloadFile('file-id', 'out.pdf', 'container-abc');
      vi.runAllTimers();
      vi.useRealTimers();

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('containerId=container-abc');
    });

    it('throws when response is not ok', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
      await expect(chatService.downloadFile('file-id')).rejects.toThrow('File download failed');
    });
  });

  describe('sendMessage', () => {
    it('dispatches CHAT_ERROR and throws when auth token is null', async () => {
      const noTokenService = new ChatService('/api', vi.fn().mockResolvedValue(null), mockDispatch);

      await expect(noTokenService.sendMessage('hello', null)).rejects.toThrow();

      const dispatchCalls = (mockDispatch as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(dispatchCalls.some((c) => c.type === 'CHAT_ERROR')).toBe(true);
    });

    it('dispatches full message lifecycle for a successful SSE stream', async () => {
      const sseLines = [
        'data: {"type":"conversationId","conversationId":"new-conv"}',
        'data: {"type":"chunk","content":"Hi there"}',
        'data: {"type":"usage","promptTokens":5,"completionTokens":3,"totalTokens":8,"duration":50}',
        'data: {"type":"done"}',
      ].join('\n') + '\n';

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseLines));
          controller.close();
        },
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream }));

      await chatService.sendMessage('Hello', null);

      const types = (mockDispatch as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].type);
      expect(types).toContain('CHAT_SEND_MESSAGE');
      expect(types).toContain('CHAT_ADD_ASSISTANT_MESSAGE');
      expect(types).toContain('CHAT_START_STREAM');
      expect(types).toContain('CHAT_STREAM_CHUNK');
      expect(types).toContain('CHAT_STREAM_COMPLETE');
    });

    it('dispatches CHAT_RECOVER_MESSAGE after all retries fail', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
      vi.useFakeTimers();

      const sendPromise = chatService.sendMessage('Hello', 'conv-1');
      // Advance timers for each retry's exponential backoff delay
      await vi.runAllTimersAsync();
      await sendPromise;
      vi.useRealTimers();

      const types = (mockDispatch as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].type);
      expect(types).toContain('CHAT_RECOVER_MESSAGE');
    });
  });
});
