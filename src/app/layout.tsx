import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Be_Vietnam_Pro, IBM_Plex_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { PerformanceReporter } from "@/components/performance/performance-reporter";
import { getServerEnv } from "@/lib/env/server";

import "./globals.css";

const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-body",
  weight: ["400", "500", "700"],
});
const mono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "MinBack",
  description: "Quản lý và theo dõi thông tin học tập của sinh viên",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const env = getServerEnv();
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${body.variable} ${mono.variable} ${body.className}`}>
        <ToastProvider>
          <PerformanceReporter
            sampleRate={env.PERFORMANCE_TELEMETRY_SAMPLE_RATE}
            buildSha={process.env.BUILD_SHA ?? "local"}
          />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
