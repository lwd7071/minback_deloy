"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type Props = { sampleRate: number; buildSha: string };

function routeTemplate(pathname: string): string | null {
  if (pathname === "/") return "/";
  if (pathname === "/admin/classes" || pathname.startsWith("/admin/classes/"))
    return "/admin/classes";
  if (pathname === "/admin/settings") return "/admin/settings";
  if (/^\/class\/[^/]+\/profile$/.test(pathname))
    return "/class/[code]/profile";
  if (/^\/class\/[^/]+\/grades$/.test(pathname)) return "/class/[code]/grades";
  if (/^\/class\/[^/]+\/notifications$/.test(pathname))
    return "/class/[code]/notifications";
  return null;
}

function actorScope(pathname: string): "public" | "teacher" | "student" {
  if (pathname.startsWith("/admin")) return "teacher";
  if (pathname.startsWith("/class/")) return "student";
  return "public";
}

export function PerformanceReporter({ sampleRate, buildSha }: Props) {
  const pathname = usePathname();
  const reportedPath = useRef<string | null>(null);

  useEffect(() => {
    const template = routeTemplate(pathname);
    if (!template || reportedPath.current === pathname) return;
    reportedPath.current = pathname;
    if (Math.random() > sampleRate) return;

    const samples: Array<{ metric: string; durationMs: number }> = [];
    let clsValue = 0;
    let sent = false;
    const observers: PerformanceObserver[] = [];
    const observe = (
      type: string,
      callback: (entry: PerformanceEntry) => void,
      options?: PerformanceObserverInit & { durationThreshold?: number },
    ) => {
      if (!("PerformanceObserver" in window)) return;
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) callback(entry);
        });
        observer.observe({
          type,
          buffered: true,
          ...options,
        } as PerformanceObserverInit);
        observers.push(observer);
      } catch {
        // Unsupported Web Vital entry types are optional.
      }
    };
    observe("largest-contentful-paint", (entry) => {
      samples.push({ metric: "web_vital_lcp", durationMs: entry.startTime });
    });
    observe("layout-shift", (entry) => {
      const layoutShift = entry as PerformanceEntry & {
        hadRecentInput?: boolean;
        value?: number;
      };
      if (!layoutShift.hadRecentInput) clsValue += layoutShift.value ?? 0;
    });
    observe(
      "event",
      (entry) => {
        const eventEntry = entry as PerformanceEntry & { duration?: number };
        samples.push({
          metric: "web_vital_inp",
          durationMs: eventEntry.duration ?? 0,
        });
      },
      { durationThreshold: 40 },
    );

    const send = () => {
      if (sent) return;
      sent = true;
      const navigation = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      const common = {
        buildSha,
        routeTemplate: template,
        actorScope: actorScope(pathname),
        deviceClass: window.innerWidth < 768 ? "mobile" : "desktop",
        networkClass:
          (navigator as Navigator & { connection?: { effectiveType?: string } })
            .connection?.effectiveType ?? "unknown",
      };
      const telemetrySamples = [
        {
          ...common,
          metric: "route_navigation",
          durationMs: Math.round(
            navigation?.loadEventEnd ||
              navigation?.domContentLoadedEventEnd ||
              0,
          ),
        },
        ...samples.slice(-10).map((sample) => ({ ...common, ...sample })),
        ...(clsValue > 0
          ? [{ ...common, metric: "web_vital_cls", durationMs: clsValue }]
          : []),
      ];
      const body = JSON.stringify({ samples: telemetrySamples });
      if (!navigator.sendBeacon("/api/v1/performance/samples", body)) {
        void fetch("/api/v1/performance/samples", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          keepalive: true,
        });
      }
    };
    const id = window.setTimeout(send, 2_000);
    window.addEventListener("pagehide", send, { once: true });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("pagehide", send);
      for (const observer of observers) observer.disconnect();
      send();
    };
  }, [buildSha, pathname, sampleRate]);

  return null;
}
