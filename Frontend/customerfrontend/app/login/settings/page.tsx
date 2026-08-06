// app/login/settings/page.tsx
// 화면 설정 페이지 - 로그인 페이지 하단 "화면 설정"에서 들어오는 다크모드 토글 화면
"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function LoginSettingsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col w-full mobile:max-w-[1000px] mobile:mx-auto">
      <div className="flex items-center gap-2 h-14 px-4 mobile:px-8 border-b border-gray-100 dark:border-[#282B32]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="text-lg text-gray-500"
        >
          <img src="/icons/ui/back_arrow.svg" alt="" width={24} height={24} className="dark:invert" />
        </button>
        <h1 className="text-lg font-bold">화면 설정</h1>
      </div>

      <div className="px-4 mobile:px-8 py-2">
        <div className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-[#282B32]">
          <span className="text-sm text-gray-700 dark:text-gray-300">다크모드</span>
          <ThemeToggle />
        </div>
      </div>
    </main>
  );
}
