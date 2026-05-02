import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  timestamp: string;
  read: boolean;
  icon?: "task" | "payment" | "expense" | "info";
};

type NotificationsCtx = {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
};

const NotificationsContext = createContext<NotificationsCtx | null>(null);
const STORAGE_KEY = "noma-notifications";
const MAX = 40;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setNotifications(JSON.parse(raw));
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((n: Omit<AppNotification, "id" | "timestamp" | "read">) => {
    const now = Date.now();
    setNotifications((prev) => {
      const dup = prev.find(
        (p) => p.title === n.title && p.body === n.body && now - new Date(p.timestamp).getTime() < 10_000,
      );
      if (dup) return prev;
      return [{ ...n, id: `notif-${now}`, timestamp: new Date().toISOString(), read: false }, ...prev].slice(0, MAX);
    });
  }, []);

  const markRead    = useCallback((id: string) => setNotifications((p) => p.map((n) => n.id === id ? { ...n, read: true } : n)), []);
  const markAllRead = useCallback(() => setNotifications((p) => p.map((n) => ({ ...n, read: true }))), []);
  const clearAll    = useCallback(() => setNotifications([]), []);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, addNotification, markRead, markAllRead, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationsProvider");
  return ctx;
}
