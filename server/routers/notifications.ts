import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createNotification,
  deleteNotificationForUser,
  getNotificationsByUser,
  listUsers,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../db";
import { sameSchool } from "../_core/schools";

const staffRoles = new Set(["educator", "coordinator", "admin"]);

function conversationKey(userA: number, userB: number) {
  const [first, second] = [userA, userB].sort((a, b) => a - b);
  return `chat:${first}:${second}`;
}

function canChat(
  current: { id: number; role: string; schoolId?: number | null; assignedEducatorId?: number | null },
  other: { id: number; role: string; schoolId?: number | null; assignedEducatorId?: number | null }
) {
  if (current.id === other.id) return false;

  if (current.role === "admin" && other.role === "student") return true;
  if (current.role === "student" && other.role === "admin") return true;

  if (current.role === "educator" && other.role === "student") {
    return other.assignedEducatorId === current.id;
  }
  if (current.role === "student" && other.role === "educator") {
    return current.assignedEducatorId === other.id;
  }

  if (current.role === "coordinator" && other.role === "student") {
    return sameSchool(current, other);
  }
  if (current.role === "student" && other.role === "coordinator") {
    return sameSchool(current, other);
  }

  return false;
}

export const notificationsRouter = router({
  getNotifications: protectedProcedure
    .input(z.object({ limit: z.number().optional(), unreadOnly: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      return getNotificationsByUser(ctx.user.id, input.unreadOnly ?? false, input.limit ?? 50);
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const result = await getNotificationsByUser(ctx.user.id, true, 200);
    return result.length;
  }),

  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await markNotificationAsRead(input.notificationId, ctx.user.id);
      if (!result) throw new TRPCError({ code: "FORBIDDEN" });
      return result;
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    return markAllNotificationsAsRead(ctx.user.id);
  }),

  deleteNotification: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await deleteNotificationForUser(input.notificationId, ctx.user.id);
      if (!result) throw new TRPCError({ code: "FORBIDDEN" });
      return result;
    }),

  createNotification: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        type: z.enum(["info", "warning", "success", "error"]),
        title: z.string(),
        message: z.string().optional(),
        relatedEntityId: z.number().optional(),
        relatedEntityType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!["admin", "coordinator"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return createNotification({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        relatedEntityId: input.relatedEntityId,
        relatedEntityType: input.relatedEntityType,
        isRead: false,
      });
    }),

  listChatContacts: protectedProcedure.query(async ({ ctx }) => {
    const users = await listUsers();

    if (ctx.user.role === "student") {
      return users
        .filter((user) => staffRoles.has(user.role))
        .filter((user) => user.isActive !== false)
        .filter((user) => canChat(ctx.user, user))
        .map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          className: user.className,
        }));
    }

    if (staffRoles.has(ctx.user.role)) {
      return users
        .filter((user) => user.role === "student")
        .filter((user) => user.isActive !== false)
        .filter((user) => canChat(ctx.user, user))
        .map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          className: user.className,
        }));
    }

    return [];
  }),

  getConversation: protectedProcedure
    .input(z.object({ withUserId: z.number() }))
    .query(async ({ input, ctx }) => {
      const users = await listUsers();
      const other = users.find((user) => user.id === input.withUserId);
      if (!other || !canChat(ctx.user, other)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const key = conversationKey(ctx.user.id, input.withUserId);
      const notifications = await getNotificationsByUser(ctx.user.id, false, 200);
      return notifications
        .filter((notification) => notification.relatedEntityType === key)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }),

  sendChatMessage: protectedProcedure
    .input(z.object({ toUserId: z.number(), message: z.string().min(1).max(1200) }))
    .mutation(async ({ input, ctx }) => {
      const users = await listUsers();
      const recipient = users.find((user) => user.id === input.toUserId);
      if (!recipient || !canChat(ctx.user, recipient)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Conversa nao permitida para esses perfis." });
      }

      const key = conversationKey(ctx.user.id, input.toUserId);
      const senderName = ctx.user.name ?? "Equipe Lumi";
      const recipientName = recipient.name ?? "Aluno";

      const [senderCopy, recipientCopy] = await Promise.all([
        createNotification({
          userId: ctx.user.id,
          type: "info",
          title: `Para ${recipientName}`,
          message: input.message,
          relatedEntityId: ctx.user.id,
          relatedEntityType: key,
          isRead: true,
        }),
        createNotification({
          userId: input.toUserId,
          type: "info",
          title: `Mensagem de ${senderName}`,
          message: input.message,
          relatedEntityId: ctx.user.id,
          relatedEntityType: key,
          isRead: false,
        }),
      ]);

      return { senderCopy, recipientCopy };
    }),
});
