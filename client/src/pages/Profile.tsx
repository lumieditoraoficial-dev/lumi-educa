import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Camera, KeyRound, Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

export default function Profile() {
  const { user, loading, refresh } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setAvatarUrl(user.avatarUrl ?? "");
  }, [user]);

  const updateProfileMutation = trpc.users.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Perfil atualizado.");
      setPassword("");
      await utils.auth.me.invalidate();
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  if (loading || !user) {
    return <DashboardLayout>Carregando perfil...</DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-950">Meu perfil</h1>
          <p className="mt-2 text-slate-600">Atualize nome, foto e senha da sua conta.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-emerald-700" />
              Dados pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
              <Avatar className="h-20 w-20 border">
                <AvatarImage src={avatarUrl || undefined} alt={name || "Usuario"} />
                <AvatarFallback>{name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-wrap gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50">
                  <Camera className="h-4 w-4" />
                  Trocar foto
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) readPhoto(file, setAvatarUrl);
                    }}
                  />
                </label>
                {avatarUrl ? (
                  <Button variant="outline" onClick={() => setAvatarUrl("")}>
                    Remover foto
                  </Button>
                ) : null}
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Nome</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>

            <label className="block space-y-1.5">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <KeyRound className="h-4 w-4" />
                Nova senha
              </span>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Deixe em branco para manter a senha atual"
              />
            </label>

            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              disabled={updateProfileMutation.isPending}
              onClick={() => {
                if (!name.trim() || !email.trim()) {
                  toast.error("Nome e email sao obrigatorios.");
                  return;
                }
                updateProfileMutation.mutate({
                  name: name.trim(),
                  email: email.trim(),
                  avatarUrl: avatarUrl || null,
                  ...(password ? { password } : {}),
                });
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateProfileMutation.isPending ? "Salvando..." : "Salvar perfil"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
