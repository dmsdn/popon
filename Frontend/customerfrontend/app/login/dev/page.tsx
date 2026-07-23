"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/api/client";
import { signupWithEmail, loginWithEmail, loginWithDevAccount } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";

// 개발용 이메일/비밀번호 로그인·회원가입 화면입니다.
// 소셜 로그인과 달리 계정을 원하는 만큼 만들어서 이메일만 바꿔가며 테스트할 수 있어요.
// (백엔드에 /api/auth/signup, /api/auth/login이 아직 없어서 지금은 로컬 mock으로 동작해요.
//  백엔드 팀이 실제 엔드포인트를 만들면 이 화면은 코드 변경 없이 자동으로 실 API를 씁니다.)
export default function DevLoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [mode, setMode] = useState<"login" | "signup" | "devId">("devId");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [providerId, setProviderId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !submitting &&
    (mode === "devId"
      ? providerId.trim().length > 0 && email.trim().length > 0
      : email.trim().length > 0 &&
        password.trim().length > 0 &&
        (mode === "login" || nickname.trim().length > 0));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const result =
        mode === "devId"
          ? await loginWithDevAccount({ providerId: providerId.trim(), email: email.trim() })
          : mode === "signup"
          ? await signupWithEmail({ email: email.trim(), password, nickname: nickname.trim() })
          : await loginWithEmail({ email: email.trim(), password });

      setToken(result.token);
      await refresh();
      router.push(result.onboarded ? "/" : "/signup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="w-full max-w-sm mx-auto flex flex-col min-h-screen px-6 py-10">
      <Link href="/login" className="self-start text-sm text-gray-500 mb-6">
        ‹ 뒤로
      </Link>

      <h1 className="text-lg font-bold mb-1">개발용 로그인</h1>
      <p className="text-sm text-gray-400 mb-8">
        여러 개의 테스트 계정을 만들어서 로그인해볼 수 있어요.
      </p>

      {/* DEV 계정(아이디+이메일) / 로그인 / 회원가입 탭 */}
      <div className="flex border-b border-gray-100 mb-6">
        {(["devId", "login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`flex-1 text-center py-3 text-sm ${
              mode === m ? "font-semibold border-b-2 border-gray-900" : "text-gray-400"
            }`}
          >
            {m === "devId" ? "DEV 계정" : m === "login" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {mode === "devId" && (
          <>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">아이디 (provider_id)</span>
              <input
                type="text"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                placeholder="dev-tester1"
                className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">이메일</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tester1@test.com"
                className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
            </label>
          </>
        )}

        {mode === "signup" && (
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">닉네임</span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="테스트유저1"
              className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
            />
          </label>
        )}

        {(mode === "login" || mode === "signup") && (
          <>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">이메일</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test1@example.com"
                className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">비밀번호</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
            </label>
          </>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-full py-3.5 text-sm font-medium bg-gray-900 text-white disabled:opacity-40 mt-2"
        >
          {submitting ? "처리 중..." : mode === "signup" ? "회원가입하고 시작하기" : "로그인"}
        </button>
      </div>
    </main>
  );
}
