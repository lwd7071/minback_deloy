"use client";

import Link from "next/link";
export { useLinkStatus } from "next/link";
import {
  useCallback,
  useRef,
  type AnchorHTMLAttributes,
  type PointerEvent,
} from "react";

type IntentPrefetchLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & { href: string };

function isSlowConnection() {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  return (
    connection?.saveData === true ||
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "slow-2g"
  );
}

export function IntentPrefetchLink({
  href,
  onPointerEnter,
  onPointerDown,
  onFocus,
  ...props
}: IntentPrefetchLinkProps) {
  const armed = useRef(false);

  const arm = useCallback(() => {
    if (armed.current || isSlowConnection()) return;
    armed.current = true;
    const alreadyPrefetched = Array.from(
      document.head.querySelectorAll("link[data-minback-intent-prefetch]"),
    ).some(
      (node) => node.getAttribute("data-minback-intent-prefetch") === href,
    );
    if (alreadyPrefetched) return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = href;
    link.dataset.minbackIntentPrefetch = href;
    document.head.appendChild(link);
  }, [href]);

  const handlePointerEnter = (event: PointerEvent<HTMLAnchorElement>) => {
    onPointerEnter?.(event);
    if (event.pointerType === "mouse") arm();
  };

  const handlePointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    onPointerDown?.(event);
    if (event.pointerType === "touch" || event.pointerType === "pen") arm();
  };

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onPointerEnter={handlePointerEnter}
      onPointerDown={handlePointerDown}
      onFocus={(event) => {
        onFocus?.(event);
        arm();
      }}
    />
  );
}
