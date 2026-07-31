import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, UserPlus, CheckCircle2, Info } from "lucide-react";
import { getPopup, registerWaiting, Popup, WaitingItem } from "../lib/api";

// 비회원 현장 웨이팅 접수 폼 — 주최자센터 [대기열·인원 관제] 하단의 QR로 진입하는 공개 페이지.
// 백엔드 실연동: POST /api/popups/{id}/waiting (permitAll) — 등록 즉시 당일 대기번호·입장 QR 발급,
// 입장 QR은 이메일·문자로도 발송(백엔드 메일 발신 계정 설정 시).

export default function WalkinPage() {
  const [searchParams] = useSearchParams();
  const popupId = Number(searchParams.get("popup"));

  const [popup, setPopup] = useState<Popup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", partySize: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<WaitingItem | null>(null);

  useEffect(() => {
    if (!popupId) {
      setError("잘못된 접근입니다. 현장에 비치된 QR코드로 다시 접속해 주세요.");
      setLoading(false);
      return;
    }
    getPopup(popupId)
      .then(setPopup)
      .catch(() => setError("팝업 정보를 불러오지 못했습니다. 현장 직원에게 문의해 주세요."))
      .finally(() => setLoading(false));
  }, [popupId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const entry = await registerWaiting(popupId, {
        name: form.name.trim(),
        email: form.email.trim(),
        phoneNumber: form.phone.trim(),
        partySize: form.partySize,
      });
      setDone(entry);
    } catch (err) {
      alert(err instanceof Error ? err.message : "웨이팅 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 7/30 — 현장 QR 접수 폼도 작업 화면 계열이라 라이트 서피스로 (theme-light)
  return (
    <div className="theme-light min-h-screen bg-background text-foreground flex items-center justify-center p-4" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <div className="w-full max-w-md bg-card border border-border rounded-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-sm bg-accent flex items-center justify-center">
            <span className="text-accent-foreground text-xs font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>PO</span>
          </div>
          <span className="font-semibold text-sm">팝업온 현장 웨이팅</span>
        </div>

        {loading && (
          <div className="py-14 text-center text-xs text-muted-foreground">
            <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
          </div>
        )}
        {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

        {!loading && !error && popup && !done && (
          <>
            <h1 className="text-lg font-semibold mt-3">{popup.title}</h1>
            <p className="text-xs text-muted-foreground mt-1 mb-5">
              비회원 웨이팅 접수 — 아래 정보를 입력하면 현장 대기열에 순서대로 등록됩니다.
            </p>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium">이름 *</span>
                <input
                  required value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="px-3 py-2.5 text-[13px] border border-border rounded-sm focus:outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium">전화번호 *</span>
                <input
                  required type="tel" value={form.phone} placeholder="010-0000-0000"
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="px-3 py-2.5 text-[13px] border border-border rounded-sm focus:outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium">이메일 *</span>
                <input
                  required type="email" value={form.email} placeholder="you@example.com"
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="px-3 py-2.5 text-[13px] border border-border rounded-sm focus:outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium">인원</span>
                <input
                  type="number" min={1} max={10} value={form.partySize}
                  onChange={(e) => setForm((p) => ({ ...p, partySize: Number(e.target.value) }))}
                  className="w-24 px-3 py-2.5 text-[13px] border border-border rounded-sm focus:outline-none focus:border-accent"
                />
              </label>
              <button
                type="submit" disabled={submitting}
                className="mt-2 flex items-center justify-center gap-1.5 text-sm px-4 py-3 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} 웨이팅 접수하기
              </button>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                입력한 연락처는 입장 안내에만 사용됩니다. 플랫폼 회원이라면 소비자 앱에서 로그인 후 웨이팅하면 예약 이력이 함께 관리됩니다.
              </p>
            </form>
          </>
        )}

        {done && popup && (
          <div className="mt-3 flex flex-col items-center text-center">
            <CheckCircle2 size={36} className="text-emerald-500 mb-2" />
            <h1 className="text-lg font-semibold">웨이팅 접수 완료</h1>
            <div className="mt-2 mb-1 text-3xl font-bold text-accent" style={{ fontFamily: "'DM Mono', monospace" }}>
              #{done.teamNumber}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {popup.title} · {done.name}님 {done.partySize}명
              <br />앞 대기 {done.teamsAhead}팀 · 차례가 되면 아래 입장 QR을 현장 직원에게 보여주세요.
            </p>
            <div className="border border-border rounded-sm p-4 bg-card">
              <QRCodeSVG value={done.qrToken} size={160} />
            </div>
            <div className="mt-4 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-sm px-3 py-2.5 text-left">
              <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-800 leading-relaxed">
                입장 QR은 입력하신 이메일·전화번호로도 발송됩니다.
                <br />(발송은 백엔드 메일·SMS 발신 계정 설정 시 동작 — 미설정이면 이 화면에서 확인)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
