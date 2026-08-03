// app/layout.tsx
// 루트 레이아웃 - 폰트, 전역 Provider(Auth/Theme), 백엔드 상태 배너, 방문 기록을 감싸요.

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { BackendStatusBanner } from "@/components/layout/BackendStatusBanner";
import { VisitLogger } from "@/components/layout/VisitLogger";

export const metadata: Metadata = {
  title: "팝온 [POP-ON]",
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
        <ThemeProvider>
          <VisitLogger />
          <BackendStatusBanner />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
