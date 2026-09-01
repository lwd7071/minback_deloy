import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Be_Vietnam_Pro, IBM_Plex_Mono, Lora } from "next/font/google";

import "./globals.css";

const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});
const display = Lora({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});
const mono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "MinBack",
  description: "Quản lý và theo dõi thông tin học tập của sinh viên",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${body.variable} ${display.variable} ${mono.variable} ${body.className}`}
      >
        {children}
      </body>
    </html>
  );
}
