import { fetchApi } from "../api";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  targetType?: string;
  targetId?: string;
}

interface NotificationResponse extends Omit<Notification, "createdAt"> {
  sentAt: string;
}

export async function getMyNotifications(
  unread?: boolean,
): Promise<Notification[]> {
  const notifications = await fetchApi<NotificationResponse[]>(
    `/notifications${unread ? "?unread=true" : ""}`,
  );
  return notifications.map((notification) => ({
    ...notification,
    createdAt: notification.sentAt,
  }));
}

export async function countUnread(): Promise<{ count: number }> {
  const result = await fetchApi<{ unread: number }>("/notifications/count");
  return { count: result.unread };
}

export function markRead(id: string) {
  return fetchApi(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllRead() {
  return fetchApi("/notifications/read-all", { method: "PATCH" });
}
