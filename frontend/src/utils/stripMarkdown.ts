/**
 * Strips Markdown syntax from a string so it can be spoken by SpeechSynthesis
 * without reading out raw markup tokens.
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')          // fenced code blocks
    .replace(/`[^`\n]+`/g, '')               // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '')         // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → link text
    .replace(/^#{1,6}\s+/gm, '')             // headings
    .replace(/(\*\*|__)(.+?)\1/gs, '$2')     // bold
    .replace(/(\*|_)(.+?)\1/gs, '$2')        // italic
    .replace(/^>+\s*/gm, '')                 // blockquotes
    .replace(/^[-*+]\s+/gm, '')              // unordered list markers
    .replace(/^\d+\.\s+/gm, '')              // ordered list markers
    .replace(/^-{3,}$/gm, '')                // horizontal rules
    .replace(/\|[^\n]*\|/g, '')              // table rows
    .replace(/\n{3,}/g, '\n\n')             // collapse excess blank lines
    .trim();
}
