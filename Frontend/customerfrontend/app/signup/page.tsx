"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { submitSignupInfo } from "@/lib/api/auth";
import { getMyInfo, updateMyInfo, type CustomerInfo } from "@/lib/api/customer";
import { getTerms, type Terms } from "@/lib/api/terms";
import { useAuth } from "@/lib/auth/AuthContext";

const REQUIRED_TERMS = [
  { id: "service", label: "[필수] 서비스 이용약관 동의" },
  { id: "privacy", label: "[필수] 개인정보 수집 및 이용 동의" },
];
const OPTIONAL_TERMS = [
  { id: "location", label: "[선택] 위치 정보 이용 동의" },
  { id: "marketing", label: "[선택] 마케팅 정보 수신 동의" },
];

const PROVIDER_LABEL: Record<CustomerInfo["provider"], string> = {
  KAKAO: "카카오 로그인",
  GOOGLE: "구글 로그인",
  DEV: "개발용 로그인",
};

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function SignupPage() {
  const router = useRouter();
  const { updateMockCustomer } = useAuth();

  const [provider, setProvider] = useState<CustomerInfo["provider"] | null>(null);
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "UNKNOWN">("UNKNOWN");
  const [agreedTerms, setAgreedTerms] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [terms, setTerms] = useState<Terms | null>(null);
  const [termsError, setTermsError] = useState(false);

  useEffect(() => {
    getMyInfo()
      .then((info) => {
        setProvider(info.provider);
        setNickname(info.nickname ?? "");
        setBirthDate(info.birthDate ?? "");
        setGender(info.gender ?? "UNKNOWN");
      })
      .catch((error) => {
        console.warn("내 정보 조회 실패(개발 중 CORS 등으로 대체)", error);
        if (process.env.NODE_ENV === "development") {
          setProvider("KAKAO");
          setNickname("테스트유저");
        } else {
          router.replace("/login");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const phoneDigits = phone.replace(/\D/g, "");
  const allRequiredAgreed = REQUIRED_TERMS.every((term) => agreedTerms[term.id]);
  const canSubmit =
    nickname.trim().length > 0 && phoneDigits.length === 11 && allRequiredAgreed && !submitting;

  const toggleTerm = (id: string) => {
    setAgreedTerms((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenTerms = () => {
    setShowTerms(true);
    if (terms || termsError) return;
    getTerms()
      .then(setTerms)
      .catch((error) => {
        console.warn("약관 조회 실패", error);
        setTermsError(true);
      });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitSignupInfo({
        nickname,
        phone,
        email: email || undefined,
        termsAgreed: !!agreedTerms.service,
        privacyAgreed: !!agreedTerms.privacy,
        locationAgreed: !!agreedTerms.location,
        marketingAgreed: !!agreedTerms.marketing,
      });
      // 생년월일/성별은 signup-info API가 아니라 /api/customer/me(PATCH)에서만 저장돼요.
      if (birthDate || gender !== "UNKNOWN") {
        await updateMyInfo({ birthDate: birthDate || undefined, gender });
      }
    } catch (error) {
      console.warn("회원정보 제출 실패(개발 중 CORS 등으로 무시하고 진행)", error);
      if (process.env.NODE_ENV !== "development") {
        alert("정보 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
        setSubmitting(false);
        return;
      }
    }
    updateMockCustomer({ nickname, phone, email: email || null, birthDate: birthDate || null, gender });
    setSubmitting(false);
    router.push("/signup/preferences");
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-gray-400">불러오는 중이에요...</p>
      </main>
    );
  }

  return (
    <main className="w-full mobile:max-w-[1000px] mobile:mx-auto flex flex-col min-h-screen px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold">회원정보 입력</h1>
        {provider && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            {PROVIDER_LABEL[provider]}
            {provider === "KAKAO" ? (
              <span className="w-6 h-6 rounded-full bg-[#FEE500] flex items-center justify-center">💬</span>
            ) : provider === "GOOGLE" ? (
              <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">G</span>
            ) : (
              <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">🛠️</span>
            )}
          </span>
        )}
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
          <span className="block text-sm font-medium text-gray-700 mb-2">
            전화번호 <span className="text-gray-400">*</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
            placeholder="010-0000-0000"
            className="w-full bg-transparent border-b border-gray-200 px-1 py-2 text-sm text-gray-400 outline-none focus:text-gray-900"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            이메일 <span className="text-gray-400 font-normal">(선택)</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="000@example.com"
            className="w-full bg-transparent border-b border-gray-200 px-1 py-2 text-sm text-gray-400 outline-none focus:text-gray-900"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            생년월일 <span className="text-gray-400 font-normal">(선택)</span>
          </span>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
          />
        </label>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">
            성별 <span className="text-gray-400 font-normal">(선택)</span>
          </span>
          <div className="flex gap-2">
            {([
              ["MALE", "남성"],
              ["FEMALE", "여성"],
              ["UNKNOWN", "선택 안 함"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setGender(value)}
                className={`flex-1 rounded-full py-2.5 text-sm border ${
                  gender === value ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-sm font-medium text-gray-700">동의</span>
            <button
              type="button"
              onClick={handleOpenTerms}
              className="text-xs text-gray-400 underline underline-offset-2"
            >
              약관 더보기
            </button>
          </div>
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

        {showTerms && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50"
            onClick={() => setShowTerms(false)}
          >
            <div
              className="bg-white rounded-xl px-6 py-6 w-full max-w-md max-h-[70vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {termsError ? (
                <p className="text-sm text-gray-400 py-10 text-center">약관을 불러오지 못했어요.</p>
              ) : !terms ? (
                <p className="text-sm text-gray-400 py-10 text-center">불러오는 중...</p>
              ) : (
                <>
                  <p className="text-base font-semibold mb-3">{terms.title}</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">
                    {terms.content}
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                className="w-full rounded-full py-3 text-sm font-medium bg-gray-100 text-gray-700"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-full py-3.5 mt-4 text-sm font-medium bg-gray-100 text-gray-900 disabled:opacity-60 enabled:bg-gray-900 enabled:text-white"
        >
          {submitting ? "저장하는 중..." : "동의하고 가입하기"}
        </button>
      </div>
    </main>
  );
}