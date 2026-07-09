import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BookOpen, CheckCircle2, FileText, Loader2, MessageSquareText, Send, Sparkles, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviado",
  under_review: "Em revisão",
  approved: "Corrigida",
  published: "Publicado",
  rejected: "Rejeitado",
};

function extractPageHtml(content?: string | null) {
  const raw = content ?? "";
  const wrapperMatch = raw.match(/<div[^>]*data-lumi-page-content=["']true["'][^>]*>([\s\S]*)<\/div>\s*$/i);
  return wrapperMatch?.[1] ?? raw;
}

function countWords(content?: string | null) {
  return extractPageHtml(content).replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

function formatScore(score: unknown) {
  const value = Number(score ?? 0);
  return Number.isFinite(value) ? value.toFixed(1) : "-";
}

export default function BookPages({ bookId }: { bookId: number }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: book, isLoading: bookLoading } = trpc.books.getBook.useQuery({ bookId });
  const { data: pages = [], isLoading: pagesLoading } = trpc.books.getPages.useQuery({ bookId });
  const { data: evaluations = [] } = trpc.evaluations.getBookEvaluationDetails.useQuery(
    { bookId },
    { enabled: Boolean(bookId && user) }
  );

  const sortedPages = useMemo(() => pages.slice().sort((a, b) => a.pageNumber - b.pageNumber), [pages]);
  const nextPageNumber = useMemo(
    () => (sortedPages.length ? Math.max(...sortedPages.map((page) => page.pageNumber)) + 1 : 1),
    [sortedPages]
  );

  const createPageMutation = trpc.books.createPage.useMutation({
    onSuccess: async (page: any) => {
      toast.success("Editor pronto. Pode continuar escrevendo.");
      await utils.books.getPages.invalidate({ bookId });
      if (page?.id) {
        navigate(`/page-editor?bookId=${bookId}&pageId=${page.id}`);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePageMutation = trpc.books.deletePage.useMutation({
    onSuccess: async () => {
      toast.success("Parte removida.");
      await utils.books.getPages.invalidate({ bookId });
      await utils.books.getBook.invalidate({ bookId });
    },
    onError: (error) => toast.error(error.message),
  });

  const submitMutation = trpc.publications.submitForReview.useMutation({
    onSuccess: async () => {
      toast.success("Partes novas enviadas para revisão.");
      await utils.books.getBook.invalidate({ bookId });
      await utils.books.getPages.invalidate({ bookId });
      await utils.books.myBooks.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (bookLoading || pagesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="p-8 text-center">
          <p className="font-medium text-slate-800">Livro não encontrado.</p>
          <Button className="mt-4" onClick={() => navigate("/dashboard/student")}>
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  const dashboardByRole: Record<string, string> = {
    student: "/dashboard/student",
    educator: "/dashboard/educator",
    coordinator: "/dashboard/coordinator",
    editor: "/dashboard/editor",
    admin: "/dashboard/admin",
  };
  const backPath = dashboardByRole[user?.role ?? "student"] ?? "/dashboard/student";
  const isStaff = user ? ["educator", "coordinator", "editor", "admin"].includes(user.role) : false;
  const canEdit = user?.role === "student" && book.authorId === user.id;
  const reviewablePages = sortedPages.filter((page) => !["approved", "published"].includes(page.status));
  const submittedPages = sortedPages.filter((page) => page.status === "submitted");
  const correctedPages = sortedPages.filter((page) => ["approved", "published"].includes(page.status));
  const activeWritingPage = reviewablePages[0] ?? null;
  const canSubmitForReview = canEdit && reviewablePages.length > 0;
  const totalWords = sortedPages.reduce((total, page) => total + countWords(page.content), 0);
  const estimatedPrintedPages = Math.max(book.pageCount ?? 0, sortedPages.length ? sortedPages.length : 1, Math.ceil(totalWords / 330));
  const openWritingStudio = () => {
    if (!canEdit) return;
    if (activeWritingPage) {
      navigate(`/page-editor?bookId=${bookId}&pageId=${activeWritingPage.id}`);
      return;
    }
    if (nextPageNumber > 250) {
      toast.error("Este livro chegou ao limite de partes salvas.");
      return;
    }

    createPageMutation.mutate({
      bookId,
      pageNumber: nextPageNumber,
      title: nextPageNumber === 1 ? "Documento do livro" : `Continuação automática ${nextPageNumber}`,
    });
  };

  return (
    <div className="lumi-page-aura min-h-screen">
      <div className="border-b border-emerald-900/10 bg-white/92 shadow-[0_12px_32px_rgba(15,61,46,0.07)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate(backPath)} aria-label="Voltar" title="Voltar">
              <ArrowLeft size={20} />
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-950">{book.title}</h1>
                <Badge variant="secondary">{statusLabels[book.status] ?? book.status}</Badge>
              </div>
              <p className="mt-1 text-slate-600">
                {estimatedPrintedPages} folhas automáticas | {totalWords} palavras | {submittedPages.length} novas para revisar |{" "}
                {correctedPages.length} já corrigidas
              </p>
            </div>
          </div>
          {user?.role === "student" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="bg-emerald-800 hover:bg-emerald-900"
                disabled={!canEdit || createPageMutation.isPending}
                onClick={openWritingStudio}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Continuar escrevendo
              </Button>
              <Button
                variant="outline"
                className="border-emerald-700 text-emerald-900 hover:bg-emerald-50"
                disabled={!canSubmitForReview || submitMutation.isPending}
                onClick={() => submitMutation.mutate({ bookId })}
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar paginas novas
              </Button>
            </div>
          ) : (
            <Badge variant="outline">Equipe pedagógica</Badge>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        {canEdit && (
          <Card className="lumi-brazil-panel overflow-hidden border-0 p-0 text-white shadow-xl">
            <CardContent className="relative grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_18rem] md:p-8">
              <div>
                <Badge className="bg-white/15 text-white hover:bg-white/20">Livro contínuo</Badge>
                <h2 className="mt-4 text-3xl font-black tracking-tight">Documento do livro</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/82">
                  Documento único do livro, com imagens, corte automático de páginas e continuidade liberada para novas entregas.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    className="bg-yellow-300 text-emerald-950 hover:bg-yellow-200"
                    disabled={createPageMutation.isPending}
                    onClick={openWritingStudio}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Continuar escrevendo
                  </Button>
                  <Badge className="bg-white/15 text-white hover:bg-white/20">Corte automático</Badge>
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white/12 p-3">
                    <p className="text-white/65">Folhas</p>
                    <p className="text-3xl font-bold">{estimatedPrintedPages}</p>
                  </div>
                  <div className="rounded-lg bg-white/12 p-3">
                    <p className="text-white/65">Palavras</p>
                    <p className="text-3xl font-bold">{totalWords}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/72">
                  Depois de escrever, envie somente as páginas novas para avaliação.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {evaluations.length > 0 && (
          <Card className="lumi-cup-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-emerald-700" />
                Feedback e notas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {evaluations.map((evaluation) => (
                <div key={evaluation.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-950">{evaluation.evaluatorName}</p>
                      <p className="text-sm text-slate-600">
                        {evaluation.evaluatorRole || "equipe"} | {new Date(evaluation.updatedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant="secondary">Nota {formatScore(evaluation.score)}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {evaluation.feedback || "Avaliação registrada sem comentário escrito."}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {isStaff && (
          <Card className="lumi-cup-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-700" />
                Correção interna antes do professor
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-3">
              {submittedPages.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-600 lg:col-span-3">
                  Nenhuma parte nova pendente. O que já foi corrigido fica visível, mas não entra de novo na nota.
                </p>
              ) : (
                submittedPages.map((page) => (
                  <div key={page.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-900">Parte {page.pageNumber}</p>
                    <p className="mt-1 font-medium text-slate-950">{page.title || `Parte ${page.pageNumber}`}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {page.aiCorrectionSummary || "Texto preparado para revisão sem alterações relevantes."}
                    </p>
                    {page.originalContent && page.aiCorrectedContent ? (
                      <details className="mt-3 text-sm text-slate-700">
                        <summary className="cursor-pointer font-medium text-emerald-800">Ver original e revisado pela IA</summary>
                        <div className="mt-3 grid gap-3">
                          <div className="rounded border bg-white p-3">
                            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Original</p>
                            <article
                              className="prose prose-slate max-w-none text-sm"
                              dangerouslySetInnerHTML={{ __html: extractPageHtml(page.originalContent) || "<p>Sem texto.</p>" }}
                            />
                          </div>
                          <div className="rounded border bg-white p-3">
                            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Revisado</p>
                            <article
                              className="prose prose-slate max-w-none text-sm"
                              dangerouslySetInnerHTML={{ __html: extractPageHtml(page.aiCorrectedContent) || "<p>Sem texto.</p>" }}
                            />
                          </div>
                        </div>
                      </details>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {sortedPages.length > 0 && (
          <Card className="lumi-cup-card">
            <CardHeader>
              <CardTitle>Leitura do ebook</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mx-auto max-h-[560px] max-w-[780px] overflow-y-auto rounded-xl border border-emerald-900/10 bg-white px-8 py-10 shadow-lg md:px-14">
                <div className="mb-8 border-b pb-6 text-center">
                  <h2 className="text-3xl font-bold text-slate-950">{book.title}</h2>
                  {book.subtitle ? <p className="mt-2 text-lg text-slate-600">{book.subtitle}</p> : null}
                  {book.description ? <p className="mt-3 text-sm text-slate-500">{book.description}</p> : null}
                </div>
                <div className="space-y-10">
                  {sortedPages.map((page) => (
                    <section key={page.id} className="break-words">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium uppercase text-emerald-700">Parte {page.pageNumber}</p>
                        <Badge variant={page.status === "submitted" ? "default" : "outline"}>
                          {statusLabels[page.status] ?? page.status}
                        </Badge>
                      </div>
                      <h3 className="mt-1 text-2xl font-semibold text-slate-950">{page.title || `Parte ${page.pageNumber}`}</h3>
                      <article
                        className="prose prose-slate mt-4 max-w-none leading-8"
                        dangerouslySetInnerHTML={{ __html: extractPageHtml(page.content) || "<p>Parte sem texto.</p>" }}
                      />
                    </section>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="lumi-cup-card">
          <CardHeader>
            <CardTitle>Partes salvas do livro</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedPages.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3 font-medium text-slate-800">Este livro ainda não tem texto.</p>
                <p className="mt-1 text-sm text-slate-600">Abra o editor para iniciar o documento.</p>
                {canEdit ? (
                  <Button className="mt-5 bg-emerald-800 hover:bg-emerald-900" onClick={openWritingStudio}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Continuar escrevendo
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parte</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Palavras</TableHead>
                      <TableHead>IA interna</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPages.map((page) => {
                      const canEditPage = canEdit && page.status !== "published" && !(book.status === "published" && page.status === "approved");
                      return (
                      <TableRow key={page.id}>
                        <TableCell className="font-semibold">#{page.pageNumber}</TableCell>
                        <TableCell>{page.title || "Sem título"}</TableCell>
                        <TableCell>
                          <Badge variant={page.status === "submitted" ? "default" : "outline"}>
                            {statusLabels[page.status] ?? page.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{countWords(page.content)}</TableCell>
                        <TableCell className="max-w-[260px] text-sm text-slate-600">
                          {["approved", "published"].includes(page.status) ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Já corrigida
                            </span>
                          ) : page.aiCorrectionSummary ? (
                            page.aiCorrectionSummary
                          ) : (
                            "Aguardando envio"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className={canEditPage ? "bg-emerald-700 hover:bg-emerald-800" : ""}
                              variant={canEditPage ? "default" : "outline"}
                              onClick={() => navigate(`/page-editor?bookId=${bookId}&pageId=${page.id}`)}
                            >
                              {canEditPage ? "Escrever" : "Ler"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!canEditPage || deletePageMutation.isPending}
                              onClick={() => {
                                if (confirm("Remover esta parte?")) {
                                  deletePageMutation.mutate({ pageId: page.id });
                                }
                              }}
                              aria-label="Remover parte"
                              title="Remover parte"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
