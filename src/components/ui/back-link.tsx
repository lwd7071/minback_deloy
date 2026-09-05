"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function BackLink({
  fallbackHref,
  forceFallback = false,
  ariaLabel,
  title,
  className,
}: {
  fallbackHref: string;
  forceFallback?: boolean;
  ariaLabel?: string;
  title?: string;
  className?: string;
}) {
  const label = ariaLabel ?? "Quay lại";

  if (forceFallback) {
    return (
      <Link
        href={fallbackHref}
        className={`back-link${className ? ` ${className}` : ""}`}
        aria-label={label}
        title={title ?? label}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </Link>
    );
  }

  function goBack() {
    const referrer = typeof document === "undefined" ? "" : document.referrer;
    if (
      referrer.startsWith(window.location.origin) &&
      window.history.length > 1
    )
      window.history.back();
    else window.location.assign(fallbackHref);
  }

  return (
    <button
      type="button"
      className={`back-link${className ? ` ${className}` : ""}`}
      aria-label={label}
      title={title ?? label}
      onClick={goBack}
    >
      <ChevronLeft size={16} aria-hidden="true" />
    </button>
  );
}
