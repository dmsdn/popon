// app/layout.tsx
// 루트 레이아웃 - 폰트, 전역 Provider(Auth/Theme), 백엔드 상태 배너, 방문 기록을 감싸요.

import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { BackendStatusBanner } from "@/components/layout/BackendStatusBanner";
import { VisitLogger } from "@/components/layout/VisitLogger";

export const metadata: Metadata = {
  title: "팝온",
  description: "지금 뜨는 팝업스토어, 팝온에서 확인하세요",
  icons: {
    // [신규] 사용자가 LOGO.svg를 정사각형(둥근 모서리) 아이콘으로 직접 만들어서
    // /icons/ui/LOGO.svg로 넣어주시면 바로 이 경로가 적용돼요.
    icon: "/icons/ui/LOGO.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        {/* [신규] 다크모드가 기본값인데, ThemeProvider가 <html>에 .dark 클래스를
            붙이는 시점이 hydration 이후(useEffect)라서, 그 사이 아주 짧게
            라이트모드로 먼저 그려졌다가 다크모드로 바뀌는 깜빡임(FOUC)이 있었어요.
            beforeInteractive 스크립트로 첫 페인트 전에 미리 클래스를 붙여서,
            localStorage에 "light"로 저장해둔 경우가 아니면 항상 다크모드로
            바로 시작하도록 했어요. (ThemeProvider의 기본값/로직과 동일하게 맞췄어요.) */}
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
        </ThemeProvider>
      </body>
    </html>
  );
}
