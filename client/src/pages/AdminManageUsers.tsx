import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Camera, Edit2, Loader2, Lock, Mail, Plus, Search, Trash2, User, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

type Role = "student" | "educator" | "coordinator" | "editor" | "admin";

const roleLabels: Record<Role, string> = {
  student: "Aluno",
  educator: "Educador",
  coordinator: "Coordenador",
  editor: "Editor",
  admin: "Administrador",
};

const roleColors: Record<Role, string> = {
  student: "bg-blue-100 text-blue-800",
  educator: "bg-purple-100 text-purple-800",
  coordinator: "bg-green-100 text-green-800",
  editor: "bg-orange-100 text-orange-800",
  admin: "bg-red-100 text-red-800",
};

const blankUser = {
  name: "",
  email: "",
  password: "",
  role: "student" as Role,
  avatarUrl: "",
  className: "",
  assignedEducatorId: "",
};

function AvatarPreview({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) {
  return (
    <Avatar className="h-12 w-12 border">
      <AvatarImage src={avatarUrl ?? undefined} alt={name ?? "Usuario"} />
      <AvatarFallback>{name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
    </Avatar>
  );
}

function readPhoto(file: File, onLoad: (value: string) => void) {
  if (file.size > 1_500_000) {
    toast.error("Use uma foto com ate 1,5 MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result ?? ""));
  reader.onerror = () => toast.error("Nao foi possivel carregar a foto.");
  reader.readAsDataURL(file);
}

function lastAccessLabel(value?: string | Date | null) {
  if (!value) return "Nunca acessou";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nunca acessou";
  return date.toLocaleString("pt-BR");
}

function presence(user: any) {
  if (user.isActive === false) return { label: "Inativo", className: "bg-slate-100 text-slate-700", icon: UserX };
  if (!user.lastSignedIn) return { label: "Ativo sem acesso", className: "bg-amber-100 text-amber-800", icon: UserCheck };

  const days = (Date.now() - new Date(user.lastSignedIn).getTime()) / 86_400_000;
  if (days > 14) return { label: "Ativo parado", className: "bg-amber-100 text-amber-800", icon: UserCheck };
  return { label: "Ativo", className: "bg-emerald-100 text-emerald-800", icon: UserCheck };
}

export default function AdminManageUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ ...blankUser });

  const { data: users = [], isLoading, refetch } = trpc.users.listUsers.useQuery();
  const educators = useMemo(() => users.filter((user) => user.role === "educator"), [users]);

  const updateUserMutation = trpc.users.updateUser.useMutation({
    onSuccess: () => {
      toast.success("Usuario atualizado.");
      setEditingUser(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteUserMutation = trpc.users.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Usuario deletado.");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Usuario cadastrado.");
      setNewUser({ ...blankUser });
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(error.message || "Erro ao cadastrar usuario."),
  });

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.className?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdateUser = () => {
    if (!editingUser) return;
    if (!editingUser.name || !editingUser.email) {
      toast.error("Nome e email sao obrigatorios.");
      return;
    }

    updateUserMutation.mutate({
      userId: editingUser.id,
      name: editingUser.name,
      email: editingUser.email,
      role: editingUser.role,
      avatarUrl: editingUser.avatarUrl || null,
      className: editingUser.className || null,
      assignedEducatorId:
        editingUser.role === "student" && editingUser.assignedEducatorId ? Number(editingUser.assignedEducatorId) : null,
      isActive: editingUser.isActive !== false,
    });
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Preencha nome, email e senha.");
      return;
    }

    if (newUser.password.length < 6) {
      toast.error("A senha deve ter no minimo 6 caracteres.");
      return;
    }

    await registerMutation.mutateAsync({
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      role: newUser.role,
      avatarUrl: newUser.avatarUrl || undefined,
      className: newUser.className || undefined,
      assignedEducatorId:
        newUser.role === "student" && newUser.assignedEducatorId ? Number(newUser.assignedEducatorId) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar usuarios</h1>
        <p className="mt-2 text-gray-600">Criar, editar, remover, acompanhar acesso e organizar turmas.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: "Total de usuarios", value: users.length },
          { label: "Ativos", value: users.filter((user) => user.isActive !== false).length },
          { label: "Inativos", value: users.filter((user) => user.isActive === false).length },
          {
            label: "Ativos parados",
            value: users.filter((user) => {
              if (user.isActive === false || !user.lastSignedIn) return false;
              return (Date.now() - new Date(user.lastSignedIn).getTime()) / 86_400_000 > 14;
            }).length,
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2 bg-green-600 hover:bg-green-700">
            <Plus size={20} />
            Cadastrar novo usuario
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar novo usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pb-2">
            <div className="flex items-center gap-4 rounded-lg border p-3">
              <AvatarPreview name={newUser.name} avatarUrl={newUser.avatarUrl} />
              <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50">
                <Camera className="h-4 w-4" />
                Escolher foto
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) readPhoto(file, (avatarUrl) => setNewUser((current) => ({ ...current, avatarUrl })));
                  }}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Nome completo</span>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="pl-10" />
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Email</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Senha</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Perfil</span>
                <Select value={newUser.role} onValueChange={(value: Role) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Aluno</SelectItem>
                    <SelectItem value="educator">Educador</SelectItem>
                    <SelectItem value="coordinator">Coordenador</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Turma</span>
                <Input value={newUser.className} onChange={(e) => setNewUser({ ...newUser, className: e.target.value })} />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Educador do aluno</span>
                <Select
                  value={newUser.assignedEducatorId || "none"}
                  onValueChange={(value) => setNewUser({ ...newUser, assignedEducatorId: value === "none" ? "" : value })}
                  disabled={newUser.role !== "student"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem educador definido" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem educador definido</SelectItem>
                    {educators.map((educator) => (
                      <SelectItem key={educator.id} value={String(educator.id)}>
                        {educator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setNewUser({ ...blankUser });
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} disabled={registerMutation.isPending} className="bg-green-600 hover:bg-green-700">
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={16} />
                    Cadastrando...
                  </>
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 pb-2">
              <div className="flex flex-wrap items-center gap-4 rounded-lg border p-3">
                <AvatarPreview name={editingUser.name} avatarUrl={editingUser.avatarUrl} />
                <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50">
                  <Camera className="h-4 w-4" />
                  Trocar foto
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) readPhoto(file, (avatarUrl) => setEditingUser((current: any) => ({ ...current, avatarUrl })));
                    }}
                  />
                </label>
                {editingUser.avatarUrl ? (
                  <Button variant="outline" size="sm" onClick={() => setEditingUser({ ...editingUser, avatarUrl: "" })}>
                    Remover foto
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Nome</span>
                  <Input value={editingUser.name ?? ""} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Email</span>
                  <Input value={editingUser.email ?? ""} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Perfil</span>
                  <Select value={editingUser.role} onValueChange={(value: Role) => setEditingUser({ ...editingUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Aluno</SelectItem>
                      <SelectItem value="educator">Educador</SelectItem>
                      <SelectItem value="coordinator">Coordenador</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  <Select
                    value={editingUser.isActive === false ? "inactive" : "active"}
                    onValueChange={(value) => setEditingUser({ ...editingUser, isActive: value === "active" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Turma</span>
                  <Input
                    value={editingUser.className ?? ""}
                    onChange={(e) => setEditingUser({ ...editingUser, className: e.target.value })}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Educador do aluno</span>
                  <Select
                    value={editingUser.assignedEducatorId ? String(editingUser.assignedEducatorId) : "none"}
                    onValueChange={(value) =>
                      setEditingUser({ ...editingUser, assignedEducatorId: value === "none" ? null : Number(value) })
                    }
                    disabled={editingUser.role !== "student"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem educador definido" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem educador definido</SelectItem>
                      {educators.map((educator) => (
                        <SelectItem key={educator.id} value={String(educator.id)}>
                          {educator.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white pt-4">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending} className="bg-green-600 hover:bg-green-700">
                  {updateUserMutation.isPending ? "Salvando..." : "Salvar alteracoes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar por nome, email ou turma..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios cadastrados ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Foto</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Ultimo acesso</TableHead>
                    <TableHead>Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                        Nenhum usuario encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const state = presence(user);
                      const Icon = state.icon;
                      const educator = educators.find((item) => item.id === user.assignedEducatorId);
                      return (
                        <TableRow key={user.id} className="hover:bg-gray-50">
                          <TableCell>
                            <AvatarPreview name={user.name} avatarUrl={user.avatarUrl} />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            {user.role === "student" && educator ? (
                              <p className="text-xs text-gray-500">Educador: {educator.name}</p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge className={roleColors[user.role as Role]}>{roleLabels[user.role as Role]}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={state.className}>
                              <Icon className="mr-1 h-3 w-3" />
                              {state.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.className || "-"}</TableCell>
                          <TableCell className="text-sm text-gray-600">{lastAccessLabel(user.lastSignedIn)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEditingUser({ ...user })} className="gap-1">
                                <Edit2 size={16} />
                                Editar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Tem certeza que deseja deletar este usuario?")) {
                                    deleteUserMutation.mutate({ userId: user.id });
                                  }
                                }}
                                className="gap-1"
                              >
                                <Trash2 size={16} />
                                Deletar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
