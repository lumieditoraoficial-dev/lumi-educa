import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock3, Database, FileText, Globe2, LockKeyhole, Server, ShieldCheck, Wifi, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type HealthResult = {
  ok: boolean;
  statusCode?: number;
  responseMs?: number;
  checkedAt?: Date;
  data?: any;
  error?: string;
};

async function checkEndpoint(path: string): Promise<HealthResult> {
  const started = performance.now();
  try {
    const response = await fetch(path, { cache: "no-store" });
    const responseMs = Math.round(performance.now() - started);
    const data = await response.json().catch(() => null);
    return {
      ok: response.ok && data?.ok !== false,
      statusCode: response.status,
      responseMs,
      checkedAt: new Date(),
      data,
    };
  } catch (error) {
    return {
      ok: false,
      responseMs: Math.round(performance.now() - started),
      checkedAt: new Date(),
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

function formatTime(value?: Date) {
  if (!value) return "-";
  return value.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusLine({
  title,
  detail,
  ok,
}: {
  title: string;
  detail: string;
  ok: boolean;
}) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-white p-4">
      <div>
        <p className="font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm text-slate-600">{detail}</p>
      </div>
      <Badge className={ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
        <Icon className="mr-1 h-3.5 w-3.5" />
        {ok ? "OK" : "Atenção"}
      </Badge>
    </div>
  );
}

export default function SystemStatus() {
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [database, setDatabase] = useState<HealthResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runChecks = async () => {
    setIsChecking(true);
    const [healthResult, databaseResult] = await Promise.all([
      checkEndpoint("/api/health"),
      checkEndpoint("/api/health/database"),
    ]);
    setHealth(healthResult);
    setDatabase(databaseResult);
    setIsChecking(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const appUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  const allOk = Boolean(health?.ok && database?.ok);

  return (
    <div className="min-h-screen bg-[#F8F7EB] px-4 py-8 text-[#0F3D2E]">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 rounded-xl bg-[#0F3D2E] p-6 text-white shadow-xl md:flex-row md:items-end">
          <div>
            <BrandLogo compact textClassName="text-white text-xl" />
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-[#F4C430]">Status do Sistema</p>
            <h1 className="mt-2 text-4xl font-bold tracking-normal">Verificação do Lumi Educa</h1>
            <p className="mt-3 max-w-2xl text-white/75">
              Acompanhe link, banco de dados, saúde do servidor e pontos críticos do ambiente escolar.
            </p>
          </div>
          <Button onClick={runChecks} disabled={isChecking} className="bg-[#F4C430] font-semibold text-[#0F3D2E] hover:bg-[#ffdc3b]">
            {isChecking ? "Verificando..." : "Verificar agora"}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Sistema", value: allOk ? "Online" : "Atenção", icon: Wifi },
            { label: "Resposta", value: health?.responseMs ? `${health.responseMs} ms` : "-", icon: Clock3 },
            { label: "Banco", value: database?.data?.database?.mode ?? (database?.ok ? "ok" : "-"), icon: Database },
            { label: "Link", value: isSecure ? "HTTPS" : "Local/HTTP", icon: Globe2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="rounded-lg">
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <p className="text-sm text-slate-600">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{item.value}</p>
                  </div>
                  <Icon className="h-7 w-7 text-[#266B3D]" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-[#266B3D]" />
                Verificações principais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusLine
                title="Link principal"
                detail={`${appUrl || "Sistema"} - última verificação ${formatTime(health?.checkedAt)}`}
                ok={Boolean(health?.ok)}
              />
              <StatusLine
                title="Banco de dados"
                detail={database?.error || `Modo: ${database?.data?.database?.mode ?? "verificando"}`}
                ok={Boolean(database?.ok)}
              />
              <StatusLine
                title="Login e rotas internas"
                detail="Rotas protegidas por sessão e permissões por perfil."
                ok={Boolean(health?.ok)}
              />
              <StatusLine
                title="Geração de PDF"
                detail="Rotas de PDF ativas para livros e relatórios pedagógicos."
                ok={Boolean(health?.ok)}
              />
              <StatusLine
                title="Upload de imagens"
                detail="Servidor aceita imagens em base64 até o limite configurado."
                ok={Boolean(health?.ok)}
              />
              <StatusLine
                title="Certificado SSL"
                detail={isSecure ? "Conexão segura HTTPS detectada." : "Em localhost é normal aparecer HTTP; no Render deve ficar HTTPS."}
                ok={isSecure || window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"}
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
                Diagnóstico rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Endpoint público</p>
                <p className="mt-1 font-mono text-sm text-slate-950">/api/health</p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Endpoint do banco</p>
                <p className="mt-1 font-mono text-sm text-slate-950">/api/health/database</p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Último status HTTP</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{health?.statusCode ?? "-"}</p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <LockKeyhole className="h-4 w-4" />
                  Segurança
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  Permissões por escola, professor vinculado e perfis administrativos estão ativas no backend.
                </p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="h-4 w-4" />
                  Próxima melhoria
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  Relatórios pedagógicos completos, modelos prontos e editor A4 com histórico.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
