import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Be_Vietnam_Pro, Inter } from "next/font/google";

import "./globals.css";
import "./workspace.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
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
        className={`${inter.variable} ${beVietnamPro.variable} ${inter.className}`}
      >
        {children}
      </body>
    </html>
  );
}
