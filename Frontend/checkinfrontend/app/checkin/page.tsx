// app/page.tsx
// 현장 웨이팅 등록 메인 화면 - 태블릿 가로 레이아웃
"use client";


// 좌측: 로고 + 실시간 대기 팀 수(5초마다 갱신). 오른쪽: 이메일(아이디+도메인 드롭다운)/전화번호 입력 + 이용동의 체크 + 웨이팅하기 버튼.
// 제출 시 백엔드 POST /api/popups/{popupId}/waiting(비회원 등록)을 호출, 성공하면 확인 모달 제공

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { consumerReservationUrl, consumerWaitingUrl, consumerPopupUrl } from "@/lib/siteUrls";

// [참고] customerfrontend의 lib/utils/formatPhone.ts와 완전히 동일한 로직
function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
function isValidPhone(value: string): boolean {
  return /^01[0-9]-\d{3,4}-\d{4}$/.test(value);
}

// [참고] customerfrontend의 components/ui/EmailInput.tsx와 완전히 동일한 로직/디자인
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

  // [신규] 드롭다운 스크롤바를 없애는 대신, 마우스를 누른 채로 위아래로 끌면 스크롤(터치스크린 태블릿에서도 손가락으로 그대로 됨)
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

// [참고] customerfrontend의 data/termsContent.ts에 있는 "privacy" 항목
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
  // [신규] 정확한 대기시간 계산에는 "대기 팀 수"가 아니라 "대기 인원 수"가 필요(정원은 사람 수 기준)
  waitingList: { partySize: number }[];
}

// [신규] 외국어는 한중일영 > 우측 상단 선택 메뉴로 바로 전환 (내용이 많이 없어서 전체 입력해둠)
const TEXT = {
  ko: {
    langLabel: "한국어",
    currentWaitingTeams: "현재 대기 팀",
    teamUnit: "팀",
    estimatedWait: "예상 대기시간",
    minuteUnit: "분",
    howManyPeople: "몇 분이서 오셨나요?",
    selectPartySize: "인원수를 선택해주세요",
    maxPartyNote: (max: number) => `한 팀 최대 ${max}명까지 가능해요`,
    next: "다음",
    waitingRegisterTitle: "웨이팅 등록",
    waitingRegisterDesc: "전화번호와 이메일 중 하나를 입력하고 등록해주세요",
    changePartySize: (n: number) => `${n}명 변경`,
    emailLabel: "이메일",
    phoneLabel: "전화번호",
    phonePlaceholder: "010-0000-0000",
    privacyAgree: "개인정보 수집 및 이용에 동의합니다.",
    submitting: "등록하는 중...",
    submit: "웨이팅하기",
    confirmTitle: "웨이팅 등록 완료",
    waitingNumberLabel: "대기번호",
    numberSuffix: "번",
    confirmDesc: "순서가 되면 문자로 안내해드려요.",
    confirmOk: "확인",
    noPopupTitle: "팝업이 선택되지 않았어요",
    goSelectPopup: "팝업 선택 화면으로",
    reservationQrTitle: "팝온에서 사전예약을 해보세요",
    reservationQrDesc: "이 QR을 스캔하면 팝온에서 바로 예약할 수 있어요.",
    appWaitingQrTitle: "팝온에서 웨이팅을 등록해보세요",
    appWaitingQrDesc: "이 QR을 스캔하면 팝온에서 바로 웨이팅을 등록할 수 있어요.",
    bothQrTitle: "예약도 웨이팅도 팝온에서 가능해요",
    bothQrDesc: "이 QR을 스캔하면 팝온에서 예약하거나 웨이팅할 수 있어요.",
  },
  en: {
    langLabel: "English",
    currentWaitingTeams: "Teams waiting",
    teamUnit: "teams",
    estimatedWait: "Estimated wait",
    minuteUnit: "min",
    howManyPeople: "How many in your group?",
    selectPartySize: "Please select your party size",
    maxPartyNote: (max: number) => `Up to ${max} people per group`,
    next: "Next",
    waitingRegisterTitle: "Join the Waitlist",
    waitingRegisterDesc: "Enter your phone number or email to register",
    changePartySize: (n: number) => `Change (${n})`,
    emailLabel: "Email",
    phoneLabel: "Phone Number",
    phonePlaceholder: "010-0000-0000",
    privacyAgree: "I agree to the collection and use of personal information.",
    submitting: "Submitting...",
    submit: "Join Waitlist",
    confirmTitle: "You're on the list!",
    waitingNumberLabel: "Your number",
    numberSuffix: "",
    confirmDesc: "We'll text you when it's your turn.",
    confirmOk: "OK",
    noPopupTitle: "No popup selected",
    goSelectPopup: "Go to popup selection",
    reservationQrTitle: "Reserve via POP-ON",
    reservationQrDesc: "Scan this QR code to reserve right on POP-ON.",
    appWaitingQrTitle: "Join the waitlist via POP-ON, too",
    appWaitingQrDesc: "Scan this QR code to join the waitlist right on POP-ON.",
    bothQrTitle: "Reserve or wait — both on POP-ON",
    bothQrDesc: "Scan this QR code to reserve or join the waitlist on POP-ON.",
  },
  zh: {
    langLabel: "中文",
    currentWaitingTeams: "当前等待组数",
    teamUnit: "组",
    estimatedWait: "预计等待时间",
    minuteUnit: "分钟",
    howManyPeople: "请问一共几位？",
    selectPartySize: "请选择人数",
    maxPartyNote: (max: number) => `每组最多 ${max} 人`,
    next: "下一步",
    waitingRegisterTitle: "登记排队",
    waitingRegisterDesc: "请输入电话号码或邮箱其中一项进行登记",
    changePartySize: (n: number) => `修改人数（${n}人）`,
    emailLabel: "邮箱",
    phoneLabel: "电话号码",
    phonePlaceholder: "010-0000-0000",
    privacyAgree: "我同意收集和使用个人信息。",
    submitting: "登记中...",
    submit: "登记排队",
    confirmTitle: "登记完成",
    waitingNumberLabel: "排队号码",
    numberSuffix: "号",
    confirmDesc: "轮到您时会通过短信通知您。",
    confirmOk: "确认",
    noPopupTitle: "尚未选择快闪店",
    goSelectPopup: "前往选择快闪店",
    reservationQrTitle: "扫码在POP-ON预约",
    reservationQrDesc: "扫描此二维码即可在POP-ON上预约。",
    appWaitingQrTitle: "也可以在POP-ON排队等候",
    appWaitingQrDesc: "扫描此二维码即可直接在POP-ON登记排队。",
    bothQrTitle: "预约和排队都可以在POP-ON上",
    bothQrDesc: "扫描此二维码即可在POP-ON上预约或登记排队。",
  },
  ja: {
    langLabel: "日本語",
    currentWaitingTeams: "現在の待ち組数",
    teamUnit: "組",
    estimatedWait: "予想待ち時間",
    minuteUnit: "分",
    howManyPeople: "何名様ですか？",
    selectPartySize: "人数を選択してください",
    maxPartyNote: (max: number) => `1組最大 ${max}名まで`,
    next: "次へ",
    waitingRegisterTitle: "ウェイティング登録",
    waitingRegisterDesc: "電話番号かメールアドレスのいずれかを入力して登録してください",
    changePartySize: (n: number) => `人数を変更（${n}名）`,
    emailLabel: "メールアドレス",
    phoneLabel: "電話番号",
    phonePlaceholder: "010-0000-0000",
    privacyAgree: "個人情報の収集及び利用に同意します。",
    submitting: "登録中...",
    submit: "ウェイティング登録",
    confirmTitle: "登録が完了しました",
    waitingNumberLabel: "待ち番号",
    numberSuffix: "番",
    confirmDesc: "順番が来たらSMSでお知らせします。",
    confirmOk: "確認",
    noPopupTitle: "ポップアップが選択されていません",
    goSelectPopup: "ポップアップ選択画面へ",
    reservationQrTitle: "QRでPOP-ONから事前予約",
    reservationQrDesc: "このQRコードをスキャンするとPOP-ONで直接予約できます。",
    appWaitingQrTitle: "ウェイティングもPOP-ONで",
    appWaitingQrDesc: "このQRコードをスキャンするとPOP-ONでウェイティング登録ができます。",
    bothQrTitle: "予約もウェイティングもPOP-ONで",
    bothQrDesc: "このQRコードをスキャンするとPOP-ONで予約またはウェイティング登録ができます。",
  },
} as const;
type Lang = keyof typeof TEXT;
const LANG_ORDER: Lang[] = ["ko", "en", "zh", "ja"];

function CheckinPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const popupId = searchParams.get("popupId");

  const [popupTitle, setPopupTitle] = useState<string | null>(null);
  const [avgExperienceMinutes, setAvgExperienceMinutes] = useState<number | null>(null);
  const [maxPartySize, setMaxPartySize] = useState<number | null>(null);
  // [신규] 대기시간 계산 > capacity는 "동시에 공간에 들어갈 수 있는 전체 인원"
  const [capacity, setCapacity] = useState<number | null>(null);
  // [신규] 사전예약/현장웨이팅 지원 여부가 다름(queueMode) - 소비자 앱(StickyActionBar)이 같은 필드로 예약 가능 여부를 판단하고 있어서 그 기준을 그대로 따름
  const [queueMode, setQueueMode] = useState<"PRERESERVATION_ONLY" | "ONSITE_WAITING_ONLY" | "BOTH" | null>(null);
  const [totalWaitingTeams, setTotalWaitingTeams] = useState<number | null>(null);
  const [totalWaitingPeople, setTotalWaitingPeople] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // [신규] 연락처를 입력하기 전에 먼저 인원을 고르는 단계 추가
  const [partySize, setPartySize] = useState(1);
  const [step, setStep] = useState<"party" | "contact">("party");
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [teamNumber, setTeamNumber] = useState<number | null>(null);
  // [신규] 외국인 손님을 위한 언어 선택 (한국어 기본, 영어/중/일은 text 가져오기)
  const [lang, setLang] = useState<Lang>("ko");
  const t = TEXT[lang];

  // [신규] 팝업의 운영 방식에 맞는 소비자용 QR 주소를 현재 접속 환경 기준으로 안전하게 생성
  const [reservationQrSrc, setReservationQrSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!popupId || !queueMode) {
      setReservationQrSrc(null);
      return;
    }
    const target =
      queueMode === "ONSITE_WAITING_ONLY"
        ? consumerWaitingUrl(popupId)
        : queueMode === "BOTH"
        ? consumerPopupUrl(popupId)
        : consumerReservationUrl(popupId);
    setReservationQrSrc(
      `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(target)}`
    );
  }, [popupId, queueMode]);

  // 현재 대기 팀 수를 주기적으로 새로고침 (현장 태블릿이라 계속 켜져있을 걸 가정)
  useEffect(() => {
    if (!popupId) return;
    let cancelled = false;

    const fetchBoard = () => {
      fetch(`/api/popups/${popupId}/waiting/board`)
        .then((res) => res.json())
        .then((data: BoardResponse) => {
          if (!cancelled) {
            setTotalWaitingTeams(data.totalWaitingTeams);
            const people = (data.waitingList ?? []).reduce((sum, w) => sum + (w.partySize ?? 0), 0);
            setTotalWaitingPeople(people);
          }
        })
        .catch((err) => console.error("현황판 조회 실패", err));
    };

    fetch(`/api/popups/${popupId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setPopupTitle(data.title ?? null);
          // [수정] 소비자 앱과 동일한 정원·회전율 기반 대기시간 계산 로직으로 통일
          // 대기시간(분) = 체류시간 × (⌈대기인원/정원⌉ - 1) / 2
          setAvgExperienceMinutes(data.avgExperienceMinutes ?? null);
          setMaxPartySize(data.maxPartySizePerTeam ?? null);
          setCapacity(data.capacity ?? null);
          setQueueMode(data.queueMode ?? null);
        }
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
  // [수정] 전화번호와 이메일을 둘 다 요구하던 걸, 둘 중 하나만 유효해도 제출할 수 있도록 수정
  const hasValidContact = isValidPhone(phone) || isValidEmail;
  const canSubmit = hasValidContact && agreed && !submitting && !!popupId;

  const handleSubmit = async () => {
    if (!canSubmit || !popupId) return;
    setSubmitting(true);
    setError(null);
    try {
      // [수정] 사용자는 전화번호나 이메일 중 하나만 입력해도 되지만, 백엔드의 필수값 조건을 만족하도록 누락된 정보를 자동 보완하는 처리
      const emailToSend = isValidEmail ? email : `${phone.replace(/\D/g, "")}@walkin.popon.local`;
      const phoneToSend = isValidPhone(phone) ? phone : "010-0000-0000";
      const res = await fetch(`/api/popups/${popupId}/waiting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "현장고객",
          email: emailToSend,
          phoneNumber: phoneToSend,
          partySize,
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
    setPartySize(1);
    setStep("party");
    setAgreed(false);
    setShowTerms(false);
    setShowConfirm(false);
    setTeamNumber(null);
  };

  if (!popupId) {
    return (
      <main className="h-full flex items-center justify-center px-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-bold">{t.noPopupTitle}</p>
          <button
            type="button"
            onClick={() => router.push("/select-popup")}
            className="rounded-full px-6 py-3 text-base font-bold bg-point text-gray-900"
          >
            {t.goSelectPopup}
          </button>
        </div>
      </main>
    );
  }

  // [수정] 팝업의 예약·웨이팅 운영 방식에 맞춰 QR코드가 적절한 화면으로 연결되도록 개선
  const isWaitingOnly = queueMode === "ONSITE_WAITING_ONLY";
  const isBoth = queueMode === "BOTH";
  const qrTitle = isWaitingOnly ? t.appWaitingQrTitle : isBoth ? t.bothQrTitle : t.reservationQrTitle;
  const qrDesc = isWaitingOnly ? t.appWaitingQrDesc : isBoth ? t.bothQrDesc : t.reservationQrDesc;

  return (
    <main className="h-full flex flex-col landscape:flex-row relative overflow-y-auto landscape:overflow-hidden scrollbar-hide">
      {/* [수정] 로고를 화면 최상단 좌측에 고정, 앱에서 쓰는 실제 SVG 파일로 교체 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/LOGO_Dark.svg"
        alt="POP-ON"
        className="absolute top-4 left-4 w-16 h-auto z-10 landscape:top-6 landscape:left-6 landscape:w-24"
      />

      {/* [수정] 외국인 손님을 위한 언어 선택을 한/영 2개에서 한/중/일/영 4개로 늘림 */}
      <div className="absolute top-4 right-4 z-10 landscape:top-6 landscape:right-6 flex bg-card rounded-full p-1 gap-0.5">
        {LANG_ORDER.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`text-sm px-3 py-1.5 rounded-full font-semibold whitespace-nowrap ${
              lang === l ? "bg-point text-gray-900" : "text-gray-400"
            }`}
          >
            {TEXT[l].langLabel}
          </button>
        ))}
      </div>

      {/* 좌측 : 팝업 정보 */}
      <section className="w-full landscape:w-[38%] landscape:h-full flex flex-col items-center gap-6 bg-card px-8 py-10 pt-16 landscape:py-8 landscape:pt-8 flex-none">
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6">
          {popupTitle && <p className="text-xl font-semibold text-gray-100 text-center">{popupTitle}</p>}

          <div className="flex flex-col items-center gap-1 mt-4">
            <span className="text-sm text-gray-400">{t.currentWaitingTeams}</span>
            <span className="flex items-baseline gap-2">
              <span className="text-7xl landscape:text-8xl font-semibold text-point">
                {totalWaitingTeams === null ? "-" : totalWaitingTeams}
              </span>
              <span className="text-xl text-gray-400">{t.teamUnit}</span>
            </span>
          </div>

          {/* [수정] 실제 백엔드 공식(정원 기준 배치 회전)으로 계산
              대기시간(분) = 체류시간 × (⌈대기인원/정원⌉ - 1) / 2
              정원(capacity) 정보가 없는 팝업은 정확한 계산이 안 돼서 안 보여줌 */}
          {totalWaitingPeople !== null && avgExperienceMinutes != null && capacity != null && capacity > 0 && (
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-sm text-gray-400">{t.estimatedWait}</span>
              <span className="text-3xl font-semibold text-point">
                {totalWaitingPeople <= capacity
                  ? 0
                  : Math.round((avgExperienceMinutes * (Math.ceil(totalWaitingPeople / capacity) - 1)) / 2)}
              </span>
              <span className="text-base text-gray-400">{t.minuteUnit}</span>
            </div>
          )}
        </div>

        {/* [수정] 팝업의 운영 방식에 맞는 예약·웨이팅 QR을 보여주고, 스캔 시 소비자 앱의 적절한 화면으로 바로 연결*/}
        {queueMode && (
          <div className="w-full flex items-center gap-4 bg-[#17181a] rounded-xl px-4 py-4 flex-none">
            {reservationQrSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={reservationQrSrc} alt="" width={90} height={90} className="rounded-md flex-none bg-white" />
            ) : (
              <div className="w-[90px] h-[90px] rounded-md flex-none bg-[#282b32]" aria-hidden />
            )}
            <div className="text-left min-w-0">
              <p className="text-sm font-semibold text-white">{qrTitle}</p>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">{qrDesc}</p>
            </div>
          </div>
        )}
      </section>

      {/* 우측 : 등록 폼 */}
      <section className="flex-1 w-full landscape:h-full flex flex-col items-center justify-center px-8 landscape:px-12 py-10 landscape:py-0 gap-6">
        {step === "party" ? (
          // [신규] 인원 선택 단계
          <div className="w-full max-w-md flex flex-col items-center gap-10">
            <div className="text-center">
              <p className="text-xl font-bold">{t.howManyPeople}</p>
              <p className="text-sm text-gray-400 mt-1">{t.selectPartySize}</p>
            </div>
            <div className="flex items-center gap-8">
              <button
                type="button"
                onClick={() => setPartySize((v) => Math.max(1, v - 1))}
                disabled={partySize <= 1}
                aria-label="인원 줄이기"
                className="w-16 h-16 rounded-full bg-card text-white text-3xl font-bold flex items-center justify-center disabled:opacity-30"
              >
                −
              </button>
              <span className="text-7xl font-bold text-point w-28 text-center">{partySize}</span>
              <button
                type="button"
                onClick={() => setPartySize((v) => Math.min(maxPartySize ?? 10, v + 1))}
                disabled={maxPartySize != null && partySize >= maxPartySize}
                aria-label="인원 늘리기"
                className="w-16 h-16 rounded-full bg-card text-white text-3xl font-bold flex items-center justify-center disabled:opacity-30"
              >
                +
              </button>
            </div>
            {maxPartySize != null && (
              <p className="text-sm text-gray-500">{t.maxPartyNote(maxPartySize)}</p>
            )}
            <button
              type="button"
              onClick={() => setStep("contact")}
              className="w-full rounded-full py-4 text-lg font-bold bg-point text-gray-900"
            >
              {t.next}
            </button>
          </div>
        ) : (
        <div className="w-full max-w-md flex flex-col gap-6">
          {/* [수정] 전화번호/이메일 중 하나만 입력해도 등록할 수 있다는 걸 안내에 반영 */}
          <div className="text-left mb-2 flex items-center justify-between">
            <div>
              <p className="text-xl font-bold">{t.waitingRegisterTitle}</p>
              <p className="text-sm text-gray-400 mt-1">{t.waitingRegisterDesc}</p>
            </div>
            {/* [신규] 인원 선택 단계로 돌아가기 */}
            <button
              type="button"
              onClick={() => setStep("party")}
              className="flex-none text-sm text-gray-400 border border-gray-700 rounded-full px-3 py-1.5"
            >
              {t.changePartySize(partySize)}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t.emailLabel}</label>
            <EmailInput value={email} onChange={setEmail} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t.phoneLabel}</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              placeholder={t.phonePlaceholder}
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
                {t.privacyAgree}
              </label>
              {/* [신규] 개인정보처리방침 내용 */}
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
            {submitting ? t.submitting : t.submit}
          </button>
        </div>
        )}
      </section>

      {/* [신규] 전화번호로 등록 완료되면 뜨는 안내 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-8 z-50">
          <div className="bg-card rounded-2xl px-10 py-10 w-full max-w-md text-center animate-slide-up">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-point/20 flex items-center justify-center text-point text-3xl">
              ✓
            </div>
            <p className="text-2xl font-bold mb-2">{t.confirmTitle}</p>
            {teamNumber !== null && (
              <p className="text-lg text-gray-300 mb-1">
                {t.waitingNumberLabel} <span className="text-point font-bold">{teamNumber}</span>{t.numberSuffix}
              </p>
            )}
            <p className="text-sm text-gray-400 mb-6">{t.confirmDesc}</p>
            <button
              type="button"
              onClick={resetForm}
              className="w-full rounded-full py-3.5 text-base font-medium bg-point text-gray-900"
            >
              {t.confirmOk}
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
