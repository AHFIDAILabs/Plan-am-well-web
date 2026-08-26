"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPut, apiDelete } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { useToast } from "@/context/ToastContext";
import { AppNotification } from "@/lib/types";

interface NotificationContextValue {
  notifications: AppNotification[] | null;
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: null,
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  refresh: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAnonymous } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const canReceive = !!user && !isAnonymous;

  const fetchNotifications = useCallback(() => {
    apiGet<{ success: boolean; data?: AppNotification[] }>("/api/notifications").then(({ data }) => {
      if (data.success && data.data) setNotifications(data.data);
    });
  }, []);

  const fetchUnreadCount = useCallback(() => {
    apiGet<{ success: boolean; data?: { count: number } }>("/api/notifications/unread-count").then(({ data }) => {
      if (data.success && data.data) setUnreadCount(data.data.count);
    });
  }, []);

  const refresh = useCallback(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    if (!canReceive) {
      setNotifications(null);
      setUnreadCount(0);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReceive, user?.id]);

  useEffect(() => {
    if (!socket || !canReceive) return;

    function handleNewNotification(notification: AppNotification) {
      setNotifications((prev) => {
        if (!prev) return [notification];
        if (prev.some((n) => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });
      if (!notification.isRead) {
        setUnreadCount((prev) => prev + 1);
        // Incoming-call notifications (notifyCallStarted, metadata.autoJoin)
        // arrive alongside the live "incoming-call" socket event that pops
        // the accept/decline modal — but that modal only exists for the
        // instant the ring is active. Making this toast clickable gives a
        // second, more durable way in: it deep-links straight into the call
        // room, which does the same thing accepting from the modal would.
        const appointmentId = notification.metadata?.appointmentId;
        const isIncomingCall = notification.metadata?.autoJoin && appointmentId;
        toast({
          title: notification.title,
          description: notification.message,
          variant: notification.type === "comment_flagged" ? "error" : "default",
          onClick: isIncomingCall
            ? () => {
                const base = user?.role === "Doctor" ? "/provider" : "/app";
                router.push(`${base}/appointments/${appointmentId}/call`);
              }
            : undefined,
        });
      }
    }

    // Reconnects can happen after a dropped connection missed events —
    // resync from the server rather than trusting only what streamed in.
    function handleReconnect() {
      refresh();
    }

    socket.on("notification", handleNewNotification);
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("notification", handleNewNotification);
      socket.off("connect", handleReconnect);
    };
  }, [socket, canReceive, refresh, toast, router, user?.role]);

  async function markAsRead(id: string) {
    await apiPut(`/api/notifications/${id}/read`);
    setNotifications((prev) => prev?.map((n) => (n._id === id ? { ...n, isRead: true } : n)) ?? null);
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    await apiPut("/api/notifications/read-all");
    setNotifications((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
    setUnreadCount(0);
  }

  async function deleteNotification(id: string) {
    const wasUnread = notifications?.find((n) => n._id === id)?.isRead === false;
    await apiDelete(`/api/notifications/${id}`);
    setNotifications((prev) => prev?.filter((n) => n._id !== id) ?? null);
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  return useContext(NotificationContext);
}
