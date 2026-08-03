// 로그인(/login)·회원가입(/signup) 페이지 공용 모듈 (7/30 URL 분리 리뉴얼)
// 좌: 입력 폼 / 우: 안내 패널 2단 레이아웃. 색은 7/30 브랜드 팔레트.
// 두 페이지가 같은 색을 쓰도록 클래스 문자열을 여기 한곳에 모은다.
import { X } from "lucide-react";

// ── 브랜드 팔레트 (theme.css 토큰) ──
// 배경 #101010(background) · 면 #17181A(card) · 입력 #1E2124(input-background)
// 포인트 #8ADE1B(accent) — 라임 위 글자는 accent-foreground(#101010)로 둔다.
export const pageBg =
  "min-h-[calc(100vh-4rem)] bg-background text-foreground";
export const panelCls = "rounded-md bg-card border border-border shadow-xl shadow-black/50";
export const labelCls = "text-[11px] font-semibold tracking-widest text-accent";
export const inputDark =
  "w-full px-3 py-3 text-sm rounded-sm bg-input-background text-foreground border border-border focus:outline-none focus:border-accent placeholder:text-muted-foreground/70 transition-colors";
export const inputDarkSm =
  "w-full px-3 py-2.5 text-sm rounded-sm bg-input-background text-foreground border border-border focus:outline-none focus:border-accent placeholder:text-muted-foreground/70 transition-colors";
export const primaryBtn =
  "bg-accent text-accent-foreground text-sm font-bold rounded-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:hover:brightness-100";
export const mutedText = "text-muted-foreground";
export const errorBox =
  "px-4 py-3 rounded-sm bg-destructive/15 border border-destructive/40 text-sm text-destructive";

// ── 입력 형식 헬퍼 (기존 Login.tsx에서 이동 — 로직 무변경) ──
export const formatBizNo = (v: string) => {
  const d = v.replace(/[^0-9]/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
};

// 연락처 자동 하이픈 (표시용 — 전송 시에는 숫자만 추출)
export const formatPhone = (v: string) => {
  const d = v.replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};

// ── 약관·개인정보처리방침 모달 ──
// 8/3 — 서버(/api/terms) 로드 → 프론트 내장 본문으로 전환.
// 관리자 콘솔의 「약관 관리」 페이지를 없애면서(팀 결정) 약관의 원본이 사라졌으므로,
// 본문을 여기서 직접 관리한다. 고칠 일이 생기면 이 상수만 수정하면 된다.
const TERMS_TITLE = "이용약관 및 개인정보처리방침";
const TERMS_UPDATED = "2026-08-03";
const TERMS_CONTENT = `제1조 (목적)
본 약관은 팝온(POP-ON, 이하 "플랫폼")이 제공하는 팝업스토어 정보 제공·예약·현장 대기 서비스의 이용 조건과 절차, 플랫폼과 회원의 권리·의무를 정함을 목적으로 합니다.

제2조 (정의)
1. "소비자 회원"이란 팝업스토어를 탐색·예약·방문하기 위해 가입한 자를 말합니다.
2. "주최자 회원"이란 팝업스토어를 등록·운영하기 위해 사업자 정보를 제출하고 가입한 자를 말합니다.
3. "팝업"이란 주최자 회원이 플랫폼에 등록하고 운영진 심사를 통과해 게시된 행사를 말합니다.

제3조 (약관의 효력과 변경)
1. 본 약관은 회원가입 화면에 게시함으로써 효력이 발생합니다.
2. 플랫폼은 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일 7일 전부터 공지합니다.

제4조 (서비스의 내용)
1. 팝업 정보 탐색·검색, 사전예약, 현장 웨이팅 등록, 입장 QR 발급
2. 주최자 회원 대상 팝업 등록·심사, 예약·대기열 관리, 방문 통계 제공
3. 플랫폼은 예약·대기 관리 도구를 제공할 뿐, 현장 운영(입장 순서 조정 등)의 책임은 주최자 회원에게 있습니다.

제5조 (회원의 의무)
1. 회원은 가입 시 정확한 정보를 제공해야 하며, 타인의 정보를 도용해서는 안 됩니다.
2. 주최자 회원은 등록한 팝업 정보(운영 기간·장소·내용)가 사실과 다르지 않도록 유지해야 합니다.
3. 예약 후 방문이 어려운 경우 사전에 취소해야 하며, 반복적인 노쇼는 서비스 이용이 제한될 수 있습니다.

제6조 (개인정보의 수집·이용)
1. 수집 항목: [소비자] 이름, 이메일, 연락처(선택) / [주최자] 상호, 사업자등록번호, 담당자 이름, 이메일, 연락처
2. 이용 목적: 회원 식별, 예약·대기 확인 및 안내(QR 발급 포함), 문의 응대, 서비스 개선 통계
3. 보유 기간: 회원 탈퇴 시까지. 단, 관련 법령이 정한 경우 해당 기간 동안 보관합니다.
4. 회원의 개인정보는 본인의 동의 없이 제3자에게 제공하지 않습니다. 단, 예약·대기 확인을 위해 마스킹된 이름과 인원 정보가 해당 팝업 주최자에게 표시됩니다.

제7조 (서비스의 중단)
플랫폼은 설비 점검·장애 등 부득이한 사유가 있는 경우 서비스 제공을 일시 중단할 수 있으며, 이 경우 사전 또는 사후에 공지합니다.

제8조 (책임의 한계)
1. 플랫폼은 주최자 회원이 등록한 정보의 정확성에 대해 심사 절차를 거치나, 현장 운영 상황(대기 시간, 품절 등)까지 보증하지 않습니다.
2. 천재지변, 통신 장애 등 불가항력으로 인한 손해에 대해 플랫폼은 책임을 지지 않습니다.

제9조 (분쟁 해결)
서비스 이용과 관련해 분쟁이 발생한 경우 양 당사자는 성실히 협의하며, 협의가 이루어지지 않을 경우 관할 법원은 민사소송법에 따릅니다.

부칙
본 약관은 2026년 8월 3일부터 시행합니다.`;

export function TermsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-card text-foreground rounded-sm border border-border w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">{TERMS_TITLE}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" title="닫기">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto text-[13px] leading-relaxed whitespace-pre-wrap">
          {TERMS_CONTENT}
        </div>
        <div className="px-5 py-2.5 border-t border-border text-[11px] text-muted-foreground">
          최종 개정: {TERMS_UPDATED}
        </div>
      </div>
    </div>
  );
}

// ── 하단 신뢰 배지 (기존 유지) ──
export function TrustBadges() {
  return (
    <div className="mt-8 pt-6 border-t border-border flex justify-center gap-6">
      {["SSL 암호화", "개인정보 보호", "스팸 없음"].map((item) => (
        <div key={item} className={`flex items-center gap-1.5 text-xs ${mutedText}`}>
          <span className="w-1 h-1 rounded-full bg-accent" />
          {item}
        </div>
      ))}
    </div>
  );
}
