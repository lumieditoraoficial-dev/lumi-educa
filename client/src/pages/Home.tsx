import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, BookOpen, FileCheck2, Library, Sparkles, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const features = [
  {
    title: "Escrita guiada",
    description: "Editor com paginas, capitulos, autosave e leitura final em formato de ebook.",
    icon: BookOpen,
  },
  {
    title: "Revisao pedagogica",
    description: "Educadores avaliam por etapas, com notas, feedbacks e historico de evolucao.",
    icon: FileCheck2,
  },
  {
    title: "Publicacao estudantil",
    description: "Editor prepara capa, acabamento e libera a obra para a biblioteca digital.",
    icon: Library,
  },
  {
    title: "IA protegida",
    description: "Apoio interno para equipe, sem chat com alunos e sem respostas prontas.",
    icon: Sparkles,
  },
  {
    title: "Metas de temporada",
    description: "Paginas por semana, desempenho por turma e relatorios mensais de progresso.",
    icon: Trophy,
  },
  {
    title: "Gestao escolar",
    description: "Perfis, turmas, acessos, conversas e paineis separados por responsabilidade.",
    icon: Users,
  },
];

const quotes = [
  "A escrita tambem tem torcida: cada pagina empurra o aluno para frente.",
  "Quando a escola abre espaco para autoria, o aluno entra em campo com voz propria.",
  "Do caderno ao ebook, cada texto pode virar conquista.",
  "Uma boa historia nasce pequena, treina todos os dias e chega pronta para ser lida.",
];

const journey = [
  ["1", "Ideia", "O aluno cria o titulo, organiza capitulos e comeca a escrever."],
  ["2", "Treino", "A plataforma acompanha paginas, palavras, metas e progresso diario."],
  ["3", "Revisao", "Educador e coordenador avaliam com notas, feedbacks e criterio pedagogico."],
  ["4", "Publicacao", "O editor finaliza capa, PDF e libera o livro na biblioteca."],
];

export default function Home() {
  const [, navigate] = useLocation();
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % quotes.length);
    }, 4800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F7EB] text-[#0F3D2E]">
      <nav className="sticky top-0 z-50 border-b border-[#0F3D2E]/10 bg-[#F8F7EB]/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate("/")} className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#123C8C]">
            <BrandLogo showTagline />
          </button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-[#0F3D2E]/20 bg-white/70 text-[#0F3D2E] hover:bg-white"
              onClick={() => navigate("/library")}
            >
              Biblioteca
            </Button>
            <Button className="bg-[#F4C430] font-bold text-[#0F3D2E] hover:bg-[#ffdc3b]" onClick={() => navigate("/login")}>
              Entrar
            </Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative isolate overflow-hidden text-[#F7F3E9]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/lumi-hero-dashboard.jpg')" }}
          />
          <div className="absolute inset-0 lumi-cup-surface" />
          <div className="absolute inset-0 lumi-field-lines opacity-70" />
          <div className="absolute -left-16 top-20 h-48 w-48 rotate-12 bg-[#F4C430]/90 lumi-diamond" />
          <div className="absolute right-8 top-24 h-32 w-32 rotate-12 bg-[#123C8C]/85 lumi-diamond" />
          <div className="absolute bottom-10 right-1/4 h-24 w-24 rounded-full border-[14px] border-white/16" />

          <div className="relative mx-auto grid min-h-[calc(100vh-84px)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div>
              <div className="mb-8">
                <BrandLogo inverted showTagline markClassName="bg-[#F7F3E9]" />
              </div>
              <p className="mb-4 inline-flex rounded-full border border-[#F4C430]/45 bg-[#F4C430]/14 px-4 py-2 text-sm font-semibold uppercase tracking-[0.22em] text-[#F4C430]">
                Temporada Brasil da escrita
              </p>
              <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-normal sm:text-6xl lg:text-7xl">
                Cada aluno em campo com a propria historia.
              </h1>
              <p className="mt-7 max-w-2xl text-xl leading-8 text-[#F7F3E9]/88 sm:text-2xl sm:leading-9">
                O Lumi Educa transforma producao textual em uma jornada viva: escrever, revisar, evoluir e publicar livros digitais.
              </p>
              <div className="mt-8 min-h-[4.25rem] max-w-2xl rounded-lg border border-white/14 bg-white/10 p-4 backdrop-blur">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F4C430]">Frase da rodada</p>
                <p className="mt-2 text-lg leading-7 text-white">{quotes[quoteIndex]}</p>
              </div>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="h-12 bg-[#F4C430] px-7 font-bold text-[#0F3D2E] hover:bg-[#ffdc3b]"
                  onClick={() => navigate("/login")}
                >
                  Acessar plataforma
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/45 bg-transparent px-7 text-white hover:bg-white/10"
                  onClick={() => navigate("/signup")}
                >
                  Cadastrar usuario
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-lg border border-white/16 bg-white/12 p-5 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-[#F4C430]">Placar pedagógico</p>
                    <h2 className="mt-2 text-3xl font-bold text-white">Ideia 1 x 0 Papel em branco</h2>
                  </div>
                  <Award className="h-10 w-10 text-[#F4C430]" />
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Livros", "criados"],
                    ["Notas", "0 a 10"],
                    ["PDF", "baixavel"],
                  ].map(([value, label]) => (
                    <div key={value} className="rounded-md border border-white/14 bg-white/10 p-3">
                      <p className="text-2xl font-bold text-white">{value}</p>
                      <p className="text-sm text-white/68">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {journey.map(([number, title, description]) => (
                  <article key={number} className="rounded-lg border border-white/16 bg-white/10 p-4 backdrop-blur">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#F4C430] font-bold text-[#0F3D2E]">
                      {number}
                    </div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/72">{description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#F8F7EB] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#123C8C]">Organizacao de campeonato</p>
                <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal text-[#0F3D2E]">
                  Um projeto escolar bonito por fora, serio por dentro.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-[#0F3D2E]/70">
                A plataforma separa papeis, protege os alunos da IA direta e entrega leitura, avaliacao e gestao em um unico fluxo.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="lumi-cup-card rounded-lg p-6">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-[#F4C430] text-[#0F3D2E] shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#0F3D2E]">{feature.title}</h3>
                    <p className="mt-3 leading-7 text-[#0F3D2E]/68">{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#0F3D2E]/10 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-[#0F3D2E]/65 md:flex-row md:items-center">
          <BrandLogo compact />
          <p>2026 Lumi Educa. Escrita, avaliacao e publicacao estudantil.</p>
        </div>
      </footer>
    </div>
  );
}
