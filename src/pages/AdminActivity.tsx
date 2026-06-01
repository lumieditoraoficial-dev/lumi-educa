import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Activity, Search } from "lucide-react";
import { useMemo, useState } from "react";

type ActivityStatus = "success" | "warning";

type ActivityLog = {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  resource: string;
  status: ActivityStatus;
  details: string;
};

const statusStyles: Record<ActivityStatus, string> = {
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
};

const statusLabels: Record<ActivityStatus, string> = {
  success: "Sucesso",
  warning: "Atenção",
};

function formatDate(value: Date) {
  return new Date(value).toLocaleString("pt-BR");
}

function bookAction(status: string) {
  const actions: Record<string, string> = {
    draft: "Livro em rascunho",
    rejected: "Livro devolvido",
    submitted: "Livro enviado",
    under_review: "Livro em revisão",
    approved: "Livro aprovado",
    published: "Livro publicado",
  };

  return actions[status] ?? "Livro atualizado";
}

export default function AdminActivity() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: users = [] } = trpc.users.listUsers.useQuery();
  const { data: books = [] } = trpc.books.listBooks.useQuery();

  const logs = useMemo<ActivityLog[]>(() => {
    const userById = new Map(users.map((user) => [user.id, user]));

    const bookLogs: ActivityLog[] = books.map((book) => {
      const author = userById.get(book.authorId);
      return {
        id: `book-${book.id}`,
        timestamp: new Date(book.updatedAt),
        user: author?.name ?? `Aluno #${book.authorId}`,
        action: bookAction(book.status),
        resource: book.title,
        status: book.status === "rejected" ? "warning" : "success",
        details: `${book.pageCount ?? 0} páginas, ${book.wordCount ?? 0} palavras`,
      };
    });

    const userLogs: ActivityLog[] = users.map((user) => ({
      id: `user-${user.id}`,
      timestamp: new Date(user.updatedAt ?? user.createdAt),
      user: user.name ?? user.email ?? `Usuário #${user.id}`,
      action: "Usuário cadastrado",
      resource: user.role,
      status: "success",
      details: user.email ?? "Sem email informado",
    }));

    return [...bookLogs, ...userLogs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [books, users]);

  const filteredLogs = logs.filter((log) => {
    const matchesStatus = filterStatus === "all" || log.status === filterStatus;
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      log.user.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      log.resource.toLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  });

  const warningCount = logs.filter((log) => log.status === "warning").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Atividade do sistema</h1>
        <p className="mt-2 text-gray-600">Eventos reais gerados por usuários e livros.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Eventos registrados</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{logs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Livros monitorados</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{books.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Atenções</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">{warningCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar por usuário, ação ou recurso..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="warning">Atenção</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={20} />
            Registros ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-gray-600">
              Nenhuma atividade registrada ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-gray-600">{formatDate(log.timestamp)}</TableCell>
                      <TableCell className="font-medium">{log.user}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.resource}</TableCell>
                      <TableCell>
                        <Badge className={statusStyles[log.status]}>{statusLabels[log.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{log.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
