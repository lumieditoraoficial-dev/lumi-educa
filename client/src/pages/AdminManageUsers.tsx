import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Camera, Edit2, Loader2, Lock, Mail, Plus, Search, Trash2, User } from "lucide-react";
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

export default function AdminManageUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ ...blankUser });

  const { data: users = [], isLoading, refetch } = trpc.users.listUsers.useQuery();

  const updateUserMutation = trpc.users.updateUser.useMutation({
    onSuccess: () => {
      toast.success("Usuario atualizado com sucesso.");
      setEditingUser(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteUserMutation = trpc.users.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Usuario deletado com sucesso.");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Usuario cadastrado com sucesso.");
      setNewUser({ ...blankUser });
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar usuario");
    },
  });

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
    });
  };

  const handleDeleteUser = (id: number) => {
    if (confirm("Tem certeza que deseja deletar este usuario?")) {
      deleteUserMutation.mutate({ userId: id });
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (newUser.password.length < 6) {
      toast.error("A senha deve ter no minimo 6 caracteres");
      return;
    }

    await registerMutation.mutateAsync({
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      role: newUser.role,
      avatarUrl: newUser.avatarUrl || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Usuarios</h1>
        <p className="mt-2 text-gray-600">Criar, editar, remover usuarios e cadastrar foto de perfil.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total de Usuarios</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Alunos</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{users.filter((u) => u.role === "student").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Educadores</p>
            <p className="mt-2 text-3xl font-bold text-purple-600">{users.filter((u) => u.role === "educator").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Coordenadores</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {users.filter((u) => u.role === "coordinator").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2 bg-green-600 hover:bg-green-700">
            <Plus size={20} />
            Cadastrar Novo Usuario
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Nome do usuario"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="usuario@email.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="password"
                  placeholder="senha segura"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Perfil</label>
              <Select value={newUser.role} onValueChange={(value: Role) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Aluno</SelectItem>
                  <SelectItem value="educator">Educador</SelectItem>
                  <SelectItem value="coordinator">Coordenador</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-lg border p-3">
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

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Nome</span>
                <Input value={editingUser.name ?? ""} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Email</span>
                <Input value={editingUser.email ?? ""} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} />
              </label>

              <label className="block space-y-1.5">
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

              <div className="flex justify-end gap-2 pt-2">
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
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios Cadastrados ({filteredUsers.length})</CardTitle>
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
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Data de Criacao</TableHead>
                    <TableHead>Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                        Nenhum usuario encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-gray-50">
                        <TableCell>
                          <AvatarPreview name={user.name} avatarUrl={user.avatarUrl} />
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge className={roleColors[user.role as Role]}>{roleLabels[user.role as Role]}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingUser({ ...user })} className="gap-1">
                              <Edit2 size={16} />
                              Editar
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)} className="gap-1">
                              <Trash2 size={16} />
                              Deletar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
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
