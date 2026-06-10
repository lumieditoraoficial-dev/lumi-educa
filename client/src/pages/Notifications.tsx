import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bell, CheckCheck, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const typeClassName: Record<string, string> = {
  info: "bg-sky-100 text-sky-800",
  warning: "bg-amber-100 text-amber-800",
  success: "bg-emerald-100 text-emerald-800",
  error: "bg-red-100 text-red-800",
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

export default function Notifications() {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const { data: notifications = [], isLoading } = trpc.notifications.getNotifications.useQuery(
    { limit: 80 },
    { refetchInterval: 15_000 }
  );
  const { data: unreadCount = 0 } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.getNotifications.invalidate();
      await utils.notifications.getUnreadCount.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const markAllMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: async () => {
      toast.success("Notificacoes marcadas como lidas.");
      await utils.notifications.getNotifications.invalidate();
      await utils.notifications.getUnreadCount.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.notifications.deleteNotification.useMutation({
    onSuccess: async () => {
      await utils.notifications.getNotifications.invalidate();
      await utils.notifications.getUnreadCount.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Notificações</h1>
            <p className="mt-2 text-slate-600">
              Avisos, mensagens, devolutivas, aprovacoes e lembretes de acesso diario.
            </p>
          </div>
          <Button variant="outline" disabled={markAllMutation.isPending || unreadCount === 0} onClick={() => markAllMutation.mutate()}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar tudo como lido
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="text-sm text-slate-600">Nao lidas</p>
                <p className="mt-1 text-3xl font-bold text-slate-950">{unreadCount}</p>
              </div>
              <Bell className="h-8 w-8 text-emerald-700" />
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <p className="font-medium text-slate-950">Acesso diário</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Quando o usuario entra na plataforma, o acesso do dia fica registrado automaticamente. Sabado e domingo
                nao contam como obrigatorios.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Central de avisos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-slate-600">Carregando notificacoes...</p>
            ) : notifications.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-slate-600">
                Nenhuma notificacao por enquanto.
              </p>
            ) : (
              notifications.map((notification) => {
                const isChat = notification.relatedEntityType?.startsWith("chat:");
                return (
                  <div
                    key={notification.id}
                    className={`rounded-lg border p-4 ${notification.isRead ? "bg-white" : "border-emerald-200 bg-emerald-50"}`}
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={typeClassName[notification.type] ?? typeClassName.info}>
                            {notification.type}
                          </Badge>
                          {!notification.isRead ? <Badge className="bg-emerald-700 text-white">Nova</Badge> : null}
                          {isChat ? (
                            <Badge variant="outline">
                              <MessageCircle className="mr-1 h-3 w-3" />
                              Conversa
                            </Badge>
                          ) : null}
                        </div>
                        <h2 className="mt-3 font-semibold text-slate-950">{notification.title}</h2>
                        {notification.message ? (
                          <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-slate-500">{timeLabel(notification.createdAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isChat ? (
                          <Button size="sm" variant="outline" onClick={() => navigate("/messages")}>
                            Abrir conversa
                          </Button>
                        ) : null}
                        {!notification.isRead ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={markAsReadMutation.isPending}
                            onClick={() => markAsReadMutation.mutate({ notificationId: notification.id })}
                          >
                            Lida
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate({ notificationId: notification.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
