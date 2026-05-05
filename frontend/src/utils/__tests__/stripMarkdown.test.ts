import { describe, it, expect } from 'vitest';
import { stripMarkdown } from '../stripMarkdown';

describe('stripMarkdown', () => {
  describe('code blocks', () => {
    it('removes fenced code blocks (leaving a blank line where the block was)', () => {
      const input = 'Before\n```\ncode here\n```\nAfter';
      // The regex removes the block content but the surrounding newlines collapse to \n\n
      expect(stripMarkdown(input)).toBe('Before\n\nAfter');
    });

    it('removes fenced code blocks with language specifier', () => {
      const input = 'Check:\n```typescript\nconst x = 1;\n```\nDone.';
      expect(stripMarkdown(input)).toBe('Check:\n\nDone.');
    });

    it('removes inline code', () => {
      expect(stripMarkdown('Use `npm install` to install.')).toBe('Use  to install.');
    });
  });

  describe('links and images', () => {
    it('removes images', () => {
      expect(stripMarkdown('See ![alt text](image.png) here.')).toBe('See  here.');
    });

    it('replaces links with link text', () => {
      expect(stripMarkdown('Visit [GitHub](https://github.com).')).toBe('Visit GitHub.');
    });

    it('does not replace links with empty text (regex requires at least one char)', () => {
      // The link regex uses [^\]]+ which requires ≥1 char; empty-text links are left as-is
      expect(stripMarkdown('[](https://example.com)')).toBe('[](https://example.com)');
    });
  });

  describe('headings', () => {
    it('removes h1 heading markers', () => {
      expect(stripMarkdown('# Title')).toBe('Title');
    });

    it('removes h2 heading markers', () => {
      expect(stripMarkdown('## Section')).toBe('Section');
    });

    it('removes h6 heading markers', () => {
      expect(stripMarkdown('###### Deep')).toBe('Deep');
    });

    it('removes heading markers only at line start', () => {
      // Inline # should not be removed
      const input = '# Header\nNot a # heading';
      const result = stripMarkdown(input);
      expect(result).toContain('Header');
      expect(result).toContain('Not a # heading');
    });
  });

  describe('emphasis', () => {
    it('removes bold with double asterisks', () => {
      expect(stripMarkdown('This is **bold** text.')).toBe('This is bold text.');
    });

    it('removes bold with double underscores', () => {
      expect(stripMarkdown('This is __bold__ text.')).toBe('This is bold text.');
    });

    it('removes italic with single asterisk', () => {
      expect(stripMarkdown('This is *italic* text.')).toBe('This is italic text.');
    });

    it('removes italic with single underscore', () => {
      expect(stripMarkdown('This is _italic_ text.')).toBe('This is italic text.');
    });
  });

  describe('blockquotes and lists', () => {
    it('removes blockquote markers', () => {
      expect(stripMarkdown('> Quoted text')).toBe('Quoted text');
    });

    it('removes unordered list markers (-)', () => {
      expect(stripMarkdown('- Item one')).toBe('Item one');
    });

    it('removes unordered list markers (*)', () => {
      expect(stripMarkdown('* Item one')).toBe('Item one');
    });

    it('removes ordered list markers', () => {
      expect(stripMarkdown('1. First item')).toBe('First item');
    });
  });

  describe('horizontal rules and tables', () => {
    it('removes horizontal rules', () => {
      const input = 'Before\n---\nAfter';
      const result = stripMarkdown(input);
      expect(result).not.toContain('---');
      expect(result).toContain('Before');
      expect(result).toContain('After');
    });

    it('removes table rows', () => {
      const input = '| Col1 | Col2 |\n| data | more |';
      const result = stripMarkdown(input);
      expect(result).not.toContain('|');
    });
  });

  describe('whitespace normalisation', () => {
    it('collapses excessive blank lines to double newline', () => {
      const input = 'A\n\n\n\nB';
      const result = stripMarkdown(input);
      expect(result).not.toMatch(/\n{3,}/);
    });

    it('trims leading and trailing whitespace', () => {
      expect(stripMarkdown('  hello  ')).toBe('hello');
    });
  });

  describe('plain text passthrough', () => {
    it('returns plain text unchanged', () => {
      const text = 'Hello, world! This has no markdown.';
      expect(stripMarkdown(text)).toBe(text);
    });

    it('returns empty string for empty input', () => {
      expect(stripMarkdown('')).toBe('');
    });
  });

  describe('complex document', () => {
    it('strips a realistic mixed markdown document', () => {
      const input = [
        '# Document Title',
        '',
        'This is **important** text with a [link](https://example.com).',
        '',
        '## Section',
        '',
        '- Item one',
        '- Item two',
        '',
        '```js',
        'console.log("code");',
        '```',
        '',
        '> A blockquote',
      ].join('\n');

      const result = stripMarkdown(input);

      expect(result).not.toContain('#');
      expect(result).not.toContain('**');
      expect(result).not.toContain('console.log');
      expect(result).toContain('Document Title');
      expect(result).toContain('important');
      expect(result).toContain('link');
      expect(result).toContain('Item one');
      expect(result).toContain('A blockquote');
    });
  });
});
