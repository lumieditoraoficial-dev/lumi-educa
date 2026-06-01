import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bold, Heading1, Italic, List, Quote, Save, Type } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function stripHtml(content: string) {
  return content.replace(/<[^>]*>/g, " ");
}

function countWords(content: string) {
  return stripHtml(content).trim().split(/\s+/).filter(Boolean).length;
}

function parseSavedContent(savedContent: string) {
  if (typeof window === "undefined" || !savedContent.includes("data-lumi-page-content")) {
    return { html: savedContent, fontSize: 16 };
  }

  const documentParser = new DOMParser();
  const parsed = documentParser.parseFromString(savedContent, "text/html");
  const wrapper = parsed.querySelector("[data-lumi-page-content]") as HTMLElement | null;
  const parsedFontSize = Number.parseInt(wrapper?.style.fontSize ?? "", 10);

  return {
    html: wrapper?.innerHTML ?? savedContent,
    fontSize: Number.isFinite(parsedFontSize) ? parsedFontSize : 16,
  };
}

function serializeContent(html: string, fontSize: number) {
  return `<div data-lumi-page-content="true" style="font-size: ${fontSize}px;">${html}</div>`;
}

export default function PageEditor() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const pageId = Number(params.get("pageId"));
  const bookId = Number(params.get("bookId"));
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utils = trpc.useUtils();
  const { data: book } = trpc.books.getBook.useQuery({ bookId }, { enabled: Boolean(bookId) });
  const { data: pages = [] } = trpc.books.getPages.useQuery({ bookId }, { enabled: Boolean(bookId) });
  const updatePageMutation = trpc.books.updatePageContent.useMutation();
  const currentPage = pages.find((page) => page.id === pageId);
  const canEdit = user?.role === "student" && book?.status !== "published";

  useEffect(() => {
    if (!currentPage) return;
    const nextContent = currentPage.content ?? "";
    const parsedContent = parseSavedContent(nextContent);
    setTitle(currentPage.title ?? "");
    setContent(parsedContent.html);
    setFontSize(parsedContent.fontSize);
    setWordCount(countWords(parsedContent.html));
    if (editorRef.current) {
      editorRef.current.style.fontSize = `${parsedContent.fontSize}px`;
    }
    if (editorRef.current && editorRef.current.innerHTML !== parsedContent.html) {
      editorRef.current.innerHTML = parsedContent.html;
    }
  }, [currentPage]);

  const handleSave = useCallback(
    async (contentToSave = content, titleToSave = title, showToast = true, fontSizeToSave = fontSize) => {
      if (!pageId || !bookId || !canEdit) return;

      setIsSaving(true);
      try {
        await updatePageMutation.mutateAsync({
          pageId,
          title: titleToSave,
          content: serializeContent(contentToSave, fontSizeToSave),
        });
        await utils.books.getPages.invalidate({ bookId });
        setLastSavedAt(new Date());
        if (showToast) toast.success("Página salva.");
      } catch {
        toast.error("Erro ao salvar página.");
      } finally {
        setIsSaving(false);
      }
    },
    [bookId, canEdit, content, fontSize, pageId, title, updatePageMutation, utils.books.getPages]
  );

  const scheduleAutoSave = (nextContent = content, nextTitle = title, nextFontSize = fontSize) => {
    if (!canEdit) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(nextContent, nextTitle, false, nextFontSize);
    }, 1800);
  };

  const syncEditorContent = () => {
    const html = editorRef.current?.innerHTML ?? "";
    setContent(html);
    setWordCount(countWords(html));
    scheduleAutoSave(html, title);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    scheduleAutoSave(content, newTitle);
  };

  const handleFontSizeChange = (value: string) => {
    const nextFontSize = Math.min(48, Math.max(10, Number(value) || 16));
    setFontSize(nextFontSize);
    if (editorRef.current) {
      editorRef.current.style.fontSize = `${nextFontSize}px`;
    }
    scheduleAutoSave(editorRef.current?.innerHTML ?? content, title, nextFontSize);
  };

  const runCommand = (command: string, value?: string) => {
    if (!canEdit) return;
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
    syncEditorContent();
  };

  const keepEditorSelection = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  if (loading || !user) {
    return <div className="p-8">Carregando...</div>;
  }

  if (!bookId || !pageId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="p-8 text-center">
          <p className="font-medium text-slate-800">Página inválida.</p>
          <Button className="mt-4" onClick={() => navigate("/dashboard/student")}>
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-50 border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await handleSave(editorRef.current?.innerHTML ?? content, title, false);
                  navigate(`/books/${bookId}/pages`);
                }}
              >
                <ArrowLeft size={20} />
              </Button>
              <Input
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                onBlur={() => canEdit && handleSave(editorRef.current?.innerHTML ?? content, title, false)}
                readOnly={!canEdit}
                placeholder="Título da página"
                className="min-w-0 border-0 bg-transparent text-lg font-semibold shadow-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm text-slate-600">
                {wordCount} palavras
                {isSaving ? " • salvando" : lastSavedAt ? ` • salvo ${lastSavedAt.toLocaleTimeString("pt-BR")}` : ""}
              </div>
              {canEdit ? (
                <Button
                  onClick={() => handleSave(editorRef.current?.innerHTML ?? content)}
                  disabled={isSaving}
                  className="gap-2 bg-emerald-700 hover:bg-emerald-800"
                >
                  <Save size={16} />
                  Salvar
                </Button>
              ) : (
                <Badge variant="outline">Somente leitura</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 p-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit}
              aria-label="Negrito"
              title="Negrito"
              onMouseDown={keepEditorSelection}
              onClick={() => runCommand("bold")}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit}
              aria-label="Italico"
              title="Italico"
              onMouseDown={keepEditorSelection}
              onClick={() => runCommand("italic")}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit}
              aria-label="Titulo"
              title="Titulo"
              onMouseDown={keepEditorSelection}
              onClick={() => runCommand("formatBlock", "h2")}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit}
              aria-label="Lista"
              title="Lista"
              onMouseDown={keepEditorSelection}
              onClick={() => runCommand("insertUnorderedList")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit}
              aria-label="Citacao"
              title="Citacao"
              onMouseDown={keepEditorSelection}
              onClick={() => runCommand("formatBlock", "blockquote")}
            >
              <Quote className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 pl-2 text-sm text-slate-600">
              <Type className="h-4 w-4" />
              <Input
                type="number"
                disabled={!canEdit}
                min={10}
                max={48}
                step={1}
                value={fontSize}
                aria-label="Tamanho da letra em pixels"
                title="Tamanho da letra em pixels"
                onChange={(event) => handleFontSizeChange(event.target.value)}
                className="h-9 w-20 bg-white text-sm"
              />
              <span className="text-xs font-medium text-slate-500">px</span>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mx-auto min-h-[78vh] max-w-[816px] rounded-sm border bg-white px-10 py-12 shadow-sm md:px-16">
          <div
            ref={editorRef}
            contentEditable={canEdit}
            suppressContentEditableWarning
            onInput={syncEditorContent}
            onBlur={() => canEdit && handleSave(editorRef.current?.innerHTML ?? content, title, false)}
            className="prose prose-slate min-h-[64vh] max-w-none text-base leading-8 outline-none"
            style={{ fontSize }}
            data-placeholder="Comece a escrever sua história..."
          />
        </div>
      </main>
    </div>
  );
}
