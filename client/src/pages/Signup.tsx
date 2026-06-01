import BrandLogo from "@/components/BrandLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Camera, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Signup() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState("student");
  const [isLoading, setIsLoading] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Conta criada com sucesso. Faca login para continuar.");
      navigate("/login");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar conta");
    },
  });

  const handlePhoto = (file?: File) => {
    if (!file) return;
    if (file.size > 1_500_000) {
      toast.error("Use uma foto com ate 1,5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(String(reader.result ?? ""));
    reader.onerror = () => toast.error("Nao foi possivel carregar a foto.");
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("As senhas nao correspondem");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter no minimo 6 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      await registerMutation.mutateAsync({
        email,
        password,
        name,
        avatarUrl: avatarUrl || undefined,
        role: role as "student" | "educator" | "coordinator" | "editor" | "admin",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F3D2E] p-4">
      <div className="absolute left-0 top-0 h-56 w-72 bg-[#266B3D]" style={{ clipPath: "polygon(0 0, 100% 0, 36% 100%, 0 58%)" }} />
      <div className="absolute left-0 top-0 h-44 w-56 bg-[#6DB33F]" style={{ clipPath: "polygon(0 0, 74% 0, 44% 100%, 0 35%)" }} />
      <div className="absolute left-40 top-0 h-36 w-44 bg-[#F4C430]" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
      <div className="absolute bottom-0 right-0 h-72 w-96 bg-[#266B3D]" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%, 42% 44%)" }} />
      <div className="absolute bottom-0 right-0 h-56 w-72 bg-[#6DB33F]" style={{ clipPath: "polygon(100% 0, 100% 100%, 28% 100%, 0 48%)" }} />
      <div className="absolute bottom-0 right-40 h-36 w-48 bg-[#F4C430]" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />

      <div className="relative z-10 w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mx-auto mb-8 block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C430]"
        >
          <BrandLogo inverted showTagline />
        </button>

        <Card className="rounded-lg border-0 bg-white shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-[#0F3D2E]">Criar usuario real</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-4 rounded-lg border border-[#0F3D2E]/10 bg-[#F7F3E9] p-3">
                <Avatar className="h-14 w-14 border bg-white">
                  <AvatarImage src={avatarUrl || undefined} alt={name || "Usuario"} />
                  <AvatarFallback>{name.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#0F3D2E]/15 bg-white px-3 py-2 text-sm font-medium text-[#0F3D2E] hover:bg-[#eef7e8]">
                  <Camera className="h-4 w-4" />
                  Foto de perfil
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handlePhoto(event.target.files?.[0])} />
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#0F3D2E]">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-[#0F3D2E]/15 bg-[#fbfaf5] pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#0F3D2E]">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-[#0F3D2E]/15 bg-[#fbfaf5] pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#0F3D2E]">Perfil</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="border-[#0F3D2E]/15 bg-[#fbfaf5]">
                    <SelectValue placeholder="Selecione seu perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Aluno</SelectItem>
                    <SelectItem value="educator">Educador</SelectItem>
                    <SelectItem value="coordinator">Coordenador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#0F3D2E]">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="senha segura"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-[#0F3D2E]/15 bg-[#fbfaf5] pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#0F3D2E]">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="confirme a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-[#0F3D2E]/15 bg-[#fbfaf5] pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="h-11 w-full bg-[#0F3D2E] font-semibold text-white hover:bg-[#174f3d]">
                {isLoading ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>

            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-[#0F3D2E]/10"></div>
              <span className="px-3 text-sm text-slate-500">ou</span>
              <div className="flex-1 border-t border-[#0F3D2E]/10"></div>
            </div>

            <p className="text-center text-sm text-slate-600">
              Ja tem conta?{" "}
              <button type="button" onClick={() => navigate("/login")} className="font-semibold text-[#266B3D] hover:text-[#0F3D2E]">
                Fazer login
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
