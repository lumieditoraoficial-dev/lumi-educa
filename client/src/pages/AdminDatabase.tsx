import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BookOpen, Database, FileText, ShieldCheck, Users } from "lucide-react";

export default function AdminDatabase() {
  const { data: users = [] } = trpc.users.listUsers.useQuery();
  const { data: books = [] } = trpc.books.listBooks.useQuery();

  const pageCount = books.reduce((total, book) => total + (book.pageCount ?? 0), 0);
  const wordCount = books.reduce((total, book) => total + (book.wordCount ?? 0), 0);
  const publishedCount = books.filter((book) => book.status === "published").length;
  const pendingCount = books.filter((book) => ["submitted", "under_review", "approved"].includes(book.status)).length;
  const totalRecords = users.length + books.length + pageCount;

  const stats = [
    { label: "Usuários", value: users.length, icon: Users },
    { label: "Livros", value: books.length, icon: BookOpen },
    { label: "Páginas", value: pageCount, icon: FileText },
    { label: "Palavras", value: wordCount, icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Banco de dados</h1>
        <p className="mt-2 text-gray-600">Visão operacional dos registros reais do sistema.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <Icon className="h-8 w-8 text-emerald-700" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            Integridade
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Registros monitorados</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{totalRecords}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Pendentes de fluxo</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">{pendingCount}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Publicados</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{publishedCount}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-700" />
            Status de publicação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {books.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-gray-600">
              Nenhum registro de livro criado ainda.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {books.map((book) => (
                <div key={book.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-semibold text-gray-900">{book.title}</p>
                    <p className="text-sm text-gray-600">
                      {book.pageCount ?? 0} páginas, {book.wordCount ?? 0} palavras
                    </p>
                  </div>
                  <Badge variant="secondary">{book.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
