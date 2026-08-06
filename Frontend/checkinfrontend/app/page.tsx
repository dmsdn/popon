// app/page.tsx
// 첫 화면
"use client";

// 로고 + "현장 웨이팅" 문구 + 주최측(business) 로그인 폼.
// 로그인 성공하면 토큰을 저장하고 팝업 선택 화면(/select-popup)으로

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveSession, getToken } from "@/lib/auth";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미 로그인되어 있으면 바로 팝업 선택 화면으로
  useEffect(() => {
    if (getToken()) router.replace("/select-popup");
  }, [router]);

  const handleSubmit = async () => {
    if (!email || !password || submitting) return;
    setSubmitting(true);
    setError(null);
    let res: Response;
    try {
      res = await fetch("/api/business/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      // [신규] 백엔드 연결 실패와 로그인 정보 오류를 구분해 안내하도록 에러 처리 개선
      setError("서버에 연결할 수 없어요. 백엔드(8080 포트)가 켜져있는지 확인해주세요.");
      setSubmitting(false);
      return;
    }
    try {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `로그인에 실패했어요. (${res.status})`);
      }
      const data = await res.json();
      // [신규] 계정 탭용 이메일/로고 이미지 - 계정 정보 필드명을 유연하게 처리해 이메일·로고 정보를 안정적으로 표시
      // > 값이 없을 경우 입력 이메일과 이니셜 아바타로 대체
      saveSession({
        accessToken: data.accessToken,
        businessId: data.businessId,
        companyName: data.companyName,
        email: data.email ?? email,
        profileImageUrl: data.profileImageUrl ?? data.logoImageUrl ?? data.logoUrl,
      });
      router.replace("/select-popup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="h-full flex flex-col items-center justify-center gap-8 px-8">
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/LOGO_Dark.svg" alt="POP-ON" className="w-40 h-auto" />
        <p className="text-lg font-bold text-gray-300">현장 웨이팅</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="사업자 이메일"
          className="w-full bg-card text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-point"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="비밀번호"
          className="w-full bg-card text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-point"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!email || !password || submitting}
          className="w-full rounded-full py-4 text-lg font-bold bg-point text-gray-900 disabled:opacity-40"
        >
          {submitting ? "로그인하는 중..." : "로그인"}
        </button>
      </div>
    </main>
  );
}
