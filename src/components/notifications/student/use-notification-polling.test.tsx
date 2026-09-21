import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  NotificationPollingProvider,
  useNotificationPolling,
} from "./use-notification-polling";

function Consumer({ label }: { label: string }) {
  const { unreadCount } = useNotificationPolling();
  return <output aria-label={label}>{unreadCount}</output>;
}

describe("student notification polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], meta: { unreadCount: 2, total: 2 } }),
      }),
    );
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shares one poller across header and workspace consumers", async () => {
    render(
      <NotificationPollingProvider>
        <Consumer label="header" />
        <Consumer label="workspace" />
      </NotificationPollingProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("header")).toHaveTextContent("2");
    expect(screen.getByLabelText("workspace")).toHaveTextContent("2");
  });

  it("does not start a second interval when visibility becomes visible repeatedly", async () => {
    render(
      <NotificationPollingProvider>
        <Consumer label="header" />
      </NotificationPollingProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      document.dispatchEvent(new Event("visibilitychange"));
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("leader polls again after the initial coordinated fetch", async () => {
    class FakeChannel {
      onmessage: ((event: MessageEvent) => void) | null = null;
      postMessage = vi.fn();
      close = vi.fn();
    }
    vi.stubGlobal("BroadcastChannel", FakeChannel);
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: vi.fn(async (_name, _options, callback) =>
          callback({ name: "notification-lock" }),
        ),
      },
    });

    render(
      <NotificationPollingProvider coordinationKey="test-key">
        <Consumer label="header" />
      </NotificationPollingProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
