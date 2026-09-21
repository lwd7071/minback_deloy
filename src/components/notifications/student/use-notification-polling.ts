"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { NotificationDto } from "@/types/student";

type ApiResult<T> =
  { data: T; meta?: Record<string, unknown> } | { error: { message: string } };

/**
 * Custom hook polling Notification tự động mỗi 10 giây.
 * Quy tắc:
 * - Chỉ poll khi tab browser đang visible (document.visibilityState === "visible").
 * - Dừng poll ngay khi tab hidden hoặc component unmount.
 * - Fetch lại ngay lập tức khi tab chuyển từ hidden -> visible.
 */
export function useNotificationPolling() {
  const shared = useContext(NotificationPollingContext);
  if (!shared) {
    throw new Error("NotificationPollingProvider is required");
  }
  return shared;
}

type NotificationPollingState = ReturnType<
  typeof useNotificationPollingController
>;

type NotificationMessage =
  | {
      type: "snapshot";
      sequence: number;
      notifications: NotificationDto[];
      unreadCount: number;
      total: number;
    }
  | { type: "heartbeat"; sequence: number }
  | { type: "mode-demand"; pageSize: 3 | 50 }
  | { type: "mark-read"; notificationId: string };

const NotificationPollingContext =
  createContext<NotificationPollingState | null>(null);

export function NotificationPollingProvider({
  children,
  coordinationKey = "",
  enabled = true,
}: {
  children: ReactNode;
  coordinationKey?: string;
  enabled?: boolean;
}) {
  const state = useNotificationPollingController(
    false,
    coordinationKey,
    enabled,
  );
  return createElement(
    NotificationPollingContext.Provider,
    { value: state },
    children,
  );
}

function useNotificationPollingController(
  unreadOnly: boolean,
  coordinationKey: string,
  enabled: boolean,
) {
  const pathname = usePathname();
  const requestedPageSize: 3 | 50 = pathname?.includes("/notifications")
    ? 50
    : 3;

  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);
  const leaderRef = useRef(false);
  const runningRef = useRef(false);
  const sequenceRef = useRef(0);
  const lastHeartbeatRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const releaseLockRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const leaderPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pageSizeRef = useRef<3 | 50>(requestedPageSize);
  const fallbackReportedRef = useRef(false);

  const supportsCoordination =
    enabled &&
    Boolean(coordinationKey) &&
    typeof window !== "undefined" &&
    "BroadcastChannel" in window &&
    "locks" in navigator;

  const publish = useCallback((message: NotificationMessage) => {
    channelRef.current?.postMessage(message);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (inFlightRef.current) return;
    const controller = new AbortController();
    inFlightRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const url = `/api/v1/student/notifications?page=1&pageSize=${pageSizeRef.current}${unreadOnly ? "&unreadOnly=true" : ""}`;
      const res = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      const body = (await res.json()) as ApiResult<NotificationDto[]>;

      if (!res.ok || !("data" in body)) {
        throw new Error(
          "error" in body ? body.error.message : "Không thể tải thông báo",
        );
      }

      setNotifications(body.data);
      if (body.meta) {
        setUnreadCount(Number(body.meta.unreadCount ?? 0));
        setTotal(Number(body.meta.total ?? 0));
      }
      if (supportsCoordination && leaderRef.current) {
        sequenceRef.current += 1;
        publish({
          type: "snapshot",
          sequence: sequenceRef.current,
          notifications: body.data,
          unreadCount: Number(body.meta?.unreadCount ?? 0),
          total: Number(body.meta?.total ?? 0),
        });
      }
      setError(null);
    } catch (err) {
      setError(
        controller.signal.aborted
          ? "Kết nối quá lâu, vui lòng thử lại"
          : err instanceof Error
            ? err.message
            : "Lỗi kết nối",
      );
    } finally {
      window.clearTimeout(timeoutId);
      if (inFlightRef.current === controller) inFlightRef.current = null;
      setLoading(false);
    }
  }, [publish, supportsCoordination, unreadOnly]);

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(
        `/api/v1/student/notifications/${notificationId}/read`,
        {
          method: "PATCH",
        },
      );
      if (res.ok) {
        // Cập nhật local state ngay lập tức
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, readAt: new Date().toISOString() }
              : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        publish({ type: "mark-read", notificationId });
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    let initialFetchTimeout: NodeJS.Timeout | null = null;

    const runFallbackPolling = () => {
      if (
        enabled &&
        coordinationKey &&
        !fallbackReportedRef.current &&
        typeof navigator !== "undefined" &&
        (!("BroadcastChannel" in window) || !("locks" in navigator))
      ) {
        fallbackReportedRef.current = true;
        const payload = JSON.stringify({
          samples: [
            {
              buildSha: process.env.NEXT_PUBLIC_BUILD_SHA ?? "local",
              routeTemplate: window.location.pathname.includes("/notifications")
                ? "/class/[code]/notifications"
                : "/class/[code]/profile",
              actorScope: "student",
              metric: "notification_coordination_fallback",
              durationMs: 0,
              deviceClass: window.innerWidth < 768 ? "mobile" : "desktop",
              networkClass:
                (
                  navigator as Navigator & {
                    connection?: { effectiveType?: string };
                  }
                ).connection?.effectiveType ?? "unknown",
            },
          ],
        });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/v1/performance/samples", payload);
        }
      }
      pageSizeRef.current = requestedPageSize;
      initialFetchTimeout = setTimeout(() => {
        void fetchNotifications();
      }, 0);
      timerRef.current = setInterval(() => {
        if (document.visibilityState === "visible") void fetchNotifications();
      }, 10_000);
    };

    const tryBecomeLeader = () => {
      if (!supportsCoordination || document.visibilityState !== "visible")
        return;
      void navigator.locks.request(
        `minback:noti:${coordinationKey}`,
        { ifAvailable: true },
        async (lock) => {
          if (!lock || !runningRef.current) return;
          leaderRef.current = true;
          pageSizeRef.current = requestedPageSize;
          lastHeartbeatRef.current = Date.now();
          void fetchNotifications();
          leaderPollRef.current = setInterval(() => {
            if (document.visibilityState === "visible") {
              void fetchNotifications();
            }
          }, 10_000);
          heartbeatRef.current = setInterval(() => {
            sequenceRef.current += 1;
            lastHeartbeatRef.current = Date.now();
            publish({ type: "heartbeat", sequence: sequenceRef.current });
          }, 5_000);
          await new Promise<void>((resolve) => {
            releaseLockRef.current = resolve;
          });
          if (leaderPollRef.current) clearInterval(leaderPollRef.current);
          leaderPollRef.current = null;
          if (heartbeatRef.current) clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
          leaderRef.current = false;
          releaseLockRef.current = null;
        },
      );
    };

    const startPolling = () => {
      if (runningRef.current || document.visibilityState !== "visible") return;
      runningRef.current = true;
      if (!supportsCoordination) {
        runFallbackPolling();
        return;
      }
      channelRef.current = new BroadcastChannel(
        `minback:noti:${coordinationKey}`,
      );
      publish({ type: "mode-demand", pageSize: requestedPageSize });
      channelRef.current.onmessage = (
        event: MessageEvent<NotificationMessage>,
      ) => {
        const message = event.data;
        if (!isNotificationMessage(message)) return;
        if (message.type === "snapshot") {
          if (message.sequence <= sequenceRef.current) return;
          sequenceRef.current = message.sequence;
          setNotifications(message.notifications);
          setUnreadCount(message.unreadCount);
          setTotal(message.total);
          setLoading(false);
          return;
        }
        if (message.type === "heartbeat") {
          lastHeartbeatRef.current = Date.now();
          sequenceRef.current = Math.max(sequenceRef.current, message.sequence);
          return;
        }
        if (message.type === "mode-demand") {
          if (
            leaderRef.current &&
            pageSizeRef.current !== 50 &&
            message.pageSize === 50
          ) {
            pageSizeRef.current = 50;
            void fetchNotifications();
          }
          return;
        }
        setNotifications((current) =>
          current.map((notification) =>
            notification.id === message.notificationId
              ? { ...notification, readAt: new Date().toISOString() }
              : notification,
          ),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      };
      tryBecomeLeader();
      timerRef.current = setInterval(() => {
        if (
          !leaderRef.current &&
          Date.now() - lastHeartbeatRef.current > 15_000
        ) {
          tryBecomeLeader();
        }
      }, 5_000);
    };

    const stopPolling = () => {
      runningRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (initialFetchTimeout) {
        clearTimeout(initialFetchTimeout);
        initialFetchTimeout = null;
      }
      inFlightRef.current?.abort();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
      if (leaderPollRef.current) clearInterval(leaderPollRef.current);
      leaderPollRef.current = null;
      releaseLockRef.current?.();
      releaseLockRef.current = null;
      channelRef.current?.close();
      channelRef.current = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === "visible") {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    coordinationKey,
    enabled,
    fetchNotifications,
    pathname,
    publish,
    requestedPageSize,
    supportsCoordination,
  ]);

  return {
    notifications,
    unreadCount,
    total,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
  };
}

function isNotificationMessage(value: unknown): value is NotificationMessage {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  const message = value as { type?: unknown };
  if (message.type === "heartbeat") {
    return typeof (value as { sequence?: unknown }).sequence === "number";
  }
  if (message.type === "mode-demand") {
    return (
      (value as { pageSize?: unknown }).pageSize === 3 ||
      (value as { pageSize?: unknown }).pageSize === 50
    );
  }
  if (message.type === "mark-read") {
    return (
      typeof (value as { notificationId?: unknown }).notificationId === "string"
    );
  }
  if (message.type === "snapshot") {
    const snapshot = value as Partial<
      Extract<NotificationMessage, { type: "snapshot" }>
    >;
    return (
      typeof snapshot.sequence === "number" &&
      Array.isArray(snapshot.notifications) &&
      typeof snapshot.unreadCount === "number" &&
      typeof snapshot.total === "number"
    );
  }
  return false;
}
