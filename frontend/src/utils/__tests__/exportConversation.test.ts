import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportAsMarkdown, downloadMarkdown } from '../exportConversation';
import type { IChatItem } from '../../types/chat';

function makeMessage(overrides: Partial<IChatItem>): IChatItem {
  return {
    id: 'msg-1',
    role: 'user',
    content: 'Hello',
    more: { time: new Date().toISOString() },
    ...overrides,
  };
}

describe('exportAsMarkdown', () => {
  it('includes conversation header with agent name', () => {
    const result = exportAsMarkdown([], 'MyAgent');
    expect(result).toContain('# Conversation with MyAgent');
  });

  it('uses default agent name when not provided', () => {
    const result = exportAsMarkdown([]);
    expect(result).toContain('# Conversation with AI Agent');
  });

  it('includes export timestamp', () => {
    const result = exportAsMarkdown([]);
    expect(result).toContain('_Exported ');
  });

  it('formats user messages as blockquotes', () => {
    const messages = [makeMessage({ role: 'user', content: 'Hello world' })];
    const result = exportAsMarkdown(messages);
    expect(result).toContain('## You');
    expect(result).toContain('> Hello world');
  });

  it('wraps multi-line user content with blockquote continuation', () => {
    const messages = [makeMessage({ role: 'user', content: 'Line one\nLine two' })];
    const result = exportAsMarkdown(messages);
    expect(result).toContain('> Line one\n> Line two');
  });

  it('formats assistant messages with agent name heading', () => {
    const messages = [makeMessage({ role: 'assistant', content: 'I can help.' })];
    const result = exportAsMarkdown(messages, 'Copilot');
    expect(result).toContain('## Copilot');
    expect(result).toContain('I can help.');
  });

  it('uses "Assistant" heading when no agent name provided', () => {
    const messages = [makeMessage({ role: 'assistant', content: 'Sure.' })];
    const result = exportAsMarkdown(messages);
    expect(result).toContain('## Assistant');
  });

  it('formats approval messages as tool approval notes', () => {
    const messages = [
      makeMessage({
        role: 'approval',
        content: '',
        mcpApproval: {
          id: 'a1',
          toolName: 'read_file',
          serverLabel: 'FS',
          arguments: '{}',
          previousResponseId: null,
          status: 'pending',
        },
      }),
    ];
    const result = exportAsMarkdown(messages);
    expect(result).toContain('## Tool Approval');
    expect(result).toContain('read_file');
  });

  it('handles approval message without mcpApproval data', () => {
    const messages = [makeMessage({ role: 'approval', content: '' })];
    const result = exportAsMarkdown(messages);
    expect(result).toContain('unknown');
  });

  it('skips messages with unknown roles', () => {
    const messages = [makeMessage({ role: 'system' as IChatItem['role'], content: 'ignore me' })];
    const result = exportAsMarkdown(messages);
    expect(result).not.toContain('ignore me');
  });

  it('exports multiple messages in order', () => {
    const messages = [
      makeMessage({ id: '1', role: 'user', content: 'Question' }),
      makeMessage({ id: '2', role: 'assistant', content: 'Answer' }),
    ];
    const result = exportAsMarkdown(messages);
    const userIdx = result.indexOf('## You');
    const assistantIdx = result.indexOf('## Assistant');
    expect(userIdx).toBeLessThan(assistantIdx);
  });
});

describe('downloadMarkdown', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickMock: ReturnType<typeof vi.fn>;
  let createdElement: { href: string; download: string; click: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    createObjectURL = vi.fn().mockReturnValue('blob:test-url');
    revokeObjectURL = vi.fn();
    clickMock = vi.fn();

    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    createdElement = { href: '', download: '', click: clickMock };
    vi.spyOn(document, 'createElement').mockReturnValue(
      createdElement as unknown as HTMLAnchorElement,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a markdown blob and triggers download', () => {
    downloadMarkdown('# Hello');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickMock).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });

  it('uses provided filename', () => {
    downloadMarkdown('# Hello', 'my-export.md');
    expect(createdElement.download).toBe('my-export.md');
  });

  it('generates default filename when not provided', () => {
    downloadMarkdown('# Hello');
    expect(createdElement.download).toMatch(/^conversation-\d+\.md$/);
  });

  it('sets href to the object URL', () => {
    downloadMarkdown('# Hello');
    expect(createdElement.href).toBe('blob:test-url');
  });
});
