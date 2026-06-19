import DashboardLayout from "@/components/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { MessageCircle, Send, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  student: "Aluno",
  educator: "Educador",
  coordinator: "Coordenador",
  admin: "Administrador",
};

function timeLabel(value: unknown) {
  const date = new Date(String(value ?? Date.now()));
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Messages() {
  const utils = trpc.useUtils();
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const { data: contacts = [], isLoading: contactsLoading } = trpc.notifications.listChatContacts.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (selectedContactId !== null || contacts.length === 0) return;
    setSelectedContactId(contacts[0].id);
  }, [contacts, selectedContactId]);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  );

  const { data: conversation = [], isLoading: conversationLoading } = trpc.notifications.getConversation.useQuery(
    { withUserId: selectedContactId ?? 0 },
    {
      enabled: Boolean(selectedContactId),
      refetchInterval: 5_000,
    }
  );

  const sendMutation = trpc.notifications.sendChatMessage.useMutation({
    onSuccess: async () => {
      setMessage("");
      await utils.notifications.getConversation.invalidate();
      await utils.notifications.getNotifications.invalidate();
      await utils.notifications.getUnreadCount.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Conversas</h1>
          <p className="mt-2 text-slate-600">
            Canal direto entre alunos e equipe pedagogica. A IA nao conversa com alunos.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-700" />
                Contatos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contactsLoading ? (
                <p className="text-sm text-slate-600">Carregando contatos...</p>
              ) : contacts.length === 0 ? (
                <p className="rounded-lg border border-dashed p-5 text-sm text-slate-600">
                  Nenhum contato disponivel para este perfil.
                </p>
              ) : (
                contacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSelectedContactId(contact.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                      selectedContactId === contact.id ? "border-emerald-600 bg-emerald-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.avatarUrl ?? undefined} alt={contact.name ?? "Usuario"} className="object-cover" />
                      <AvatarFallback>{contact.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-950">{contact.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {roleLabels[contact.role] ?? contact.role} {contact.className ? `- ${contact.className}` : ""}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="min-h-[560px]">
            <CardHeader className="border-b">
              {selectedContact ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={selectedContact.avatarUrl ?? undefined} alt={selectedContact.name ?? "Usuario"} className="object-cover" />
                      <AvatarFallback>{selectedContact.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{selectedContact.name}</CardTitle>
                      <p className="text-sm text-slate-600">{roleLabels[selectedContact.role] ?? selectedContact.role}</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Canal escolar
                  </Badge>
                </div>
              ) : (
                <CardTitle>Selecione um contato</CardTitle>
              )}
            </CardHeader>

            <CardContent className="flex min-h-[480px] flex-col gap-4 pt-5">
              <div className="flex-1 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-4">
                {!selectedContact ? (
                  <p className="text-sm text-slate-600">Escolha um aluno ou membro da equipe para conversar.</p>
                ) : conversationLoading ? (
                  <p className="text-sm text-slate-600">Carregando conversa...</p>
                ) : conversation.length === 0 ? (
                  <p className="text-sm text-slate-600">Nenhuma mensagem ainda. Envie a primeira orientacao.</p>
                ) : (
                  conversation.map((item) => {
                    const sentByMe = item.isRead === true && item.title?.startsWith("Para ");
                    return (
                      <div key={item.id} className={`flex ${sentByMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[78%] rounded-lg px-4 py-3 shadow-sm ${
                            sentByMe ? "bg-emerald-700 text-white" : "bg-white text-slate-900"
                          }`}
                        >
                          <p className="text-sm leading-6">{item.message}</p>
                          <p className={`mt-2 text-xs ${sentByMe ? "text-white/70" : "text-slate-500"}`}>
                            {timeLabel(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-3">
                <Textarea
                  rows={3}
                  placeholder="Escreva uma mensagem curta, clara e humana..."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={!selectedContact}
                />
                <div className="flex justify-end">
                  <Button
                    className="bg-emerald-700 hover:bg-emerald-800"
                    disabled={!selectedContact || !message.trim() || sendMutation.isPending}
                    onClick={() => {
                      if (!selectedContact || !message.trim()) return;
                      sendMutation.mutate({ toUserId: selectedContact.id, message: message.trim() });
                    }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
