import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { usePageSeo } from "@/lib/seo";
import { ArrowRight, BookOpen, Building2, Library, LockKeyhole, PenLine, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const quotes = [
  "Escrever e transformar pensamentos em futuro.",
  "Cada pagina escrita e uma nova descoberta.",
  "Nas paginas, o aluno encontra sua voz.",
  "Toda historia comeca quando alguem decide continuar.",
];

const accessCards = [
  {
    title: "Entrar",
    label: "Entrar",
    path: "/login",
    icon: LockKeyhole,
  },
  {
    title: "Biblioteca digital",
    label: "Ler obras",
    path: "/library",
    icon: Library,
  },
  {
    title: "Area da escola",
    label: "Acesso oficial",
    path: "/login",
    icon: Building2,
  },
];

const officialFlow = [
  { label: "Escrita", icon: PenLine },
  { label: "Acompanhamento", icon: ShieldCheck },
  { label: "Publicacao", icon: BookOpen },
];

export default function Home() {
  const [, navigate] = useLocation();
  const [quoteIndex, setQuoteIndex] = useState(0);
  usePageSeo({
    title: "Lumi Educa | Autoria estudantil e biblioteca digital",
    description: "Lumi Educa e o portal de autoria estudantil para escrita de livros, acompanhamento pedagogico e biblioteca digital escolar.",
    canonicalPath: "/",
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % quotes.length);
    }, 4800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F7EB] text-[#0F3D2E]">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/12 bg-[#06271f]/66 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate("/")} className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C430]">
            <BrandLogo inverted compact />
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="hidden text-white/86 hover:bg-white/10 hover:text-white sm:inline-flex" onClick={() => navigate("/library")}>
              Biblioteca
            </Button>
            <Button className="bg-[#F4C430] font-bold text-[#0F3D2E] hover:bg-[#ffdc3b]" onClick={() => navigate("/login")}>
              Entrar
            </Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="lumi-hero-stage relative isolate min-h-screen text-[#F7F3E9]">
          <div className="absolute inset-0 bg-cover bg-center opacity-[0.46]" style={{ backgroundImage: "url('/lumi-hero-dashboard.jpg')" }} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,16,13,0.92),rgba(6,36,25,0.8)_48%,rgba(5,20,45,0.68))]" />

          <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 pb-12 pt-24 sm:px-6 lg:px-8">
            <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center">
              <section className="max-w-4xl">
                <div className="mb-7">
                  <BrandLogo inverted showTagline />
                </div>
                <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl">
                  Lumi Educa
                </h1>

                <div className="mt-8 min-h-[4.5rem] max-w-2xl border-l-4 border-[#F4C430] pl-5">
                  <p className="mt-2 text-lg leading-7 text-white">{quotes[quoteIndex]}</p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" className="h-12 bg-[#F4C430] px-7 font-black text-[#0F3D2E] hover:bg-[#ffdc3b]" onClick={() => navigate("/login")}>
                    Entrar na conta
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 border-white/45 bg-white/8 px-7 font-bold text-white hover:bg-white/14"
                    onClick={() => navigate("/library")}
                  >
                    Biblioteca digital
                  </Button>
                </div>

                <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
                  {officialFlow.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-lg border border-white/14 bg-white/10 p-4 backdrop-blur">
                        <Icon className="h-5 w-5 text-[#F4C430]" />
                        <p className="mt-3 font-black text-white">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <aside className="lumi-glass-panel rounded-lg p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="mt-2 text-2xl font-black text-white">Portal da escola</h2>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#F4C430] text-[#0F3D2E]">
                    <BookOpen className="h-7 w-7" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {accessCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={card.title}
                        type="button"
                        onClick={() => navigate(card.path)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/14 bg-white/10 p-4 text-left transition hover:border-[#F4C430]/60 hover:bg-white/16"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#0F3D2E]">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span>
                            <span className="block font-bold text-white">{card.title}</span>
                            <span className="text-sm text-white/65">{card.label}</span>
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-[#F4C430]" />
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-lg bg-[#F4C430] p-4 text-sm font-black uppercase tracking-[0.16em] text-[#0F3D2E]">
                  Acesso escolar ativo
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#0F3D2E]/10 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-[#0F3D2E]/65 md:flex-row md:items-center">
          <BrandLogo compact />
          <p>2026 Lumi Educa.</p>
        </div>
      </footer>
    </div>
  );
}
