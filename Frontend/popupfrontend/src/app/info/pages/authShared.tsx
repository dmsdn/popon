// 로그인(/login)·회원가입(/signup) 페이지 공용 모듈 (7/30 URL 분리 리뉴얼)
// 좌: 입력 폼 / 우: 안내 패널 2단 레이아웃. 색은 7/30 브랜드 팔레트.
// 두 페이지가 같은 색을 쓰도록 클래스 문자열을 여기 한곳에 모은다.
import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { getTerms, Terms } from "../../lib/api";

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
// 본문은 서버(/api/terms)에서 로드. 한 번 받아온 본문은 모듈 캐시로 재사용
// (모달이 닫히며 언마운트돼도 다시 안 불러오게).
let cachedTerms: Terms | null = null;

export function TermsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [terms, setTerms] = useState<Terms | null>(cachedTerms);
  const [error, setError] = useState("");

  if (open && !terms && !error) {
    getTerms()
      .then((t) => { cachedTerms = t; setTerms(t); })
      .catch((e) => setError(e instanceof Error ? e.message : "약관을 불러오지 못했습니다."));
  }
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-card text-foreground rounded-sm border border-border w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">{terms?.title ?? "이용약관 및 개인정보처리방침"}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" title="닫기">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto text-[13px] leading-relaxed whitespace-pre-wrap">
          {error ? (
            <span className="text-xs text-red-500">{error}</span>
          ) : terms ? (
            terms.content
          ) : (
            <span className="text-xs text-muted-foreground">
              <Loader2 size={13} className="inline animate-spin mr-1.5" /> 불러오는 중…
            </span>
          )}
        </div>
        {terms?.updatedAt && (
          <div className="px-5 py-2.5 border-t border-border text-[11px] text-muted-foreground">
            최종 개정: {terms.updatedAt.slice(0, 10)}
          </div>
        )}
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
