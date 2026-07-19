import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePageSeo } from "@/lib/seo";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BookOpen, Library, LogIn, PenLine } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const quotes = [
  "Escrever e transformar pensamentos em futuro.",
  "Cada pagina escrita e uma nova descoberta.",
  "Nas paginas, o aluno encontra sua voz.",
  "Toda historia comeca quando alguem decide continuar.",
];

export default function Home() {
  const [, navigate] = useLocation();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const { data: publications = [], isLoading } = trpc.library.getPublishedBooks.useQuery({});
  const featured = publications.slice(0, 3);

  usePageSeo({
    title: "Lumi Educa | Autoria estudantil e biblioteca digital",
    description: "Portal Lumi Educa para escrita, acompanhamento pedagogico e publicacao de livros estudantis.",
    canonicalPath: "/",
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % quotes.length);
    }, 4800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="lumi-public-shell min-h-screen text-[#13251D]">
      <header className="sticky top-0 z-50 border-b border-[#0F3D2E]/10 bg-white/94 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate("/")} className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6DB33F]">
            <BrandLogo compact />
          </button>
          <nav className="flex items-center gap-2" aria-label="Navegacao principal">
            <Button variant="ghost" className="hidden gap-2 text-[#0F3D2E] hover:bg-[#EEF4E3] sm:inline-flex" onClick={() => navigate("/library")}>
              <Library className="h-4 w-4" />
              Biblioteca
            </Button>
            <Button className="gap-2 bg-[#0F3D2E] font-bold text-white hover:bg-[#18513D]" onClick={() => navigate("/login")}>
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="lumi-public-hero border-b border-[#0F3D2E]/10">
          <div className="mx-auto grid min-h-[76vh] max-w-7xl gap-12 px-4 py-14 sm:px-6 md:py-18 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.75fr)] lg:items-center lg:px-8">
            <div className="max-w-3xl">
              <Badge className="border border-[#266B3D]/20 bg-white px-3 py-1 text-[#266B3D] shadow-sm hover:bg-white">
                Plataforma escolar
              </Badge>
              <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-normal text-[#0F3D2E] sm:text-6xl lg:text-7xl">
                Lumi <span className="text-[#5AAE35]">educa</span>
              </h1>
              <div className="mt-7 min-h-20 max-w-2xl border-l-4 border-[#F4C430] pl-5" aria-live="polite">
                <p className="text-xl font-semibold leading-8 text-slate-700 sm:text-2xl">{quotes[quoteIndex]}</p>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 gap-2 bg-[#0F3D2E] px-7 font-black text-white hover:bg-[#18513D]" onClick={() => navigate("/login")}>
                  Acessar plataforma
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 gap-2 border-[#0F3D2E]/20 bg-white px-7 font-bold text-[#0F3D2E] hover:bg-[#EEF4E3]" onClick={() => navigate("/library")}>
                  <BookOpen className="h-5 w-5" />
                  Ler livros
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
                <span className="inline-flex items-center gap-2"><PenLine className="h-4 w-4 text-[#266B3D]" />Escrita</span>
                <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-[#266B3D]" />Avaliacao</span>
                <span className="inline-flex items-center gap-2"><Library className="h-4 w-4 text-[#266B3D]" />Publicacao</span>
              </div>
            </div>

            <aside className="lumi-bookcase" aria-label="Publicacoes recentes">
              <div className="flex items-end justify-between gap-4 border-b border-white/16 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F4C430]">Biblioteca digital</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Novas historias</h2>
                </div>
                <span className="text-sm font-bold text-white/70">{isLoading ? "..." : publications.length}</span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {featured.length > 0
                  ? featured.map((publication) => {
                      const book = publication.book;
                      if (!book) return null;
                      return (
                        <button
                          key={publication.id}
                          type="button"
                          onClick={() => navigate(`/library/book/${book.id}`)}
                          className="group min-w-0 text-left"
                          title={`Ler ${book.title}`}
                        >
                          <span className="block aspect-[3/4] overflow-hidden rounded-md border border-white/18 bg-[#F7F3E9] shadow-xl transition-transform group-hover:-translate-y-1">
                            {book.coverImageUrl ? (
                              <img src={book.coverImageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full items-center justify-center bg-[#F7F3E9] text-[#0F3D2E]"><BookOpen className="h-8 w-8" /></span>
                            )}
                          </span>
                          <span className="mt-2 block truncate text-xs font-bold text-white">{book.title}</span>
                        </button>
                      );
                    })
                  : [0, 1, 2].map((item) => (
                      <span key={item} className="flex aspect-[3/4] items-center justify-center rounded-md border border-white/16 bg-white/8 text-white/45">
                        <BookOpen className="h-7 w-7" />
                      </span>
                    ))}
              </div>
              <Button variant="ghost" className="mt-5 w-full gap-2 border border-white/14 text-white hover:bg-white/10 hover:text-white" onClick={() => navigate("/library")}>
                Abrir biblioteca
                <ArrowRight className="h-4 w-4" />
              </Button>
            </aside>
          </div>
        </section>
      </main>

      <footer className="bg-white px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-slate-500 sm:flex-row sm:items-center">
          <BrandLogo compact />
          <p>2026 Lumi Educa</p>
        </div>
      </footer>
    </div>
  );
}
