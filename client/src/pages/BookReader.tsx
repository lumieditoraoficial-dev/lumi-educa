import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePageSeo } from "@/lib/seo";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

function plainText(html?: string | null) {
  return (html ?? "").replace(/<[^>]*>/g, " ").trim();
}

function extractPageHtml(content?: string | null) {
  const raw = content ?? "";
  const wrapperMatch = raw.match(/<div[^>]*data-lumi-page-content=["']true["'][^>]*>([\s\S]*)<\/div>\s*$/i);
  return wrapperMatch?.[1] ?? raw;
}

export default function BookReader({ bookId }: { bookId: number }) {
  const [, navigate] = useLocation();
  const [pageIndex, setPageIndex] = useState(0);
  const { data, isLoading } = trpc.library.getPublishedBook.useQuery({ bookId });
  usePageSeo({
    title: data?.book.title ? `${data.book.title} | Biblioteca Lumi Educa` : "Livro publicado | Lumi Educa",
    description: data?.book.description || "Livro estudantil publicado na Biblioteca Digital Lumi Educa.",
    canonicalPath: `/library/book/${bookId}`,
  });

  const pages = data?.pages ?? [];
  const currentPage = pages[pageIndex];
  const totalPages = Math.max(data?.book.pageCount ?? 0, pages.length ? pages.length : 0);
  const totalWords = useMemo(
    () => pages.reduce((total, page) => total + plainText(page.content).split(/\s+/).filter(Boolean).length, 0),
    [pages]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <Card className="p-8 text-center">
          <BookOpen className="mx-auto mb-4 h-10 w-10 text-stone-400" />
          <p className="font-medium text-stone-800">Livro não encontrado.</p>
          <Button className="mt-4" onClick={() => navigate("/library")}>
            Voltar para biblioteca
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/library")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-stone-950">{data.book.title}</h1>
              <p className="text-sm text-stone-600">
                {totalPages} paginas • {totalWords} palavras
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-600">
            {pages.length > 1 ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>
                <span>
                  Parte {pages.length ? pageIndex + 1 : 0} de {pages.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageIndex >= pages.length - 1}
                  onClick={() => setPageIndex((value) => Math.min(pages.length - 1, value + 1))}
                >
                  Proxima
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            ) : (
              <span>Documento completo • {totalPages} paginas</span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="mx-auto max-w-[780px] rounded-sm border bg-white px-8 py-10 shadow-sm md:px-16 md:py-14">
          {pages.length === 0 ? (
            <p className="text-center text-stone-600">Este livro ainda não possui páginas publicadas.</p>
          ) : (
            <>
              <div className="mb-8 border-b pb-4">
                <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                  Documento do livro
                </p>
                <h2 className="mt-2 text-3xl font-bold text-stone-950">{currentPage?.title || data.book.title}</h2>
              </div>
              <article
                className="prose prose-stone max-w-none text-lg leading-9"
                dangerouslySetInnerHTML={{ __html: extractPageHtml(currentPage?.content) || "<p>Pagina sem texto.</p>" }}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
}
