"use client";

// 회원가입 페이지 - 닉네임/전화번호/이메일/생년월일/성별 입력과 약관 동의.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { submitSignupInfo } from "@/lib/api/auth";
import { getMyInfo, updateMyInfo, type CustomerInfo } from "@/lib/api/customer";
import { TERMS_SECTIONS } from "@/data/termsContent";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatPhoneInput, isValidPhone } from "@/lib/utils/formatPhone";
import { BirthDatePicker } from "@/components/ui/BirthDatePicker";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmailInput } from "@/components/ui/EmailInput";
import { LoadingState } from "@/components/ui/EmptyState";
import { setToken } from "@/lib/api/client";
import { appAlert } from "@/lib/ui/alertStore";
import { decodeJwtPayload } from "@/lib/utils/decodeJwtPayload";

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

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingState message="불러오는 중..." />}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateMockCustomer, refresh } = useAuth();

  // [신규] 백엔드가 신규 소셜 가입자를 /signup/info?pendingToken=... 으로 보내고
  // 있었는데, 이 페이지가 그 파라미터를 아예 처리하지 않고 있었어요 - 그래서
  // "가입대기 토큰"으로 로그인 성공해도 회원정보 입력 화면 자체가 404였어요.
  const pendingToken = searchParams.get("pendingToken");

  const [provider, setProvider] = useState<CustomerInfo["provider"] | null>(null);
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "UNKNOWN">("UNKNOWN");
  const [agreedTerms, setAgreedTerms] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);
  const [showBirthPicker, setShowBirthPicker] = useState(false);

  useEffect(() => {
    if (pendingToken) {
      // [신규] 가입대기 토큰은 아직 실제 회원이 아니라서 GET /api/customer/me가
      // 통하지 않아요(백엔드에 아직 그 회원 row가 없음). 대신 토큰 자체에 카카오/구글이
      // 준 닉네임이 이미 들어있어서, 그걸 그대로 읽어서 미리 채워줘요.
      // 제출(submit) API를 부를 때 이 토큰을 같이 실어 보내야 하니 우선 저장해둬요 -
      // 백엔드가 이 토큰을 보고 "신규 가입"인지 판단해서 이 시점에 회원을 만들어줘요.
      setToken(pendingToken);
      const claims = decodeJwtPayload<{ provider?: string; nickname?: string }>(pendingToken);
      setProvider((claims?.provider as CustomerInfo["provider"]) ?? null);
      setNickname(claims?.nickname ?? "");
      setLoading(false);
      return;
    }

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
  }, [router, pendingToken]);

  const allRequiredAgreed = REQUIRED_TERMS.every((term) => agreedTerms[term.id]);
  const canSubmit = nickname.trim().length > 0 && isValidPhone(phone) && allRequiredAgreed && !submitting;

  const toggleTerm = (id: string) => {
    setAgreedTerms((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await submitSignupInfo({
        nickname,
        phone,
        email: email || undefined,
        termsAgreed: !!agreedTerms.service,
        privacyAgreed: !!agreedTerms.privacy,
        locationAgreed: !!agreedTerms.location,
        marketingAgreed: !!agreedTerms.marketing,
      });
      // [신규] 가입대기 토큰으로 제출한 거면, 이 시점에 백엔드가 방금 만든 진짜 회원의
      // 진짜 토큰을 돌려줘요. 이걸 저장하고 인증 상태를 새로고침해야, 바로 다음 줄의
      // updateMyInfo 호출이나 이후 화면들이 "로그인된 상태"로 정상 동작해요.
      if (result.token) {
        setToken(result.token);
        await refresh();
      }
      // 생년월일/성별은 signup-info API가 아니라 /api/customer/me(PATCH)에서만 저장돼요.
      if (birthDate || gender !== "UNKNOWN") {
        await updateMyInfo({ birthDate: birthDate || undefined, gender });
      }
    } catch (error) {
      console.warn("회원정보 제출 실패(개발 중 CORS 등으로 무시하고 진행)", error);
      if (process.env.NODE_ENV !== "development") {
        await appAlert("정보 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
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
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            {PROVIDER_LABEL[provider]}
            {provider === "KAKAO" ? (
              <span className="w-6 h-6 rounded-full bg-[#FEE500] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/ui/kakao.svg" alt="" width={14} height={14} />
              </span>
            ) : provider === "GOOGLE" ? (
              <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#282B32] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/ui/google.svg" alt="" width={14} height={14} />
              </span>
            ) : (
              <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#282B32] flex items-center justify-center">🛠️</span>
            )}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            닉네임 <span className="text-gray-400">*</span>
          </span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="w-full bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            전화번호 <span className="text-gray-400">*</span>
          </span>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            placeholder="010-0000-0000"
            maxLength={13}
            className="w-full bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            이메일 <span className="text-gray-400 font-normal">(선택)</span>
          </span>
          <EmailInput value={email} onChange={setEmail} />
        </label>

        <div className="block">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            생년월일 <span className="text-gray-400 font-normal">(선택)</span>
          </span>
          <button
            type="button"
            onClick={() => setShowBirthPicker(true)}
            className="w-full bg-gray-100 dark:bg-[#282B32] text-gray-900 dark:text-white rounded-lg px-4 py-3 text-sm text-left"
          >
            {birthDate || <span className="text-gray-400">생년월일을 선택해주세요</span>}
          </button>
        </div>
        {showBirthPicker && (
          <BirthDatePicker value={birthDate} onChange={setBirthDate} onClose={() => setShowBirthPicker(false)} />
        )}

        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-sm border ${
                  gender === value ? "border-point text-point font-medium" : "border-gray-200 dark:border-[#282B32] text-gray-500"
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    gender === value ? "border-point" : "border-gray-300 dark:border-[#282B32]"
                  }`}
                >
                  {gender === value && <span className="w-2 h-2 rounded-full bg-point" />}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">동의</span>
          {/* [수정 8/5] "약관 더보기" 버튼 하나로 4개 문서를 한 모달에 몰아서 보여주던
              방식 대신, 각 항목 오른쪽에 화살표를 붙여서 그 항목만 바로 펼쳐볼 수
              있게 했어요. 또 체크박스 사이 간격이 너무 붙어있다는 피드백을 반영해서
              각 줄에 위아래 패딩(py-3.5)을 주고 구분선으로 나눴어요. */}
          <div className="flex flex-col">
            {[...REQUIRED_TERMS, ...OPTIONAL_TERMS].map((term, i) => {
              const section = TERMS_SECTIONS.find((s) => s.id === term.id);
              const isOpen = expandedTermId === term.id;
              return (
                <div
                  key={term.id}
                  className={i > 0 ? "border-t border-gray-50 dark:border-[#17181a]" : ""}
                >
                  <div className="flex items-center justify-between gap-2 py-3.5">
                    <label className="flex-1 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <Checkbox
                        checked={!!agreedTerms[term.id]}
                        onChange={() => toggleTerm(term.id)}
                      />
                      {term.label}
                    </label>
                    {section && (
                      <button
                        type="button"
                        onClick={() => setExpandedTermId(isOpen ? null : term.id)}
                        aria-label={`${term.label} 내용 보기`}
                        className="flex-none p-1 -m-1"
                      >
                        <img
                          src="/icons/ui/chevron_down.svg"
                          alt=""
                          width={14}
                          height={14}
                          className={`dark:invert transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    )}
                  </div>
                  {isOpen && section && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap pb-4">
                      {section.content}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* [신규] 버튼이 안 눌러질 때 "약관은 다 체크했는데 왜 안 되지?" 하는 혼란이
            있었어요 - 닉네임/전화번호도 같이 채워야 하는데 그게 눈에 잘 안 띄었던
            것 같아서, 정확히 뭐가 빠졌는지 바로 알려주는 안내를 넣었어요. */}
        {!canSubmit && !submitting && (
          <p className="text-sm text-red-500 -mt-2">
            {[
              nickname.trim().length === 0 && "닉네임",
              !isValidPhone(phone) && "전화번호",
              !allRequiredAgreed && "필수 약관 동의",
            ]
              .filter(Boolean)
              .join(", ")}
            을(를) 확인해주세요
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-full py-3.5 mt-4 text-base font-medium bg-point text-gray-900 dark:text-white disabled:opacity-50"
        >
          {submitting ? "저장하는 중..." : "동의하고 가입하기"}
        </button>
      </div>
    </main>
  );
}