"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { submitSignupInfo, type Provider } from "@/lib/api/auth";

const REQUIRED_TERMS = [
  { id: "service", label: "[필수] 서비스 이용약관 동의" },
  { id: "privacy", label: "[필수] 개인정보 수집 및 이용 동의" },
];
const OPTIONAL_TERMS = [
  { id: "location", label: "[선택] 위치 정보 이용 동의" },
  { id: "marketing", label: "[선택] 마케팅 정보 수신 동의" },
];

const PROVIDER_LABEL: Record<Provider, string> = {
  kakao: "카카오 로그인",
  google: "구글 로그인",
};

// 숫자만 남긴 뒤 3-4-4 자리로 하이픈을 자동으로 넣어줍니다. (예: 01012345678 -> 010-1234-5678)
function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// useSearchParams는 Suspense 경계 안에서 써야 해서 내부 컴포넌트로 분리했습니다.
export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const provider = (searchParams.get("provider") as Provider) ?? "kakao";

  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agreedTerms, setAgreedTerms] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const allRequiredAgreed = REQUIRED_TERMS.every((term) => agreedTerms[term.id]);
  const canSubmit = nickname.trim().length > 0 && allRequiredAgreed && !submitting;

  const toggleTerm = (id: string) => {
    setAgreedTerms((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitSignupInfo({ provider, nickname, phone, email, agreedTerms });
      router.push("/signup/preferences");
    } catch (error) {
      console.error("회원정보 제출 실패", error);
      alert("정보 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="px-6 py-8 mobile:max-w-[1000px] mobile:mx-auto flex flex-col min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold">회원정보 입력</h1>
        <div className="flex flex-col gap-6">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
          {PROVIDER_LABEL[provider]}
          {provider === "kakao" ? (
            <span className="w-6 h-6 rounded-full bg-[#FEE500] flex items-center justify-center">💬</span>
          ) : (
            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">G</span>
          )}
        </span>
        </div>
        
      </div>

      <div className="flex flex-col gap-6">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">닉네임</span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">전화번호</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
            placeholder="010-0000-0000"
            className="w-full bg-transparent border-b border-gray-200 px-1 py-2 text-sm text-gray-400 outline-none focus:text-gray-900"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">이메일</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="000@example.com"
            className="w-full bg-transparent border-b border-gray-200 px-1 py-2 text-sm text-gray-400 outline-none focus:text-gray-900"
          />
        </label>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">동의</span>
          <div className="flex flex-col gap-3">
            {[...REQUIRED_TERMS, ...OPTIONAL_TERMS].map((term) => (
              <label key={term.id} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!agreedTerms[term.id]}
                  onChange={() => toggleTerm(term.id)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                {term.label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-full py-3.5 mt-4 text-sm font-medium bg-gray-100 text-gray-900 disabled:opacity-60 enabled:bg-[#FEE500]"
        >
          {submitting ? "저장하는 중..." : "동의하고 가입하기"}
        </button>
      </div>
    </main>
  );
}