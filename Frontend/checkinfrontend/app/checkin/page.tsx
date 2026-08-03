"use client";

// app/page.tsx
// 현장 웨이팅 등록 메인/유일 화면 - 태블릿 가로 레이아웃.
// 왼쪽: 로고 + 실시간 대기 팀 수(5초마다 갱신). 오른쪽: 이메일(아이디+도메인
// 드롭다운)/전화번호 입력 + 이용동의 체크 + 웨이팅하기 버튼.
// 제출 시 백엔드 POST /api/popups/{popupId}/waiting(비회원 등록)을 호출하고,
// 성공하면 동동 뜨는 애니메이션과 함께 확인 모달을 띄워요.

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// [참고] customerfrontend의 lib/utils/formatPhone.ts와 완전히 동일한 로직이에요.
// 프로젝트가 분리되어 있어서 그대로 복사해왔어요 - 소비자 앱에서 이 파일을
// 수정하면 여기도 같이 맞춰주세요.
function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
function isValidPhone(value: string): boolean {
  return /^01[0-9]-\d{3,4}-\d{4}$/.test(value);
}

// [참고] customerfrontend의 components/ui/EmailInput.tsx와 완전히 동일한
// 로직/디자인이에요. 프로젝트가 분리되어 있어서 그대로 복사해왔어요.
const EMAIL_DOMAINS = ["gmail.com", "naver.com", "daum.net", "kakao.com", "nate.com", "직접 입력"];

function splitEmail(value: string): [string, string] {
  const at = value.indexOf("@");
  if (at === -1) return [value, ""];
  return [value.slice(0, at), value.slice(at + 1)];
}

function EmailInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showDomainMenu, setShowDomainMenu] = useState(false);
  const [customDomain, setCustomDomain] = useState(false);
  const [local, domain] = splitEmail(value);

  // [신규] 드롭다운 스크롤바를 없애는 대신, 마우스를 누른 채로 위아래로 끌면
  // 스크롤되도록 만들었어요(터치스크린 태블릿에서도 손가락으로 그대로 됨).
  const listRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dragging: boolean; startY: number; startScroll: number }>({
    dragging: false,
    startY: 0,
    startScroll: 0,
  });

  const handleDragStart = (e: React.MouseEvent) => {
    if (!listRef.current) return;
    dragState.current = { dragging: true, startY: e.clientY, startScroll: listRef.current.scrollTop };
  };
  const handleDragMove = (e: React.MouseEvent) => {
    if (!dragState.current.dragging || !listRef.current) return;
    const delta = e.clientY - dragState.current.startY;
    listRef.current.scrollTop = dragState.current.startScroll - delta;
  };
  const handleDragEnd = () => {
    dragState.current.dragging = false;
  };

  const setLocal = (nextLocal: string) => onChange(domain ? `${nextLocal}@${domain}` : nextLocal);
  const setDomain = (nextDomain: string) => onChange(nextDomain ? `${local}@${nextDomain}` : local);

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="이메일"
        className="flex-1 min-w-0 bg-card text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-point"
      />
      <span className="text-gray-400 flex-none">@</span>
      {customDomain ? (
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="도메인 직접 입력"
          className="flex-1 min-w-0 bg-card text-white rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-point"
        />
      ) : (
        <div className="relative flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setShowDomainMenu((prev) => !prev)}
            className="w-full flex items-center justify-between bg-card text-white rounded-xl px-4 py-4 text-lg"
          >
            <span className={domain ? "" : "text-gray-400"}>{domain || "선택"}</span>
            <span className="text-gray-400 text-sm">▾</span>
          </button>
          {showDomainMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDomainMenu(false)} />
              <div
                ref={listRef}
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                className="absolute right-0 top-full mt-1 z-20 bg-card border border-gray-700 rounded-lg shadow-md py-1 w-full min-w-[160px] max-h-60 overflow-y-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none"
              >
                {EMAIL_DOMAINS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      if (d === "직접 입력") {
                        setCustomDomain(true);
                        setDomain("");
                      } else {
                        setDomain(d);
                      }
                      setShowDomainMenu(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-base ${
                      domain === d ? "font-semibold text-white" : "text-gray-400"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// [참고] customerfrontend의 data/termsContent.ts에 있는 "privacy" 항목을
// 그대로 가져왔어요.
const PRIVACY_CONTENT = `애지중지(이하 "회사")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수하고 있습니다.

1. 수집하는 개인정보 항목
회사는 회원가입, 서비스 이용 과정에서 아래와 같은 정보를 수집합니다.
- 필수: 닉네임, 휴대전화번호, 소셜 로그인 식별정보(카카오/구글)
- 선택: 이메일, 생년월일, 성별
- 서비스 이용 과정에서 자동 생성: 접속 기록, 예약·웨이팅 이력, 후기 작성 내역

2. 개인정보의 수집 및 이용 목적
- 회원 식별 및 본인 확인
- 예약 및 웨이팅 서비스 제공
- 공지사항 전달 및 고객 문의 응대
- 서비스 개선을 위한 통계 분석

3. 개인정보의 보유 및 이용 기간
회사는 회원 탈퇴 시 지체 없이 개인정보를 파기합니다. 다만 관계 법령에 따라 일정 기간 보관이 필요한 정보는 해당 기간 동안 별도 보관합니다.

4. 개인정보의 제3자 제공
회사는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다. 다만 법령에 근거가 있거나 이용자가 사전에 동의한 경우는 예외로 합니다.

5. 이용자의 권리
이용자는 언제든지 자신의 개인정보를 조회, 수정할 수 있으며 회원 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다.

6. 개인정보 보호책임자
- 담당 부서: 개인정보보호팀
- 연락처: 마이페이지 내 "1:1 문의"를 통해 접수해주세요.`;

interface BoardResponse {
  popupId: number;
  totalWaitingTeams: number;
}

function CheckinPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const popupId = searchParams.get("popupId");

  const [popupTitle, setPopupTitle] = useState<string | null>(null);
  const [totalWaitingTeams, setTotalWaitingTeams] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [teamNumber, setTeamNumber] = useState<number | null>(null);

  // 현재 대기 팀 수를 주기적으로 새로고침 (현장 태블릿이라 계속 켜져있을 걸 가정)
  useEffect(() => {
    if (!popupId) return;
    let cancelled = false;

    const fetchBoard = () => {
      fetch(`/api/popups/${popupId}/waiting/board`)
        .then((res) => res.json())
        .then((data: BoardResponse) => {
          if (!cancelled) setTotalWaitingTeams(data.totalWaitingTeams);
        })
        .catch((err) => console.error("현황판 조회 실패", err));
    };

    fetch(`/api/popups/${popupId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setPopupTitle(data.title ?? null);
      })
      .catch((err) => console.error("팝업 정보 조회 실패", err));

    fetchBoard();
    const interval = setInterval(fetchBoard, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [popupId]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  // [수정] 전화번호와 이메일을 둘 다 요구하던 걸, 둘 중 하나만 유효해도
  // 제출할 수 있도록 바꿨어요.
  const hasValidContact = isValidPhone(phone) || isValidEmail;
  const canSubmit = hasValidContact && agreed && !submitting && !!popupId;

  const handleSubmit = async () => {
    if (!canSubmit || !popupId) return;
    setSubmitting(true);
    setError(null);
    try {
      // [수정] 백엔드 WaitingQueueService.register()가 비회원 등록 시 name+email을
      // 필수로 요구하고, WaitingCreateRequest는 phoneNumber도 필수(@NotBlank)예요.
      // 화면은 전화번호/이메일 중 하나만 받아도 되게 바꿨는데, 둘 다 백엔드
      // 필수값이라 비어있는 쪽은 placeholder로 채워서 보내요.
      // ⚠️ 참고: 순번 호출 문자 안내는 전화번호로 가니, 실제 운영에서는 가능하면
      // 전화번호를 받는 걸 권장드려요.
      const emailToSend = isValidEmail ? email : `${phone.replace(/\D/g, "")}@walkin.popon.local`;
      const phoneToSend = isValidPhone(phone) ? phone : "010-0000-0000";
      const res = await fetch(`/api/popups/${popupId}/waiting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "현장고객",
          email: emailToSend,
          phoneNumber: phoneToSend,
          partySize: 1,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "웨이팅 등록에 실패했어요.");
      }
      const data = await res.json();
      setTeamNumber(data.teamNumber ?? null);
      setShowConfirm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "웨이팅 등록에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPhone("");
    setAgreed(false);
    setShowTerms(false);
    setShowConfirm(false);
    setTeamNumber(null);
  };

  if (!popupId) {
    return (
      <main className="h-full flex items-center justify-center px-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-bold">팝업이 선택되지 않았어요</p>
          <button
            type="button"
            onClick={() => router.push("/select-popup")}
            className="rounded-full px-6 py-3 text-base font-bold bg-point text-gray-900"
          >
            팝업 선택 화면으로
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full flex relative">
      {/* [수정] 로고를 화면 최상단 좌측에 고정, 앱에서 쓰는 실제 SVG 파일로 교체 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/LOGO.svg" alt="POP-ON" className="absolute top-6 left-6 w-24 h-auto z-10" />

      {/* 왼쪽: 현황 */}
      <section className="w-[38%] h-full flex flex-col items-center justify-center gap-6 bg-card px-8">
        {/* [수정] 팝업 이름 한 단계 굵게 (font-normal → font-semibold) */}
        {popupTitle && <p className="text-base font-semibold text-gray-300 text-center">{popupTitle}</p>}

        <div className="flex flex-col items-center gap-1 mt-4">
          <span className="text-sm text-gray-400">현재 대기 팀</span>
          {/* [수정] 굵기를 extrabold(800)에서 중간 정도(semibold, 600)로,
              크기는 더 키우고, "팀"을 아래 대신 숫자 옆에 붙였어요. */}
          <span className="flex items-baseline gap-2">
            <span className="text-8xl font-semibold text-point">
              {totalWaitingTeams === null ? "-" : totalWaitingTeams}
            </span>
            <span className="text-xl text-gray-400">팀</span>
          </span>
        </div>
        {/* [참고] 예상 대기시간은 별도 계산 API 없이는 정확한 값을 못 띄워서
            뺐어요. 요청하신 대로 "못 띄우면 빼기"로 처리했어요. */}
      </section>

      {/* 오른쪽: 등록 폼 */}
      <section className="flex-1 h-full flex flex-col items-center justify-center px-12 gap-6">
        <div className="w-full max-w-md flex flex-col gap-6">
          {/* [수정] 가운데 정렬이던 걸 좌측 정렬로, 전화번호/이메일 중 하나만
              입력해도 등록할 수 있다는 걸 안내에 반영했어요. */}
          <div className="text-left mb-2">
            <p className="text-xl font-bold">웨이팅 등록</p>
            <p className="text-sm text-gray-400 mt-1">전화번호와 이메일 중 하나를 입력하고 등록해주세요</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">이메일</label>
            <EmailInput value={email} onChange={setEmail} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">전화번호</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              placeholder="010-0000-0000"
              className="w-full bg-card text-white border border-transparent rounded-xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-point"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 accent-point"
                />
                개인정보 수집 및 이용에 동의합니다.
              </label>
              {/* [신규] 옆에 화살표를 눌러서 실제 개인정보처리방침 내용을 볼 수 있게 */}
              <button
                type="button"
                onClick={() => setShowTerms((prev) => !prev)}
                aria-label="약관 내용 보기"
                className={`text-gray-400 transition-transform ${showTerms ? "rotate-180" : ""}`}
              >
                ▾
              </button>
            </div>
            {showTerms && (
              <div className="mt-3 max-h-40 overflow-y-auto scrollbar-hide bg-card rounded-xl p-4">
                <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{PRIVACY_CONTENT}</p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-full py-4 text-lg font-bold bg-point text-gray-900 disabled:opacity-40"
          >
            {submitting ? "등록하는 중..." : "웨이팅하기"}
          </button>
        </div>
      </section>

      {/* [신규] 전화번호로 등록 완료되면 뜨는 안내 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-8 z-50">
          <div className="bg-card rounded-2xl px-10 py-10 w-full max-w-md text-center animate-float">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-point/20 flex items-center justify-center text-point text-3xl">
              ✓
            </div>
            <p className="text-2xl font-bold mb-2">웨이팅 등록 완료</p>
            {teamNumber !== null && (
              <p className="text-lg text-gray-300 mb-1">
                대기번호 <span className="text-point font-bold">{teamNumber}</span>번
              </p>
            )}
            <p className="text-sm text-gray-400 mb-6">순서가 되면 문자로 안내해드려요.</p>
            <button
              type="button"
              onClick={resetForm}
              className="w-full rounded-full py-3.5 text-base font-medium bg-point text-gray-900"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={null}>
      <CheckinPageInner />
    </Suspense>
  );
}
