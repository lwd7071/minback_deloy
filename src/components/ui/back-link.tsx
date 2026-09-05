import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function BackLink({
  href,
  children = "Quay lại",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <Link href={href} className="back-link">
      <ChevronLeft size={16} aria-hidden="true" />
      {children}
    </Link>
  );
}
