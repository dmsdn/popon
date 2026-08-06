// app/layout.tsx
// 루트 레이아웃 - 폰트, 전역 Provider(Auth/Theme), 백엔드 상태 배너, 방문 기록을 감쌈

import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { BackendStatusBanner } from "@/components/layout/BackendStatusBanner";
import { VisitLogger } from "@/components/layout/VisitLogger";
import { AlertModalRoot } from "@/components/ui/AlertModalRoot";

export const metadata: Metadata = {
  title: "팝온",
  description: "지금 뜨는 팝업스토어, 팝온에서 확인하세요",
  icons: {
    icon: "/icons/ui/LOGO.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function () {
              try {
                if (localStorage.getItem('theme') === 'light') return;
              } catch (e) {}
              document.documentElement.classList.add('dark');
            })();
          `}
        </Script>
        <ThemeProvider>
          <VisitLogger />
          <BackendStatusBanner />
          <AuthProvider>{children}</AuthProvider>
          <AlertModalRoot />
        </ThemeProvider>
      </body>
    </html>
  );
}
