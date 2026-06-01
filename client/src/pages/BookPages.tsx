import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviado",
  under_review: "Em revisão",
  approved: "Aprovado",
  published: "Publicado",
  rejected: "Rejeitado",
};

function countWords(content?: string | null) {
  return (content ?? "").replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

export default function BookPages({ bookId }: { bookId: number }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [newPageTitle, setNewPageTitle] = useState("");

  const { data: book, isLoading: bookLoading } = trpc.books.getBook.useQuery({ bookId });
  const { data: pages = [], isLoading: pagesLoading } = trpc.books.getPages.useQuery({ bookId });

  const nextPageNumber = useMemo(
    () => (pages.length ? Math.max(...pages.map((page) => page.pageNumber)) + 1 : 1),
    [pages]
  );

  useEffect(() => {
    setNewPageTitle((current) => current || `Página ${nextPageNumber}`);
  }, [nextPageNumber]);

  const createPageMutation = trpc.books.createPage.useMutation({
    onSuccess: async (page: any) => {
      toast.success("Página criada. Pode começar a escrever.");
      await utils.books.getPages.invalidate({ bookId });
      setNewPageTitle("");
      if (page?.id) {
        navigate(`/page-editor?bookId=${bookId}&pageId=${page.id}`);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePageMutation = trpc.books.deletePage.useMutation({
    onSuccess: async () => {
      toast.success("Página removida.");
      await utils.books.getPages.invalidate({ bookId });
    },
    onError: (error) => toast.error(error.message),
  });

  const submitMutation = trpc.publications.submitForReview.useMutation({
    onSuccess: async () => {
      toast.success("Livro enviado para revisão.");
      await utils.books.getBook.invalidate({ bookId });
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
  const canEdit = user?.role === "student" && book.status !== "published";
  const canSubmitForReview = user?.role === "student" && (book.status === "draft" || book.status === "rejected");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate(backPath)}>
              <ArrowLeft size={20} />
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-950">{book.title}</h1>
                <Badge variant="secondary">{statusLabels[book.status] ?? book.status}</Badge>
              </div>
              <p className="mt-1 text-slate-600">
                {pages.length} de 250 páginas • {pages.reduce((total, page) => total + countWords(page.content), 0)} palavras
              </p>
            </div>
          </div>
          {user?.role === "student" ? (
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              disabled={!canSubmitForReview || pages.length === 0 || submitMutation.isPending}
              onClick={() => submitMutation.mutate({ bookId })}
            >
              <Send className="mr-2 h-4 w-4" />
              {canSubmitForReview ? "Enviar para revisão" : book.status === "published" ? "Publicado" : "Já enviado"}
            </Button>
          ) : (
            <Badge variant="outline">Visualização da equipe</Badge>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle>Nova página</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row">
              <Input
                value={newPageTitle}
                onChange={(event) => setNewPageTitle(event.target.value)}
                placeholder={`Página ${nextPageNumber}`}
                className="md:max-w-md"
              />
              <Button
                className="bg-emerald-700 hover:bg-emerald-800"
                disabled={createPageMutation.isPending || pages.length >= 250}
                onClick={() =>
                  createPageMutation.mutate({
                    bookId,
                    pageNumber: nextPageNumber,
                    title: newPageTitle || `Página ${nextPageNumber}`,
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar e escrever
              </Button>
            </CardContent>
          </Card>
        )}

        {pages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Documento unico do livro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mx-auto max-h-[520px] max-w-[780px] overflow-y-auto rounded-sm border bg-white px-8 py-10 shadow-sm md:px-14">
                <div className="mb-8 border-b pb-6 text-center">
                  <h2 className="text-3xl font-bold text-slate-950">{book.title}</h2>
                  {book.subtitle ? <p className="mt-2 text-lg text-slate-600">{book.subtitle}</p> : null}
                  {book.description ? <p className="mt-3 text-sm text-slate-500">{book.description}</p> : null}
                </div>
                <div className="space-y-10">
                  {pages
                    .slice()
                    .sort((a, b) => a.pageNumber - b.pageNumber)
                    .map((page) => (
                      <section key={page.id} className="break-words">
                        <p className="text-sm font-medium uppercase text-emerald-700">Pagina {page.pageNumber}</p>
                        <h3 className="mt-1 text-2xl font-semibold text-slate-950">{page.title || `Pagina ${page.pageNumber}`}</h3>
                        <article
                          className="prose prose-slate mt-4 max-w-none leading-8"
                          dangerouslySetInnerHTML={{ __html: page.content || "<p>Pagina sem texto.</p>" }}
                        />
                      </section>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Páginas do livro</CardTitle>
          </CardHeader>
          <CardContent>
            {pages.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3 font-medium text-slate-800">Este livro ainda não tem páginas.</p>
                <p className="mt-1 text-sm text-slate-600">Crie a primeira página para começar a escrever.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Página</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Palavras</TableHead>
                      <TableHead>Atualizada em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-semibold">#{page.pageNumber}</TableCell>
                        <TableCell>{page.title || "Sem título"}</TableCell>
                        <TableCell>{countWords(page.content)}</TableCell>
                        <TableCell>{new Date(page.updatedAt).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className={canEdit ? "bg-emerald-700 hover:bg-emerald-800" : ""}
                              variant={canEdit ? "default" : "outline"}
                              onClick={() => navigate(`/page-editor?bookId=${bookId}&pageId=${page.id}`)}
                            >
                              {canEdit ? "Escrever" : "Ler"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!canEdit || deletePageMutation.isPending}
                              onClick={() => {
                                if (confirm("Remover esta página?")) {
                                  deletePageMutation.mutate({ pageId: page.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
