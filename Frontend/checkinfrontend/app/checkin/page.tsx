"use client";

// app/page.tsx
// 현장 웨이팅 등록 메인/유일 화면 - 태블릿 가로 레이아웃.
// 왼쪽: 로고 + 실시간 대기 팀 수(5초마다 갱신). 오른쪽: 이메일(아이디+도메인
// 드롭다운)/전화번호 입력 + 이용동의 체크 + 웨이팅하기 버튼.
// 제출 시 백엔드 POST /api/popups/{popupId}/waiting(비회원 등록)을 호출하고,
// 성공하면 동동 뜨는 애니메이션과 함께 확인 모달을 띄워요.

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { consumerReservationUrl, consumerWaitingUrl, consumerPopupUrl } from "@/lib/siteUrls";

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
  // [신규] 정확한 대기시간 계산에는 "대기 팀 수"가 아니라 "대기 인원 수"가
  // 필요해요(정원은 사람 수 기준이라). 각 대기 항목의 인원수를 더해서 써요.
  waitingList: { partySize: number }[];
}

// [신규] "외국어는 한중일영으로 하자"는 요청을 반영했어요 - 한국어/영어 두
// 언어였던 걸 중국어·일본어까지 더해 4개 언어로 늘렸어요. 이 화면은 손님이
// 직접 입력하는 셀프 등록 화면이라, 화면에 보이는 문구 전체를 4개 언어로
// 준비해두고 우측 상단 선택 메뉴로 바로 전환할 수 있게 했어요. 새 번역
// 라이브러리를 추가하는 대신 이 파일 안에 작은 사전 하나로 충분해서 이렇게 뒀어요.
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
  // [신규] 팀당 최대 인원(maxPartySizePerTeam)과는 다른 개념이에요 - capacity는
  // "동시에 공간에 들어갈 수 있는 전체 인원"이에요. 대기시간 계산엔 이게 필요해요.
  const [capacity, setCapacity] = useState<number | null>(null);
  // [신규 8/5] 팝업마다 사전예약/현장웨이팅 지원 여부가 달라요(queueMode) - 웨이팅만
  // 받는 팝업엔 애초에 "사전예약" 자체가 없어서, 그런 팝업에서 예약 QR을 보여주면
  // 손님이 스캔해도 열 수 없는 기능으로 안내하는 셈이 돼요. 소비자 앱(StickyActionBar)이
  // 이미 같은 필드로 예약 가능 여부를 판단하고 있어서 그 기준을 그대로 따라요.
  const [queueMode, setQueueMode] = useState<"PRERESERVATION_ONLY" | "ONSITE_WAITING_ONLY" | "BOTH" | null>(null);
  const [totalWaitingTeams, setTotalWaitingTeams] = useState<number | null>(null);
  const [totalWaitingPeople, setTotalWaitingPeople] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // [신규] 웨이팅 인원 - 예전엔 화면에 아예 없고 항상 1명으로 고정 전송하고
  // 있었어요. 연락처를 입력하기 전에 먼저 인원을 크게 고르는 단계를 추가했어요.
  const [partySize, setPartySize] = useState(1);
  const [step, setStep] = useState<"party" | "contact">("party");
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [teamNumber, setTeamNumber] = useState<number | null>(null);
  // [신규] 외국인 손님을 위한 언어 선택 (한국어/영어).
  const [lang, setLang] = useState<Lang>("ko");
  const t = TEXT[lang];

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
          // [수정] 소비자 앱이 실제로 쓰는 대기시간 공식(PopupWaitTimeService)을
          // 확인해보니, 단순히 "팀 수 × 체류시간"이 아니라 정원(capacity) 기준
          // 배치(batch) 회전 계산식이었어요:
          //   대기시간(분) = 체류시간 × (⌈대기인원/정원⌉ - 1) / 2
          // 팀 수가 아니라 "인원 수" 기준이고, 한 번에 여러 팀이 동시에 들어갈 수
          // 있다는 걸 반영해요. capacity도 같이 가져와서 이 공식을 그대로 써요.
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

  // [수정 8/5] 팝업의 queueMode(사전예약만/웨이팅만/둘 다)에 따라 QR이 가리키는
  // 화면과 문구를 3갈래로 나눠요. 예전엔 BOTH(둘 다 가능)인 팝업도 무조건
  // "사전예약" 문구+예약 화면으로만 보내서, 이 QR로 웨이팅도 할 수 있다는 걸
  // 손님이 알 방법이 없었어요.
  //  - PRERESERVATION_ONLY: 예약 화면(?action=reservation)
  //  - ONSITE_WAITING_ONLY: 앱 웨이팅 등록 화면(?action=waiting) - 이미 태블릿에서
  //    등록 가능한 손님에게 앱 사용을 홍보하는 용도
  //  - BOTH: 어느 한쪽을 강제로 열지 않고 팝업 상세페이지로 보내서 손님이 직접 골라요
  const isWaitingOnly = queueMode === "ONSITE_WAITING_ONLY";
  const isBoth = queueMode === "BOTH";
  const qrTargetUrl = isWaitingOnly
    ? consumerWaitingUrl(popupId)
    : isBoth
    ? consumerPopupUrl(popupId)
    : consumerReservationUrl(popupId);
  const qrTitle = isWaitingOnly ? t.appWaitingQrTitle : isBoth ? t.bothQrTitle : t.reservationQrTitle;
  const qrDesc = isWaitingOnly ? t.appWaitingQrDesc : isBoth ? t.bothQrDesc : t.reservationQrDesc;
  const reservationQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    qrTargetUrl
  )}`;

  return (
    <main className="h-full flex flex-col landscape:flex-row relative overflow-y-auto landscape:overflow-hidden scrollbar-hide">
      {/* [수정] 로고를 화면 최상단 좌측에 고정, 앱에서 쓰는 실제 SVG 파일로 교체.
          세로 모드에서는 현황 섹션과 겹치지 않도록 살짝 작고 위쪽에 맞춰요. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/LOGO_Dark.svg"
        alt="POP-ON"
        className="absolute top-4 left-4 w-16 h-auto z-10 landscape:top-6 landscape:left-6 landscape:w-24"
      />

      {/* [수정] 외국인 손님을 위한 언어 선택을 한/영 2개에서 한/중/일/영
          4개로 늘렸어요. */}
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

      {/* 왼쪽(가로)/위(세로): 현황 */}
      <section className="w-full landscape:w-[38%] landscape:h-full flex flex-col items-center gap-6 bg-card px-8 py-10 pt-16 landscape:py-8 landscape:pt-8 flex-none">
        {/* [수정] QR 블록을 하단에 고정하면서 justify-between을 쓰다 보니 위쪽
            내용(팝업 이름·대기 현황)이 화면 맨 위로 붙어버렸어요. 이 블록에
            flex-1 + justify-center를 줘서, QR 블록 위 남은 공간 안에서 다시
            세로 가운데로 오도록 했어요. */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6">
          {/* [수정] 팝업 이름 한 단계 굵게 (font-normal → font-semibold) */}
          {popupTitle && <p className="text-xl font-semibold text-gray-100 text-center">{popupTitle}</p>}

          <div className="flex flex-col items-center gap-1 mt-4">
            <span className="text-sm text-gray-400">{t.currentWaitingTeams}</span>
            {/* [수정] 굵기를 extrabold(800)에서 중간 정도(semibold, 600)로,
                크기는 더 키우고, "팀"을 아래 대신 숫자 옆에 붙였어요. */}
            <span className="flex items-baseline gap-2">
              <span className="text-7xl landscape:text-8xl font-semibold text-point">
                {totalWaitingTeams === null ? "-" : totalWaitingTeams}
              </span>
              <span className="text-xl text-gray-400">{t.teamUnit}</span>
            </span>
          </div>

          {/* [수정] 실제 백엔드 공식(정원 기준 배치 회전)으로 계산해요:
              대기시간(분) = 체류시간 × (⌈대기인원/정원⌉ - 1) / 2
              정원(capacity) 정보가 없는 팝업은 정확한 계산이 안 돼서 안 보여줘요. */}
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

        {/* [수정 8/5] 예약/웨이팅 QR - 아직 등록 안 한 손님이 자기 휴대폰으로
            스캔하면 소비자 앱으로 바로 연결돼요. 설명은 QR 오른쪽에 둬요.
            (입장 QR 스캔은 /checkin/scan 화면으로 분리했어요.)
            사전예약 가능한 팝업은 예약 화면(?action=reservation)으로, 웨이팅만
            받는 팝업(queueMode === "ONSITE_WAITING_ONLY")은 이 QR을 숨기는 대신
            앱 웨이팅 등록 화면(?action=waiting)으로 보내고 문구도 "앱으로도
            웨이팅할 수 있어요"로 바꿔요 - 이미 태블릿에서 등록할 수 있는
            손님에게 앱 사용을 자연스럽게 홍보하는 용도예요.
            queueMode를 아직 못 받아왔거나(null) 사전예약/웨이팅 둘 다 지원 안
            하는 팝업이면 보여줄 화면이 없으니 QR 자체를 숨겨요. */}
        {queueMode && (
          <div className="w-full flex items-center gap-4 bg-[#17181a] rounded-xl px-4 py-4 flex-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={reservationQrSrc} alt="" width={90} height={90} className="rounded-md flex-none bg-white" />
            <div className="text-left min-w-0">
              <p className="text-sm font-semibold text-white">{qrTitle}</p>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">{qrDesc}</p>
            </div>
          </div>
        )}
      </section>

      {/* 오른쪽(가로)/아래(세로): 등록 폼 */}
      <section className="flex-1 w-full landscape:h-full flex flex-col items-center justify-center px-8 landscape:px-12 py-10 landscape:py-0 gap-6">
        {step === "party" ? (
          // [신규] 인원 선택 단계 - 크게, 손가락으로 누르기 쉽게. 이걸 먼저
          // 고르고 나서 연락처 입력 단계로 넘어가요.
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
          {/* [수정] 가운데 정렬이던 걸 좌측 정렬로, 전화번호/이메일 중 하나만
              입력해도 등록할 수 있다는 걸 안내에 반영했어요. */}
          <div className="text-left mb-2 flex items-center justify-between">
            <div>
              <p className="text-xl font-bold">{t.waitingRegisterTitle}</p>
              <p className="text-sm text-gray-400 mt-1">{t.waitingRegisterDesc}</p>
            </div>
            {/* [신규] 인원 선택 단계로 돌아가서 다시 고를 수 있게 */}
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
