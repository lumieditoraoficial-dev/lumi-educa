import { countWords } from "./textReview";

const DEFAULT_FONT_SIZE = 17;
const DEFAULT_WORDS_PER_PAGE = 330;

function readNumberAttribute(content: string, attribute: string) {
  const pattern = new RegExp(`${attribute}=["'](\\d+)["']`, "i");
  const match = content.match(pattern);
  const value = match ? Number(match[1]) : 0;
  return Number.isFinite(value) && value > 0 ? value : null;
}

function readFontSize(content: string) {
  const match = content.match(/font-size:\s*(\d+)px/i);
  const value = match ? Number(match[1]) : DEFAULT_FONT_SIZE;
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_FONT_SIZE;
}

function countMatches(content: string, pattern: RegExp) {
  return content.match(pattern)?.length ?? 0;
}

export function countVisualPagesInContent(content?: string | null) {
  const raw = content ?? "";
  const savedCount = readNumberAttribute(raw, "data-lumi-page-count");
  if (savedCount) return savedCount;

  const words = countWords(raw);
  const fontSize = readFontSize(raw);
  const imageCount = countMatches(raw, /<img\b/gi);
  const headingCount = countMatches(raw, /<h[1-3]\b/gi);
  const blockCount = countMatches(raw, /<(p|li|blockquote|h[1-3])\b/gi);
  const manualBreaks = countMatches(raw, /data-lumi-auto-page-break=["']true["']/gi);

  if (manualBreaks > 0) return manualBreaks + 1;
  if (words === 0 && imageCount === 0) return 1;

  const fontFactor = Math.max(0.62, Math.min(1.35, DEFAULT_FONT_SIZE / fontSize));
  const wordsPerPage = Math.max(170, Math.round(DEFAULT_WORDS_PER_PAGE * fontFactor));
  const textPages = words / wordsPerPage;
  const mediaPages = imageCount * 0.75 + headingCount * 0.08 + Math.max(0, blockCount - 8) * 0.015;

  return Math.max(1, Math.ceil(textPages + mediaPages));
}

export function buildBookMetricsFromPages<TPage extends { content?: string | null; wordCount?: number | null }>(
  pages: TPage[]
) {
  return {
    pageCount: pages.reduce((sum, page) => sum + countVisualPagesInContent(page.content), 0),
    wordCount: pages.reduce((sum, page) => sum + (page.wordCount ?? countWords(page.content)), 0),
  };
}

export function withBookMetrics<TBook extends { pageCount?: number | null; wordCount?: number | null }, TPage extends { content?: string | null; wordCount?: number | null }>(
  book: TBook,
  pages: TPage[]
) {
  const metrics = buildBookMetricsFromPages(pages);
  return {
    ...book,
    pageCount: metrics.pageCount,
    wordCount: metrics.wordCount,
  };
}
