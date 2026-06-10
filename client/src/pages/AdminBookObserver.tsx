import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BookOpen, Download, ExternalLink, Eye, FileText, Search, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviado",
  under_review: "Em revisao",
  approved: "Aprovado",
  published: "Publicado",
  rejected: "Devolvido",
};

function extractPageHtml(content?: string | null) {
  const raw = content ?? "";
  const wrapperMatch = raw.match(/<div[^>]*data-lumi-page-content=["']true["'][^>]*>([\s\S]*)<\/div>\s*$/i);
  return wrapperMatch?.[1] ?? raw;
}

function plainText(content?: string | null) {
  return extractPageHtml(content).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function countWords(content?: string | null) {
  const text = plainText(content);
  return text ? text.split(/\s+/).length : 0;
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
}

export default function AdminBookObserver() {
  const [, navigate] = useLocation();
  const { data: users = [] } = trpc.users.listUsers.useQuery();
  const { data: books = [], isLoading } = trpc.books.listBooks.useQuery();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  const authorsById = useMemo(() => {
    const map = new Map<number, any>();
    users.forEach((user: any) => map.set(user.id, user));
    return map;
  }, [users]);

  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return books
      .filter((book: any) => (statusFilter === "all" ? true : book.status === statusFilter))
      .filter((book: any) => {
        const author = authorsById.get(book.authorId);
        const haystack = [book.title, book.subtitle, book.description, book.category, book.series, author?.name, author?.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return !query || haystack.includes(query);
      })
      .sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());
  }, [authorsById, books, search, statusFilter]);

  useEffect(() => {
    if (filteredBooks.length === 0) {
      setSelectedBookId(null);
      return;
    }

    if (!selectedBookId || !filteredBooks.some((book: any) => book.id === selectedBookId)) {
      setSelectedBookId(filteredBooks[0].id);
    }
  }, [filteredBooks, selectedBookId]);

  const selectedBook = selectedBookId ? books.find((book: any) => book.id === selectedBookId) : null;
  const selectedAuthor = selectedBook ? authorsById.get(selectedBook.authorId) : null;
  const { data: pages = [], isLoading: pagesLoading } = trpc.books.getPages.useQuery(
    { bookId: selectedBookId ?? 0 },
    { enabled: Boolean(selectedBookId) }
  );
  const { data: evaluations = [] } = trpc.evaluations.getBookEvaluationDetails.useQuery(
    { bookId: selectedBookId ?? 0 },
    { enabled: Boolean(selectedBookId) }
  );

  const sortedPages = useMemo(() => pages.slice().sort((a: any, b: any) => a.pageNumber - b.pageNumber), [pages]);
  const totalWords = sortedPages.reduce((total: number, page: any) => total + countWords(page.content), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-emerald-700" />
            <h2 className="text-3xl font-bold text-slate-950">Observacao dos livros</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Visao administrativa somente leitura. Aqui voce acompanha tudo que foi escrito, sem mudar status, notas,
            aprovacoes ou o fluxo de revisao.
          </p>
        </div>
        <Badge className="w-fit bg-emerald-100 px-3 py-1 text-emerald-800 hover:bg-emerald-100">
          <ShieldCheck className="mr-1 h-4 w-4" />
          Modo observador
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por livro, aluno, email, categoria..."
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">Todos os status</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-emerald-700" />
              Livros encontrados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-600">Carregando livros...</p>
            ) : filteredBooks.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-600">
                Nenhum livro encontrado com esse filtro.
              </p>
            ) : (
              filteredBooks.map((book: any) => {
                const author = authorsById.get(book.authorId);
                const isSelected = selectedBookId === book.id;
                return (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => setSelectedBookId(book.id)}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      isSelected ? "border-emerald-600 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white hover:border-emerald-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{book.title}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{author?.name ?? `Aluno #${book.authorId}`}</p>
                      </div>
                      <Badge variant="secondary">{statusLabels[book.status] ?? book.status}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                      <span>{book.pageCount ?? 0} pags.</span>
                      <span>{book.wordCount ?? 0} palavras</span>
                      <span>{formatDate(book.updatedAt)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {!selectedBook ? (
              <div className="rounded-lg border border-dashed p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3 font-medium text-slate-800">Selecione um livro para observar.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-bold text-slate-950">{selectedBook.title}</h3>
                      <Badge variant="outline">{statusLabels[selectedBook.status] ?? selectedBook.status}</Badge>
                    </div>
                    {selectedBook.subtitle ? <p className="mt-1 text-slate-600">{selectedBook.subtitle}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="h-4 w-4" />
                        {selectedAuthor?.name ?? `Aluno #${selectedBook.authorId}`}
                      </span>
                      <span>{sortedPages.length} paginas</span>
                      <span>{totalWords} palavras no documento</span>
                      <span>Atualizado em {formatDate(selectedBook.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate(`/books/${selectedBook.id}/pages`)}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir documento
                    </Button>
                    <Button
                      className="bg-emerald-700 hover:bg-emerald-800"
                      onClick={() => window.open(`/api/books/${selectedBook.id}/pdf`, "_blank")}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar PDF
                    </Button>
                  </div>
                </div>

                {selectedBook.description ? (
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Descricao</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{selectedBook.description}</p>
                  </div>
                ) : null}

                {evaluations.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {evaluations.map((evaluation: any) => (
                      <div key={evaluation.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-950">{evaluation.evaluatorName}</p>
                          <Badge variant="secondary">Nota {Number(evaluation.score ?? 0).toFixed(1)}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {evaluation.feedback || "Avaliacao registrada sem comentario escrito."}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-lg border bg-white px-5 py-6 md:px-8">
                  <div className="mb-6 text-center">
                    <p className="text-xs font-semibold uppercase text-emerald-700">Leitura administrativa</p>
                    <h4 className="mt-2 text-3xl font-bold text-slate-950">{selectedBook.title}</h4>
                    <p className="mt-2 text-sm text-slate-500">Nada nesta area altera o livro.</p>
                  </div>

                  {pagesLoading ? (
                    <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-600">Carregando paginas...</p>
                  ) : sortedPages.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-600">
                      Este livro ainda nao possui paginas.
                    </p>
                  ) : (
                    <div className="space-y-10">
                      {sortedPages.map((page: any) => (
                        <section key={page.id} className="break-words border-b pb-8 last:border-b-0 last:pb-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold uppercase text-emerald-700">Pagina {page.pageNumber}</p>
                            <Badge variant={page.status === "submitted" ? "default" : "outline"}>
                              {statusLabels[page.status] ?? page.status}
                            </Badge>
                            <span className="text-xs text-slate-500">{countWords(page.content)} palavras</span>
                          </div>
                          <h5 className="mt-2 text-xl font-semibold text-slate-950">{page.title || `Pagina ${page.pageNumber}`}</h5>
                          <article
                            className="prose prose-slate mt-4 max-w-none leading-8"
                            dangerouslySetInnerHTML={{ __html: extractPageHtml(page.content) || "<p>Pagina sem texto.</p>" }}
                          />

                          {(page.originalContent || page.aiCorrectedContent || page.aiCorrectionSummary) && (
                            <details className="mt-5 rounded-lg border bg-slate-50 p-4 text-sm text-slate-700">
                              <summary className="cursor-pointer font-semibold text-emerald-800">
                                Ver apoio interno da IA e versoes da pagina
                              </summary>
                              {page.aiCorrectionSummary ? <p className="mt-3 leading-6">{page.aiCorrectionSummary}</p> : null}
                              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                <div className="rounded border bg-white p-3">
                                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Original do aluno</p>
                                  <article
                                    className="prose prose-slate max-w-none text-sm"
                                    dangerouslySetInnerHTML={{
                                      __html: extractPageHtml(page.originalContent || page.content) || "<p>Sem texto.</p>",
                                    }}
                                  />
                                </div>
                                <div className="rounded border bg-white p-3">
                                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Revisado pela IA</p>
                                  <article
                                    className="prose prose-slate max-w-none text-sm"
                                    dangerouslySetInnerHTML={{
                                      __html: extractPageHtml(page.aiCorrectedContent || page.content) || "<p>Sem texto.</p>",
                                    }}
                                  />
                                </div>
                              </div>
                            </details>
                          )}
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
