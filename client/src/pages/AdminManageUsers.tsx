import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dailyAccessStatus, formatLastAccess, hasAccessedToday, isOnlineNow, lastActivityAt } from "@/lib/insights";
import { ALL_SCHOOLS, SCHOOL_OPTIONS, type SchoolFilter, getSchoolLabel, matchesSchool, normalizeSchoolId } from "@/lib/schools";
import { trpc } from "@/lib/trpc";
import { Activity, Camera, Edit2, Loader2, Lock, Mail, Plus, Search, Trash2, User, UserCheck, UserX } from "lucide-react";
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
  schoolId: "1",
  className: "",
  assignedEducatorId: "",
};

function AvatarPreview({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) {
  return (
    <Avatar className="h-12 w-12 border">
      <AvatarImage src={avatarUrl ?? undefined} alt={name ?? "Usuario"} className="object-cover" />
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

function lastActivity(user: any) {
  return lastActivityAt(user);
}

function isOnline(user: any, now: number) {
  return isOnlineNow(user, new Date(now));
}

function isIdle(user: any, now: number) {
  const activity = lastActivity(user);
  if (user.isActive === false || !activity) return false;
  const lastSeen = new Date(activity).getTime();
  if (Number.isNaN(lastSeen)) return false;
  return now - lastSeen > 14 * 86_400_000;
}

function presence(user: any, now: number) {
  if (user.isActive === false) return { label: "Conta inativa", className: "bg-slate-100 text-slate-700", icon: UserX };
  if (isOnline(user, now)) return { label: "Online agora", className: "bg-emerald-100 text-emerald-800", icon: Activity };
  if (!lastActivity(user)) return { label: "Sem acesso", className: "bg-amber-100 text-amber-800", icon: UserCheck };

  if (isIdle(user, now)) return { label: "Sem uso recente", className: "bg-amber-100 text-amber-800", icon: UserCheck };
  return { label: "Offline", className: "bg-slate-100 text-slate-700", icon: UserCheck };
}

export default function AdminManageUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ ...blankUser });
  const [schoolFilter, setSchoolFilter] = useState<SchoolFilter>(ALL_SCHOOLS);
  const [now, setNow] = useState(() => Date.now());

  const { data: users = [], isLoading, refetch } = trpc.users.listUsers.useQuery(undefined, {
    refetchInterval: 15_000,
  });
  const educators = useMemo(() => users.filter((user) => user.role === "educator"), [users]);
  const educatorsForNewUser = useMemo(
    () => educators.filter((educator) => normalizeSchoolId(educator.schoolId) === normalizeSchoolId(newUser.schoolId)),
    [educators, newUser.schoolId]
  );
  const educatorsForEditingUser = useMemo(
    () =>
      editingUser
        ? educators.filter((educator) => normalizeSchoolId(educator.schoolId) === normalizeSchoolId(editingUser.schoolId))
        : educators,
    [educators, editingUser]
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

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

  const filteredUsers = users.filter((user) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.className?.toLowerCase().includes(query) ||
      getSchoolLabel(user.schoolId).toLowerCase().includes(query);

    return matchesSchool(user.schoolId, schoolFilter) && matchesSearch;
  });

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
      schoolId: normalizeSchoolId(editingUser.schoolId),
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
      schoolId: normalizeSchoolId(newUser.schoolId),
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {[
          { label: "Total de usuarios", value: users.length },
          { label: "Online agora", value: users.filter((user) => isOnline(user, now)).length },
          { label: "Acessaram hoje", value: users.filter((user) => hasAccessedToday(user, new Date(now))).length },
          { label: "Contas habilitadas", value: users.filter((user) => user.isActive !== false).length },
          { label: "Contas inativas", value: users.filter((user) => user.isActive === false).length },
          {
            label: "Sem uso 14 dias",
            value: users.filter((user) => isIdle(user, now)).length,
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
                <span className="text-sm font-medium text-gray-700">Escola</span>
                <Select
                  value={String(normalizeSchoolId(newUser.schoolId))}
                  onValueChange={(value) => setNewUser({ ...newUser, schoolId: value, assignedEducatorId: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHOOL_OPTIONS.map((school) => (
                      <SelectItem key={school.id} value={String(school.id)}>
                        {school.label}
                      </SelectItem>
                    ))}
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
                    {educatorsForNewUser.map((educator) => (
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
                  <span className="text-sm font-medium text-gray-700">Escola</span>
                  <Select
                    value={String(normalizeSchoolId(editingUser.schoolId))}
                    onValueChange={(value) => setEditingUser({ ...editingUser, schoolId: Number(value), assignedEducatorId: null })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHOOL_OPTIONS.map((school) => (
                        <SelectItem key={school.id} value={String(school.id)}>
                          {school.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Status da conta</span>
                  <Select
                    value={editingUser.isActive === false ? "inactive" : "active"}
                    onValueChange={(value) => setEditingUser({ ...editingUser, isActive: value === "active" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Conta habilitada</SelectItem>
                      <SelectItem value="inactive">Conta inativa</SelectItem>
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
                      {educatorsForEditingUser.map((educator) => (
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
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Buscar por nome, email, escola ou turma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={schoolFilter} onValueChange={(value: SchoolFilter) => setSchoolFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SCHOOLS}>Todas as escolas</SelectItem>
                {SCHOOL_OPTIONS.map((school) => (
                  <SelectItem key={school.id} value={String(school.id)}>
                    {school.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    <TableHead>Escola</TableHead>
                    <TableHead>Presenca</TableHead>
                    <TableHead>Acesso diario</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Ultima atividade</TableHead>
                    <TableHead>Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-gray-500">
                        Nenhum usuario encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const state = presence(user, now);
                      const Icon = state.icon;
                      const educator = educators.find((item) => item.id === user.assignedEducatorId);
                      const access = dailyAccessStatus(user, new Date(now));
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
                          <TableCell>{getSchoolLabel(user.schoolId)}</TableCell>
                          <TableCell>
                            <Badge className={state.className}>
                              <Icon className="mr-1 h-3 w-3" />
                              {state.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={access.className}>{access.label}</Badge>
                          </TableCell>
                          <TableCell>{user.className || "-"}</TableCell>
                          <TableCell className="text-sm text-gray-600">{formatLastAccess(lastActivity(user))}</TableCell>
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
