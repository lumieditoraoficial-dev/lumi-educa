import { describe, expect, it } from "vitest";
import { buildBookMetricsFromPages, countVisualPagesInContent } from "./_core/pageMetrics";

describe("metricas visuais do livro", () => {
  it("usa a quantidade de paginas salva pelo editor", () => {
    const content = '<div data-lumi-page-content="true" data-lumi-page-count="35"><p>Texto</p></div>';
    expect(countVisualPagesInContent(content)).toBe(35);
  });

  it("soma as paginas visuais de todas as partes do livro", () => {
    const metrics = buildBookMetricsFromPages([
      { content: '<div data-lumi-page-count="10"><p>Primeira parte</p></div>', wordCount: 2 },
      { content: '<div data-lumi-page-count="4"><p>Segunda parte</p></div>', wordCount: 2 },
    ]);

    expect(metrics.pageCount).toBe(14);
    expect(metrics.wordCount).toBe(4);
  });
});
